import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { z } from 'zod'
import { resolveGetter } from '../getters'
import { getSourceMeta, isValidSourceId, resolveSourceId } from '../utils/newsnow-sources'

function parseApiKeySourceIds(apiKey) {
  if (!apiKey) return []
  if (Array.isArray(apiKey.source_ids)) {
    return apiKey.source_ids.map((item) => String(item || '')).filter(Boolean)
  }
  if (typeof apiKey.source_ids === 'string') {
    try {
      const parsed = JSON.parse(apiKey.source_ids || '[]')
      if (Array.isArray(parsed)) return parsed.map((item) => String(item || '')).filter(Boolean)
    } catch {
      return []
    }
  }
  return []
}

export function getServer(options = {}) {
  const apiKey = options.apiKey || null
  const server = new McpServer(
    {
      name: 'kNews',
      version: '0.1.0'
    },
    { capabilities: { logging: {} } }
  )

//   server.tool(
//     'health_check',
//     'Step 1 (required): check MCP connectivity and server health before any other tool call.',
//     {},
//     async () => {
//       return {
//         content: [{ type: 'text', text: 'kNews MCP is running.' }]
//       }
//     }
//   )

  server.tool(
    'get_available_sources',
    'Step 1 (required): return source ids allowed for current api key and max_count limit. Use these ids for get_hotest_latest_news.',
    {},
    async () => {
      const allowedSourceIds = parseApiKeySourceIds(apiKey)
      const maxCount = apiKey ? Math.min(30, Math.max(1, Number(apiKey.max_count) || 12)) : 30
      if (!allowedSourceIds.length) {
        return {
          content: [{ type: 'text', text: `Available sources: all enabled sources. max_count=${maxCount}` }]
        }
      }
      return {
        content: [{ type: 'text', text: `Available sources: ${allowedSourceIds.join(', ')}. max_count=${maxCount}` }]
      }
    }
  )

  server.tool(
    'get_hotest_latest_news',
    'Step 2: fetch hottest/latest news by source id. Call this only after health_check and get_available_sources; id must come from available sources.',
    {
      id: z.string().describe('source id from get_available_sources, e.g. zhihu / weibo / wallstreetcn / github'),
      count: z.any().default(10).describe('requested item count. effective count is capped by api key max_count.')
    },
    async ({ id, count }) => {
      const toolStartTime = Date.now()
      console.log('[MCP Tool] get_hotest_latest_news called with id:', id, 'count:', count)

      if (!isValidSourceId(id)) {
        return {
          content: [{ type: 'text', text: `Invalid source id: ${id}. Call get_available_sources first.` }]
        }
      }

      const resolvedId = resolveSourceId(id)
      const sourceMeta = getSourceMeta(resolvedId)
      const allowedSourceIds = parseApiKeySourceIds(apiKey)
      if (allowedSourceIds.length > 0 && !allowedSourceIds.includes(id) && !allowedSourceIds.includes(resolvedId)) {
        return {
          content: [{ type: 'text', text: `Source is not allowed by current API key: ${id}. Call get_available_sources first.` }]
        }
      }
      console.log('[MCP Tool] Resolving getter for id:', resolvedId)
      const getter = (await resolveGetter(resolvedId)) || (await resolveGetter(id))
      if (!getter) {
        return {
          content: [{ type: 'text', text: `Source getter not implemented: ${resolvedId}` }]
        }
      }
      console.log('[MCP Tool] Getter resolved, time:', Date.now() - toolStartTime, 'ms')

      const requestedLimit = Math.min(30, Math.max(1, Number(count) || 10))
      const keyMaxCount = apiKey ? Math.min(30, Math.max(1, Number(apiKey.max_count) || 12)) : 30
      const limit = Math.min(requestedLimit, keyMaxCount)

      console.log('[MCP Tool] Calling getter function...')
      const rows = await getter()
      console.log('[MCP Tool] Getter returned, time:', Date.now() - toolStartTime, 'ms, rows:', Array.isArray(rows) ? rows.length : 'not array')

      const items = (Array.isArray(rows) ? rows : [])
        .map((row) => ({
          title: row?.title || 'Untitled',
          url: row?.url || ''
        }))
        .filter((item) => item.url)
        .slice(0, limit)

      if (!items.length) {
        console.log('[MCP Tool] No items found')
        return {
          content: [{ type: 'text', text: `No items from source ${sourceMeta?.name || id}` }]
        }
      }

      const text = items.map((item) => `- [${item.title}](${item.url})`).join('\n')
      console.log('[MCP Tool] Completed, total time:', Date.now() - toolStartTime, 'ms')
      return {
        content: [{ type: 'text', text }]
      }
    }
  )

  server.server.onerror = console.error.bind(console)
  return server
}
