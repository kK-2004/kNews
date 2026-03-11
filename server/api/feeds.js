import { getQuery } from 'h3'
import { getTables } from '../utils/db'
import { rss2json } from '../utils/rss2json'

const FEED_CACHE_KEY = 'feeds:all'
const FEED_CACHE_TTL = 5 * 60 * 1000

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

function normalizeFeedItem(source, item) {
  const url = item?.link || item?.url || ''
  const id = item?.id || url
  const image = pickImage(item)
  return {
    id,
    sourceId: source.id,
    sourceName: source.name,
    title: item?.title || 'Untitled',
    url,
    description: item?.description || '',
    summary: item?.description || '',
    created: item?.created || item?.pubDate || '',
    pubDate: item?.created || item?.pubDate || '',
    image,
    thumbnail: image
  }
}

async function buildFeedItems(sources) {
  const results = await Promise.allSettled(
    sources.map(async (source) => {
      const rss = await rss2json(source.url)
      const items = Array.isArray(rss?.items) ? rss.items : []
      return items.map((item) => normalizeFeedItem(source, item)).filter((item) => item.url)
    })
  )

  const merged = []
  for (const result of results) {
    if (result.status === 'fulfilled') merged.push(...result.value)
  }

  merged.sort((a, b) => {
    const ta = Date.parse(a.pubDate || a.created || 0) || 0
    const tb = Date.parse(b.pubDate || b.created || 0) || 0
    return tb - ta
  })
  return merged
}

export default defineEventHandler(async (event) => {
  const { source, cache } = await getTables()
  const query = getQuery(event)
  const page = Math.max(1, Number.parseInt(String(query.page || '1'), 10) || 1)
  const limit = Math.min(100, Math.max(1, Number.parseInt(String(query.limit || '20'), 10) || 20))

  const now = Date.now()
  const shouldUseCache = process.env.ENABLE_CACHE !== 'false'
  let allItems

  if (shouldUseCache) {
    const hit = await cache.get(FEED_CACHE_KEY)
    if (hit && now - Number(hit.updated || 0) < FEED_CACHE_TTL) {
      allItems = Array.isArray(hit.items) ? hit.items : []
    }
  }

  if (!allItems) {
    const enabledSources = await source.listEnabled()
    allItems = await buildFeedItems(enabledSources || [])
    if (shouldUseCache) await cache.set(FEED_CACHE_KEY, allItems)
  }

  const start = (page - 1) * limit
  const end = start + limit
  const items = allItems.slice(start, end)
  return {
    items,
    hasMore: end < allItems.length
  }
})
