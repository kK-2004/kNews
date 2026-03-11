import { XMLParser } from 'fast-xml-parser'

const URL_PATTERN = /^https?:\/\/[^\s$.?#].\S*/i

export async function rss2json(url) {
  if (!URL_PATTERN.test(url)) return undefined

  const response = await fetch(url)
  if (!response.ok) throw new Error(`Failed to fetch RSS ${url}: ${response.status}`)
  const data = await response.text()

  const xml = new XMLParser({
    attributeNamePrefix: '',
    textNodeName: '$text',
    ignoreAttributes: false
  })

  const result = xml.parse(data)
  let channel = result?.rss?.channel || result?.feed
  if (Array.isArray(channel)) channel = channel[0]
  if (!channel) return undefined

  const rss = {
    title: channel.title ?? '',
    description: channel.description ?? '',
    link: channel.link?.href || channel.link || '',
    image: channel.image?.url || channel['itunes:image']?.href || '',
    category: channel.category || [],
    updatedTime: channel.lastBuildDate ?? channel.updated,
    items: []
  }

  let items = channel.item || channel.entry || []
  if (!Array.isArray(items)) items = [items]

  for (const val of items) {
    const media = {}
    const item = {
      id: val?.guid?.$text || val?.id || val?.link,
      title: val?.title?.$text || val?.title || '',
      description: val?.summary?.$text || val?.description || '',
      link: val?.link?.href || val?.link || '',
      author: val?.author?.name || val?.['dc:creator'] || '',
      created: val?.updated || val?.pubDate || val?.created,
      category: val?.category || [],
      content: val?.content?.$text || val?.['content:encoded'] || '',
      enclosures: val?.enclosure ? (Array.isArray(val.enclosure) ? val.enclosure : [val.enclosure]) : []
    }

    const reserved = [
      'content:encoded',
      'podcast:transcript',
      'itunes:summary',
      'itunes:author',
      'itunes:explicit',
      'itunes:duration',
      'itunes:season',
      'itunes:episode',
      'itunes:episodeType',
      'itunes:image'
    ]

    for (const key of reserved) {
      if (val?.[key] !== undefined) item[key.replace(':', '_')] = val[key]
    }

    if (val?.['media:thumbnail']) {
      media.thumbnail = val['media:thumbnail']
      item.enclosures.push(val['media:thumbnail'])
    }

    if (val?.['media:content']) {
      media.content = val['media:content']
      item.enclosures.push(val['media:content'])
    }

    if (val?.['media:group']) {
      const g = val['media:group']
      if (g['media:title']) item.title = g['media:title']
      if (g['media:description']) item.description = g['media:description']
      if (g['media:thumbnail']) item.enclosures.push(g['media:thumbnail'].url)
      if (g['media:content']) item.enclosures.push(g['media:content'])
    }

    item.media = media
    rss.items.push(item)
  }

  return rss
}
