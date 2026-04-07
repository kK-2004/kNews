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
   * @param {Array<object>}  [options.sources]          - Source definitions
   * @param {object}         options.feedRepository     - FeedRepository instance
   * @param {object}         [options.sourceRepository] - SourceRepository instance (DB) for enabled status
   * @param {object}         [options.localCache]       - LocalCacheRepository instance
   * @param {number}         [options.interval]         - Refresh interval in ms (default 3600000)
   * @param {number}         [options.concurrency]      - Max parallel fetches (default 5)
   */
  constructor(options = {}) {
    const {
      sources = defaultSources,
      feedRepository,
      sourceRepository,
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
    this.sourceRepository = sourceRepository;
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
   * Also cleans local cache for sources disabled in DB.
   * @param {{ force?: boolean }} [options] - force=true skips cache staleness check (for manual refresh)
   */
  async refreshAll({ force = false } = {}) {
    // Build enabled set from DB (fall back to local defs if no sourceRepository)
    let dbSourceMap = null;
    if (this.sourceRepository) {
      try {
        const dbSources = await this.sourceRepository.findAll();
        dbSourceMap = new Map(dbSources.map((s) => [s.id, s.enabled]));
      } catch (err) {
        console.error(`[ScraperEngine] Failed to query source status: ${err.message}`);
      }
    }

    const enabledSources = [];
    const disabledSourceIds = [];

    for (const source of this.sources.values()) {
      // DB status takes precedence; fall back to local enabled field
      const isEnabled = dbSourceMap ? dbSourceMap.get(source.id) !== false : source.enabled !== false;
      if (isEnabled) {
        enabledSources.push(source);
      } else {
        disabledSourceIds.push(source.id);
      }
    }

    // Clean cache for disabled sources
    for (const sourceId of disabledSourceIds) {
      const cached = this.localCache && this.localCache.read(sourceId);
      if (cached) {
        await this.feedRepository.deleteCache(sourceId);
        console.log(`[ScraperEngine] Cleaned cache for disabled source: ${sourceId}`);
      }
    }

    console.log(
      `[ScraperEngine] Refreshing ${enabledSources.length}/${this.sources.size} sources`,
    );

    const limit = pLimit(this.concurrency);
    const tasks = enabledSources.map((source) =>
      limit(() => this.refreshOne(source.id, { force })),
    );

    await Promise.allSettled(tasks);
  }

  /**
   * Refresh a single source by ID and save to local cache.
   * Skips fetch if cache is fresh (< staleMs). Set force=true to override
   * (used by "一键刷新" button via IPC scraper:refreshOne).
   */
  async refreshOne(sourceId, { force = false, staleMs = 3600000 } = {}) {
    const source = this.sources.get(sourceId);

    if (!source) {
      console.error(`[ScraperEngine] Unknown source: ${sourceId}`);
      return { sourceId, count: 0, error: `Unknown source: ${sourceId}` };
    }

    // Check DB enabled status
    if (this.sourceRepository) {
      try {
        const dbSource = await this.sourceRepository.findById(sourceId);
        if (dbSource && dbSource.enabled === false) {
          const cached = this.localCache && this.localCache.read(sourceId);
          if (cached) {
            await this.feedRepository.deleteCache(sourceId);
            console.log(`[ScraperEngine] Cleaned cache for disabled source: ${sourceId}`);
          }
          return { sourceId, count: 0, error: null, disabled: true };
        }
      } catch (err) {
        console.error(`[ScraperEngine] Failed to check source status: ${err.message}`);
      }
    }

    // Skip if cache is fresh (unless force=true from manual refresh button)
    if (!force && this.localCache && !this.localCache.isStale(sourceId, staleMs)) {
      const cached = this.localCache.read(sourceId);
      return { sourceId, count: cached?.data?.length || 0, error: null, skipped: true };
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
