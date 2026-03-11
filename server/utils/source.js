import process from 'node:process'
import defu from 'defu'
import { rss2json } from './rss2json'

export function defineSource(source) {
  return source
}

export function defineRSSSource(url, option = {}) {
  return async () => {
    const data = await rss2json(url)
    if (!data?.items?.length) throw new Error('Cannot fetch RSS data')

    return data.items.map((item) => ({
      title: item.title,
      url: item.link,
      id: item.link,
      pubDate: option.hiddenDate ? undefined : item.created
    }))
  }
}

export function defineRSSHubSource(route, rssHubOptions = {}, sourceOption = {}) {
  return async () => {
    const rssHubBase = 'https://rsshub.rssforever.com'
    const url = new URL(route, rssHubBase)
    url.searchParams.set('format', 'json')

    const options = defu(rssHubOptions, { sorted: true })
    for (const [key, value] of Object.entries(options)) {
      url.searchParams.set(key, String(value))
    }

    const response = await fetch(url)
    if (!response.ok) throw new Error(`RSSHub fetch failed: ${response.status}`)
    const data = await response.json()

    return (data.items || []).map((item) => ({
      title: item.title,
      url: item.url,
      id: item.id || item.url,
      pubDate: sourceOption.hiddenDate ? undefined : item.date_published
    }))
  }
}

export function proxySource(proxyUrl, source) {
  return defineSource(async () => {
    if (process.env.CF_PAGES) {
      const response = await fetch(proxyUrl)
      if (!response.ok) throw new Error(`Proxy fetch failed: ${response.status}`)
      const data = await response.json()
      return data.items || []
    }
    return source()
  })
}
