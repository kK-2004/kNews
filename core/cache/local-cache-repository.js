'use strict';

const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');

/**
 * Local filesystem cache for scraped feed data.
 *
 * Stores each source as a separate JSON file under ~/.knews/cache/.
 * Uses atomic writes (write temp → rename) to prevent partial reads.
 */
class LocalCacheRepository {
  /**
   * @param {Object} [opts]
   * @param {string} [opts.cacheDir] - Override default cache directory
   */
  constructor(opts = {}) {
    this.cacheDir = opts.cacheDir || path.join(os.homedir(), '.knews', 'cache');
  }

  /**
   * Ensure cache directory exists.
   */
  _ensureDir() {
    if (!fs.existsSync(this.cacheDir)) {
      fs.mkdirSync(this.cacheDir, { recursive: true });
    }
  }

  /**
   * Get file path for a source.
   * @param {string} sourceId
   * @returns {string}
   */
  _filePath(sourceId) {
    return path.join(this.cacheDir, `${encodeURIComponent(String(sourceId || ''))}.json`);
  }

  /**
   * Read cached data for a source.
   * @param {string} sourceId
   * @returns {{ sourceId: string, data: any[], fetchedAt: number } | null}
   */
  read(sourceId) {
    const filePath = this._filePath(sourceId);
    try {
      const raw = fs.readFileSync(filePath, 'utf-8');
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }

  /**
   * Write cached data for a source (atomic).
   * @param {string} sourceId
   * @param {any[]} items
   * @param {number} [fetchedAt]
   */
  write(sourceId, items, fetchedAt) {
    this._ensureDir();
    const filePath = this._filePath(sourceId);
    const tmpPath = filePath + '.tmp';

    const payload = JSON.stringify({
      sourceId,
      data: items,
      fetchedAt: fetchedAt || Date.now(),
    });

    fs.writeFileSync(tmpPath, payload, 'utf-8');
    fs.renameSync(tmpPath, filePath);
  }

  /**
   * Check if cached data is stale.
   * @param {string} sourceId
   * @param {number} [staleMs=3600000] - 1 hour default
   * @returns {boolean}
   */
  isStale(sourceId, staleMs = 3600000) {
    const entry = this.read(sourceId);
    if (!entry || !entry.fetchedAt) return true;
    return Date.now() - entry.fetchedAt > staleMs;
  }

  /**
   * Read all cached entries.
   * @returns {Map<string, { sourceId: string, data: any[], fetchedAt: number }>}
   */
  readAll() {
    const map = new Map();
    try {
      this._ensureDir();
      const files = fs.readdirSync(this.cacheDir);
      for (const file of files) {
        if (!file.endsWith('.json')) continue;
        try {
          const raw = fs.readFileSync(path.join(this.cacheDir, file), 'utf-8');
          const entry = JSON.parse(raw);
          if (entry.sourceId) {
            map.set(entry.sourceId, entry);
          }
        } catch {
          // skip corrupted files
        }
      }
    } catch {
      // directory may not exist yet
    }
    return map;
  }

  /**
   * Remove cached data for a source.
   * @param {string} sourceId
   */
  remove(sourceId) {
    try {
      fs.unlinkSync(this._filePath(sourceId));
    } catch {
      // ignore
    }
  }

  /**
   * Remove all cached data.
   */
  clear() {
    try {
      const files = fs.readdirSync(this.cacheDir);
      for (const file of files) {
        if (file.endsWith('.json')) {
          fs.unlinkSync(path.join(this.cacheDir, file));
        }
      }
    } catch {
      // ignore
    }
  }
}

module.exports = LocalCacheRepository;
