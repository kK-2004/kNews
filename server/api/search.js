import { getQuery } from 'h3'
import { getTables } from '../utils/db'
import { rss2json } from '../utils/rss2json'
import { resolveGetter } from '../getters'
import { getSourceMeta, isValidSourceId, resolveSourceId } from '../utils/newsnow-sources'
import { validateApiKey } from '../utils/api-key-auth'

const TTL = 30 * 60 * 1000

function pickImage(item) {
  if (typeof item?.image === 'string' && item.image) return item.image
  if (typeof item?.thumbnail === 'string' && item.thumbnail) return item.thumbnail
  const thumb = item?.media?.thumbnail
  if (typeof thumb === 'string') return thumb
  if (thumb?.url) return thumb.url
  const enclosure = Array.isArray(item?.enclosures) ? item.enclosures[0] : undefined
  if (typeof enclosure === 'string') return enclosure
  if (enclosure?.url) return enclosure.url
  return ''
}

function normalizeItem(item) {
  const url = item?.link || item?.url || ''
  return {
    id: item?.id || url,
    title: item?.title || 'Untitled',
    url,
    description: item?.description || '',
    created: item?.created || item?.pubDate || '',
    image: pickImage(item)
  }
}

function normalizeHeatInfo(value) {
  if (typeof value !== 'string') return ''
  return value.includes('万') ? value : ''
}

function normalizeDate(row) {
  if (row?.extra?.date) {
    const value = Number(row.extra.date)
    if (Number.isFinite(value) && value > 0) return new Date(value).toUTCString()
  }
  if (typeof row?.pubDate === 'string') return row.pubDate
  if (typeof row?.created === 'string') return row.created
  return ''
}

function normalizeProviderItem(row) {
  return {
    id: row?.id || row?.url,
    title: row?.title || 'Untitled',
    url: row?.url || '',
    description: row?.description || row?.extra?.hover || '',
    created: normalizeDate(row),
    image: row?.image || row?.extra?.image || '',
    extra: {
      ...(row?.extra || {}),
      info: normalizeHeatInfo(row?.extra?.info)
    }
  }
}

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const requestedId = String(query.id || '')
  let id = requestedId
  const latest = query.latest !== undefined && query.latest !== 'false'
  let count = Math.min(30, Math.max(1, Number.parseInt(String(query.count || '12'), 10) || 12))
  if (!id) throw createError({ statusCode: 400, message: 'Query param "id" is required' })
  if (!isValidSourceId(id)) throw createError({ statusCode: 400, message: 'Invalid source id' })
  id = resolveSourceId(id)

  const { source, cache, apiKey: apiKeyTable } = await getTables()
  const sources = await source.list()
  const matched = sources.find((s) => s.id === id) || sources.find((s) => s.id === requestedId)
  const sourceMeta = getSourceMeta(id)
  // 检查数据源是否存在且已启用
  if (!matched || !sourceMeta || matched.enabled !== 1) {
    throw createError({ statusCode: 404, message: 'Source not found or not enabled' })
  }

  const apiKey = await validateApiKey(event)
  if (apiKey) {
    let parsedSourceIds = []
    if (typeof apiKey.source_ids === 'string') {
      try {
        parsedSourceIds = JSON.parse(apiKey.source_ids || '[]')
      } catch {
        parsedSourceIds = []
      }
    }
    const rawSourceIds = Array.isArray(apiKey.source_ids)
      ? apiKey.source_ids
      : parsedSourceIds
    const sourceIds = Array.isArray(rawSourceIds)
      ? rawSourceIds.map((item) => String(item || '')).filter(Boolean)
      : []
    if (sourceIds.length > 0 && !sourceIds.includes(id) && !sourceIds.includes(requestedId)) {
      throw createError({ statusCode: 403, message: 'Source is not allowed by this API key' })
    }
    const maxCount = Math.min(30, Math.max(1, Number(apiKey.max_count) || 12))
    count = Math.min(count, maxCount)
    try {
      await apiKeyTable.updateUsage(apiKey.key_hash)
    } catch {
      // Non-blocking usage update.
    }
  }

  const cacheKey = `source:${id}`
  const now = Date.now()
  const sourceInterval = Number(sourceMeta.interval || matched.interval || 10 * 60 * 1000)
  const cacheHit = await cache.get(cacheKey)
  if (cacheHit) {
    if (now - cacheHit.updated < sourceInterval) {
      return {
        status: 'success',
        id,
        source: matched,
        updatedTime: now,
        items: cacheHit.items || [],
        warning: ''
      }
    }

    if (now - cacheHit.updated < TTL) {
      if (!latest) {
        return {
          status: 'cache',
          id,
          source: matched,
          updatedTime: cacheHit.updated,
          items: cacheHit.items || [],
          warning: ''
        }
      }
    }
  }

  let items = []
  let warning = ''
  const getter = (await resolveGetter(id)) || (await resolveGetter(matched.id))
  if (getter) {
    try {
      const rows = await getter()
      items = (rows || [])
        .map(normalizeProviderItem)
        .filter((item) => item.url)
        .slice(0, count)
    } catch (error) {
      warning = error instanceof Error ? error.message : 'provider fetch failed'
    }
  }
  else {
    warning = `source getter not implemented: ${id}`
  }

  if (!items.length && matched.url) {
    try {
      const rss = await rss2json(matched.url)
      items = (rss?.items || []).map(normalizeItem).filter((item) => item.url).slice(0, count)
    } catch (error) {
      if (!warning) warning = error instanceof Error ? error.message : 'rss fallback failed'
    }
  }

  // hottest 模式计算榜单位次变化（diff）
  if (sourceMeta.type === 'hottest' && cacheHit?.items?.length) {
    items = items.map((item, idx) => {
      const oldIndex = cacheHit.items.findIndex((oldItem) => oldItem.id === item.id)
      if (oldIndex === -1) return item
      return {
        ...item,
        extra: {
          ...(item.extra || {}),
          diff: oldIndex - idx
        }
      }
    })
  }

  if (items.length) await cache.set(cacheKey, items)
  else if (cacheHit?.items?.length) {
    return {
      status: 'cache',
      id,
      source: matched,
      updatedTime: cacheHit.updated,
      items: cacheHit.items || [],
      warning: warning || 'using cached data'
    }
  }

  return {
    status: 'success',
    id,
    source: matched,
    updatedTime: now,
    items,
    warning
  }
})
