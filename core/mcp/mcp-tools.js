'use strict';

const { McpServer } = require('@modelcontextprotocol/sdk/server/mcp.js');
const { z } = require('zod');

function parseApiKeySourceIds(apiKey) {
  if (!apiKey) return [];
  const value = apiKey.source_scope;
  if (Array.isArray(value)) {
    return value.map((item) => String(item || '')).filter(Boolean);
  }
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value || '[]');
      if (Array.isArray(parsed)) {
        return parsed.map((item) => String(item || '')).filter(Boolean);
      }
    } catch (_err) {
      return [];
    }
  }
  return [];
}

function clampMaxCount(value, fallback = 12) {
  return Math.min(30, Math.max(1, Number(value) || fallback));
}

function buildTopicId(sourceId, index, title, url) {
  return `${sourceId || 'unknown'}:${index}:${String(title || '').trim()}:${String(url || '').trim()}`;
}

function createMcpSdkServer({ sourceService, feedService, apiKey }) {
  const server = new McpServer(
    {
      name: 'kNews',
      version: '0.1.0',
    },
    { capabilities: { logging: {} } },
  );

  server.tool(
    'get_available_sources',
    'Return source ids allowed for current API key and max_count limit.',
    {},
    async () => {
      const sources = await sourceService.getSources();
      const allowedSourceIds = parseApiKeySourceIds(apiKey);
      const allowedSet = allowedSourceIds.length ? new Set(allowedSourceIds) : null;
      const filteredSources = allowedSet
        ? sources.filter((item) => allowedSet.has(item.id))
        : sources;
      const maxCount = clampMaxCount(apiKey?.max_count, 12);
      const lines = filteredSources.map((item) => `${item.id}: ${item.name}`);

      return {
        structuredContent: {
          maxCount,
          sources: filteredSources.map((item) => ({
            id: item.id,
            name: item.name,
          })),
        },
        content: [
          {
            type: 'text',
            text: lines.length
              ? `Available sources (max_count=${maxCount}):\n${lines.join('\n')}`
              : `No available sources. max_count=${maxCount}`,
          },
        ],
      };
    },
  );

  server.tool(
    'get_hotest_latest_news',
    'Fetch hottest/latest news for a source id returned by get_available_sources.',
    {
      id: z.string().describe('source id, e.g. weibo / github / toutiao'),
      count: z.any().default(10).describe('requested item count, capped by API key max_count'),
    },
    async ({ id, count }) => {
      const allowedSourceIds = parseApiKeySourceIds(apiKey);
      if (allowedSourceIds.length && !allowedSourceIds.includes(id)) {
        return {
          content: [{ type: 'text', text: `Source is not allowed by current API key: ${id}` }],
        };
      }

      const requestedLimit = clampMaxCount(count, 10);
      const keyMaxCount = clampMaxCount(apiKey?.max_count, 12);
      const limit = Math.min(requestedLimit, keyMaxCount);
      const data = await feedService.getFeedsBySource(id);
      const sources = await sourceService.getSources();
      const sourceName = sources.find((item) => item.id === id)?.name || id;
      const items = (Array.isArray(data) ? data : [])
        .map((item, index) => ({
          id: buildTopicId(id, index, item.title, item.url),
          title: item.title || 'Untitled',
          url: item.url || '',
          publishedAt: item.date || '',
          sourceId: item.source || id,
          sourceName,
        }))
        .filter((item) => item.url)
        .slice(0, limit);

      if (!items.length) {
        return {
          content: [{ type: 'text', text: `No items from source ${id}` }],
        };
      }

      const text = items
        .map((item) => `- [${item.title}](${item.url})${item.publishedAt ? ` (${item.publishedAt})` : ''}`)
        .join('\n');

      return {
        structuredContent: {
          sourceId: id,
          sourceName,
          items,
        },
        content: [{ type: 'text', text }],
      };
    },
  );

  server.server.onerror = console.error.bind(console);
  return server;
}

module.exports = { createMcpSdkServer };
