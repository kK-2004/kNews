'use strict';

class FeedRepository {
  /**
   * @param {import('../cache/local-cache-repository')} localCache
   */
  constructor(localCache) {
    this.localCache = localCache;
  }

  /**
   * Find full cache entry by source ID.
   * @param {string} sourceId
   * @returns {Promise<Object|null>}
   */
  async findBySourceId(sourceId) {
    return this.localCache.read(sourceId);
  }

  /**
   * Find cached feed data items for a source.
   * @param {string} sourceId
   * @returns {Promise<any[]|null>}
   */
  async findCached(sourceId) {
    const entry = this.localCache.read(sourceId);
    return entry ? entry.data : null;
  }

  /**
   * Save feed data to local cache.
   * @param {string} sourceId
   * @param {any[]} data - Feed items to cache.
   * @returns {Promise<Object>}
   */
  async saveCache(sourceId, data) {
    this.localCache.write(sourceId, data);
    return { sourceId, data };
  }

  /**
   * Delete cached data for a source.
   * @param {string} sourceId
   */
  async deleteCache(sourceId) {
    this.localCache.remove(sourceId);
  }
}

module.exports = FeedRepository;
