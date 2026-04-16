'use strict';

class FeedService {
  /**
   * @param {import('../source/source-repository')} sourceRepository
   * @param {import('./feed-repository')} feedRepository
   * @param {import('../scraper/scraper-engine')} [scraperEngine]
   */
  constructor(sourceRepository, feedRepository, scraperEngine) {
    this.sourceRepository = sourceRepository;
    this.feedRepository = feedRepository;
    this.scraperEngine = scraperEngine;
  }

  /**
   * Get all cached feeds.
   * @returns {Promise<Object[]>} Array of { source, data } objects.
   */
  async getFeeds() {
    const sources = await this.sourceRepository.findAll(true);

    const feeds = await Promise.all(
      sources.map(async (source) => {
        let data = await this.feedRepository.findCached(source.id);
        if (!data && this.scraperEngine) {
          await this.scraperEngine.refreshOne(source.id);
          data = await this.feedRepository.findCached(source.id);
        }
        return { source, data };
      }),
    );

    return feeds;
  }

  /**
   * Get cached feed data for a specific source.
   * If cache is empty, triggers a scrape for that source.
   * @param {string} sourceId
   * @returns {Promise<any[]|null>}
   */
  async getFeedsBySource(sourceId) {
    const source = await this.sourceRepository.findById(sourceId);
    if (!source || source.enabled === false) {
      return null;
    }
    let data = await this.feedRepository.findCached(sourceId);
    if (!data && this.scraperEngine) {
      const refreshResult = await this.scraperEngine.refreshOne(sourceId);
      if (refreshResult?.disabled) {
        return null;
      }
      data = await this.feedRepository.findCached(sourceId);
    }
    return data;
  }

  /**
   * Get cached feed data for multiple sources in one call.
   * Returns { [sourceId]: items[] } without triggering scrapes.
   * @param {string[]} sourceIds
   * @returns {Promise<Object<string, any[]>>}
   */
  async getCachedBatch(sourceIds) {
    const result = {};
    for (const id of sourceIds) {
      const source = await this.sourceRepository.findById(id);
      if (!source || source.enabled === false) {
        result[id] = [];
        continue;
      }
      const data = await this.feedRepository.findCached(id);
      result[id] = data || [];
    }
    return result;
  }
}

module.exports = FeedService;
