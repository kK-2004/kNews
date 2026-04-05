'use strict';

/**
 * MCP tool definitions.
 *
 * Each tool has:
 *   - name       – unique string identifier
 *   - description – human-readable summary
 *   - handler     – async (args, { sourceService, feedService }) => result
 *
 * The handler receives the parsed `args` from the client request and a context
 * object that carries the injected service instances.
 */

/**
 * Tool: get_available_sources
 * Returns a list of all enabled news sources (id, name, category).
 */
const getAvailableSources = {
  name: 'get_available_sources',
  description:
    'Returns a list of all available news sources with their id, name, and category.',
  handler: async function (_args, ctx) {
    const sources = await ctx.sourceService.getSources();

    return sources.map((s) => ({
      id: s.id,
      name: s.name,
      category: s.category || null,
    }));
  },
};

/**
 * Tool: get_hotest_latest_news
 * Returns cached news items for a given source.
 *
 * Args:
 *   source_id?  string  – specific source to fetch (omit for all)
 *   limit?      number  – max items to return (default 20, max 50)
 */
const getHotestLatestNews = {
  name: 'get_hotest_latest_news',
  description:
    'Fetch hottest/latest news items from cache. Optionally filter by source_id and limit the number of results.',
  handler: async function (args, ctx) {
    const sourceId = args.source_id || null;
    const rawLimit = Number(args.limit) || 20;
    const limit = Math.min(Math.max(1, rawLimit), 50);

    let items = [];

    if (sourceId) {
      // Fetch a single source
      const data = await ctx.feedService.getFeedsBySource(sourceId);
      if (Array.isArray(data)) {
        items = data;
      }
    } else {
      // Fetch all sources and flatten
      const feeds = await ctx.feedService.getFeeds();
      for (const feed of feeds) {
        if (Array.isArray(feed.data)) {
          items = items.concat(feed.data);
        }
      }
    }

    // Apply limit
    items = items.slice(0, limit);

    // Normalise output to { title, url, date?, source_id? }
    return items.map((item) => ({
      title: item.title || 'Untitled',
      url: item.url || '',
      date: item.date || null,
      source_id: item.source || sourceId || null,
    }));
  },
};

/**
 * Exported tool list.  The McpServer iterates over this to register routes.
 */
const tools = [getAvailableSources, getHotestLatestNews];

module.exports = tools;
