'use strict';

const { default: pLimit } = require('p-limit');
const SourceFetcher = require('./source-fetcher');
const { sources: defaultSources } = require('./sources');

const DEFAULT_INTERVAL = 3600000; // 1 hour
const DEFAULT_CONCURRENCY = 5;

/**
 * ScraperEngine - orchestrates periodic fetching of news sources.
 *
 * Scheduling is aligned to the top of each hour (:00, :01, :02...).
 * On app start, only scrapes if local cache is empty or stale (>1h).
 */
class ScraperEngine {
  /**
   * @param {object} options
   * @param {Array<object>}  [options.sources]        - Source definitions
   * @param {object}         options.feedRepository   - FeedRepository instance
   * @param {object}         [options.localCache]     - LocalCacheRepository instance
   * @param {number}         [options.interval]       - Refresh interval in ms (default 3600000)
   * @param {number}         [options.concurrency]    - Max parallel fetches (default 5)
   */
  constructor(options = {}) {
    const {
      sources = defaultSources,
      feedRepository,
      localCache,
      interval = DEFAULT_INTERVAL,
      concurrency = DEFAULT_CONCURRENCY,
      fetcher,
    } = options;

    if (!feedRepository) {
      throw new Error('ScraperEngine requires a feedRepository');
    }

    this.sources = new Map();
    for (const source of sources) {
      this.sources.set(source.id, source);
    }

    this.feedRepository = feedRepository;
    this.localCache = localCache;
    this.interval = interval;
    this.concurrency = concurrency;
    this.fetcher = fetcher || new SourceFetcher();

    this._timer = null;
    this._initialTimer = null;
    this._running = false;
  }

  // ---------------------------------------------------------------------------
  // Lifecycle
  // ---------------------------------------------------------------------------

  /**
   * Schedule periodic refresh aligned to the top of each hour.
   * @param {object} [options]
   * @param {boolean} [options.forceInitialScrape=false] - Force immediate scrape regardless of cache
   */
  schedule({ forceInitialScrape = false } = {}) {
    if (this._running) return;

    this._running = true;
    console.log(
      `[ScraperEngine] Scheduled (interval=${this.interval}ms, sources=${this.sources.size})`,
    );

    if (forceInitialScrape) {
      this.refreshAll();
      this._startAlignedInterval();
    } else {
      // Compute ms until next aligned boundary
      const now = Date.now();
      const delay = Math.ceil(now / this.interval) * this.interval - now;

      if (delay < 1000) {
        // Very close to the next boundary, just start now
        this.refreshAll();
        this._startAlignedInterval();
      } else {
        console.log(`[ScraperEngine] First scrape in ${Math.round(delay / 1000)}s`);
        this._initialTimer = setTimeout(() => {
          this.refreshAll();
          this._startAlignedInterval();
          this._initialTimer = null;
        }, delay);
        // Don't let the timer prevent process exit
        if (this._initialTimer.unref) this._initialTimer.unref();
      }
    }
  }

  /**
   * Legacy start() - forces immediate scrape (backward compat).
   */
  start() {
    this.schedule({ forceInitialScrape: true });
  }

  /**
   * Start the repeating interval after the first aligned tick.
   */
  _startAlignedInterval() {
    this._timer = setInterval(() => {
      this.refreshAll();
    }, this.interval);
  }

  /**
   * Stop the periodic refresh cycle.
   */
  stop() {
    if (this._initialTimer) {
      clearTimeout(this._initialTimer);
      this._initialTimer = null;
    }
    if (this._timer) {
      clearInterval(this._timer);
      this._timer = null;
    }
    this._running = false;
    console.log('[ScraperEngine] Stopped');
  }

  /**
   * Check if any source has missing or stale local cache.
   * @param {number} [staleMs=3600000]
   * @returns {boolean}
   */
  shouldInitialScrape(staleMs = 3600000) {
    if (!this.localCache) return true;
    for (const [id] of this.sources) {
      if (this.localCache.isStale(id, staleMs)) return true;
    }
    return false;
  }

  // ---------------------------------------------------------------------------
  // Refresh operations
  // ---------------------------------------------------------------------------

  /**
   * Refresh all enabled sources with concurrency control.
   */
  async refreshAll() {
    const enabledSources = [...this.sources.values()].filter(
      (s) => s.enabled !== false,
    );

    console.log(
      `[ScraperEngine] Refreshing ${enabledSources.length}/${this.sources.size} sources`,
    );

    const limit = pLimit(this.concurrency);
    const tasks = enabledSources.map((source) =>
      limit(() => this.refreshOne(source.id)),
    );

    await Promise.allSettled(tasks);
  }

  /**
   * Refresh a single source by ID and save to local cache.
   */
  async refreshOne(sourceId) {
    const source = this.sources.get(sourceId);

    if (!source) {
      console.error(`[ScraperEngine] Unknown source: ${sourceId}`);
      return { sourceId, count: 0, error: `Unknown source: ${sourceId}` };
    }

    try {
      const items = await this.fetcher.fetch(source);

      await this.feedRepository.saveCache(sourceId, items);

      console.log(
        `[ScraperEngine] Refreshed ${sourceId}: ${items.length} items`,
      );

      return { sourceId, count: items.length, error: null };
    } catch (err) {
      console.error(
        `[ScraperEngine] Failed ${sourceId}: ${err.message}`,
      );
      return { sourceId, count: 0, error: err.message };
    }
  }

  // ---------------------------------------------------------------------------
  // Source management
  // ---------------------------------------------------------------------------

  getSource(sourceId) {
    return this.sources.get(sourceId);
  }

  getAllSources() {
    return [...this.sources.values()];
  }

  isRunning() {
    return this._running;
  }
}

module.exports = ScraperEngine;
