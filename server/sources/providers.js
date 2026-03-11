import { encodeBase64 } from '../utils/base64'
import { md5 } from '../utils/crypto'

function toText(value) {
  return typeof value === 'string' ? value : ''
}

function createCoolapkDeviceId() {
  const parts = [10, 6, 6, 6, 14]
  return parts.map((size) => Math.random().toString(36).slice(2, size)).join('-')
}

async function buildCoolapkHeaders() {
  const deviceId = createCoolapkDeviceId()
  const now = Math.round(Date.now() / 1000)
  const hexNow = `0x${now.toString(16)}`
  const md5Now = await md5(now)
  const tokenSeed = `token://com.coolapk.market/c67ef5943784d09750dcfbb31020f0ab?${md5Now}$${deviceId}&com.coolapk.market`
  const xAppToken = `${await md5(encodeBase64(tokenSeed))}${deviceId}${hexNow}`
  return {
    'X-Requested-With': 'XMLHttpRequest',
    'X-App-Id': 'com.coolapk.market',
    'X-App-Token': xAppToken,
    'X-Sdk-Int': '29',
    'X-Sdk-Locale': 'zh-CN',
    'X-App-Version': '11.0',
    'X-Api-Version': '11',
    'X-App-Code': '2101202',
    Referer: 'https://www.coolapk.com/',
    'User-Agent': 'Dalvik/2.1.0 (Linux; U; Android 10; Redmi K30 5G MIUI/V12.0.3.0.QGICMXM) (#Build; Redmi; Redmi K30 5G; QKQ1.191222.002 test-keys; 10) +CoolMarket/11.0-2101202'
  }
}

async function fetchJson(url, options = {}, retries = 2) {
  let lastError
  for (let i = 0; i <= retries; i += 1) {
    try {
      const res = await fetch(url, options)
      if (!res.ok) throw new Error(`upstream ${res.status}`)
      return await res.json()
    } catch (error) {
      lastError = error
      if (i < retries) await new Promise((resolve) => setTimeout(resolve, 300 * (i + 1)))
    }
  }
  throw lastError || new Error('fetch failed')
}

function stripHtml(raw) {
  return toText(raw).replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
}

export async function fetchDouyinHot() {
  const cookieResponse = await fetch('https://login.douyin.com/')
  const cookies = cookieResponse.headers.getSetCookie?.() || []
  const data = await fetchJson(
    'https://www.douyin.com/aweme/v1/web/hot/search/list/?device_platform=webapp&aid=6383&channel=channel_pc_web&detail_list=1',
    { headers: { cookie: cookies.join('; ') } }
  )
  const list = data?.data?.word_list || []
  return list.map((k) => ({
    id: String(k.sentence_id),
    title: k.word,
    url: `https://www.douyin.com/hot/${k.sentence_id}`,
    extra: { info: k.hot_value ? `${k.hot_value} 热度` : '' }
  }))
}

export async function fetchZhihuHot() {
  const data = await fetchJson('https://www.zhihu.com/api/v3/feed/topstory/hot-list-web?limit=20&desktop=true')
  const list = data?.data || []
  return list.map((k) => ({
    id: String(k?.target?.link?.url || k?.target?.title_area?.text),
    title: k?.target?.title_area?.text || 'Untitled',
    url: k?.target?.link?.url || 'https://www.zhihu.com',
    extra: {
      info: k?.target?.metrics_area?.text || '',
      hover: k?.target?.excerpt_area?.text || ''
    }
  }))
}

export async function fetchWeiboHot() {
  const baseurl = 'https://s.weibo.com'
  const url = `${baseurl}/top/summary?cate=realtimehot`
  const html = await fetch('https://s.weibo.com/top/summary?cate=realtimehot', {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
      Cookie: 'SUB=_2AkMWIuNSf8NxqwJRmP8dy2rhaoV2ygrEieKgfhKJJRMxHRl-yT9jqk86tRB6PaLNvQZR6zYUcYVT1zSjoSreQHidcUq7',
      Referer: url
    }
  }).then((r) => r.text())

  const flagUrl = {
    新: 'https://simg.s.weibo.com/moter/flags/1_0.png',
    热: 'https://simg.s.weibo.com/moter/flags/2_0.png',
    爆: 'https://simg.s.weibo.com/moter/flags/4_0.png'
  }

  const rows = html.match(/<tr[^>]*>[\s\S]*?<\/tr>/g) || []
  const items = []
  for (const row of rows) {
    const linkMatch = row.match(/<td[^>]*class="td-02"[^>]*>[\s\S]*?<a[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/)
    if (!linkMatch) continue
    const href = linkMatch[1]
    const title = stripHtml(linkMatch[2])
    if (!title || !href) continue

    const suffix = row.match(/<td[^>]*class="td-03"[^>]*>([\s\S]*?)<\/td>/)
    const suffixText = stripHtml(suffix?.[1] || '')
    const icon = flagUrl[suffixText]

    const heatMatch = row.match(/<span[^>]*>([^<]+)<\/span>/)
    const heatText = stripHtml(heatMatch?.[1] || '')
    const info = heatText.includes('万') ? heatText : ''

    const fullUrl = href.startsWith('http') ? href : `${baseurl}${href}`
    items.push({
      id: title,
      title,
      url: fullUrl,
      extra: {
        info,
        icon
      }
    })
  }
  if (items.length > 0) return items

  // Fallback: ajax endpoint when HTML parsing fails.
  const ajax = await fetchJson('https://weibo.com/ajax/side/hotSearch', {
    headers: {
      'User-Agent': 'Mozilla/5.0',
      Referer: 'https://weibo.com/hot/search'
    }
  }, 1)
  const fallbackList = ajax?.data?.realtime || []
  return fallbackList.map((k) => {
    const word = k.word || k.note
    const encoded = encodeURIComponent(word)
    const heat = String(k.num || '')
    const info = heat.includes('万') ? heat : ''
    return {
      id: String(k?.mid || word),
      title: word,
      url: `https://s.weibo.com/weibo?q=${encoded}`,
      extra: {
        info,
        icon: k?.flag ? String(k.flag) : ''
      }
    }
  })
}

export async function fetchCoolapkHot() {
  const url = 'https://api.coolapk.com/v6/page/dataList?url=%2Ffeed%2FstatList%3FcacheExpires%3D300%26statType%3Dday%26sortField%3Ddetailnum%26title%3D%E4%BB%8A%E6%97%A5%E7%83%AD%E9%97%A8&title=%E4%BB%8A%E6%97%A5%E7%83%AD%E9%97%A8&subTitle=&page=1'
  const data = await fetchJson(url, {
    headers: await buildCoolapkHeaders()
  })
  const list = data?.data || []
  return list.filter((k) => k.id).map((i) => ({
    id: String(i.id),
    title: stripHtml(i.editor_title || i.message || ''),
    url: `https://www.coolapk.com${i.url || ''}`,
    extra: {
      info: i?.targetRow?.subTitle || ''
    }
  }))
}

export async function fetchWallstreetcnQuick() {
  const data = await fetchJson('https://api-one.wallstcn.com/apiv1/content/lives?channel=global-channel&limit=30')
  const list = data?.data?.items || []
  return list.map((k) => ({
    id: String(k.id),
    title: k.title || k.content_text,
    url: k.uri,
    extra: { date: Number(k.display_time || 0) * 1000 }
  }))
}

export async function fetchHupuHot() {
  const response = await fetch('https://bbs.hupu.com/topic-daily-hot', {
    headers: { 'User-Agent': 'Mozilla/5.0' }
  })
  if (!response.ok) throw new Error(`hupu upstream ${response.status}`)
  const html = await response.text()
  const regex = /<li class="bbs-sl-web-post-body">[\s\S]*?<a href="(\/[^"]+?\.html)"[^>]*?class="p-title"[^>]*>([^<]+)<\/a>/g
  const result = []
  let match
  while (true) {
    match = regex.exec(html)
    if (!match) break
    result.push({
      id: match[1],
      title: stripHtml(match[2]),
      url: `https://bbs.hupu.com${match[1]}`
    })
  }
  return result
}

export async function fetchTiebaHot() {
  const data = await fetchJson('https://tieba.baidu.com/hottopic/browse/topicList')
  const list = data?.data?.bang_topic?.topic_list || []
  return list.map((k) => ({
    id: String(k.topic_id),
    title: k.topic_name,
    url: k.topic_url
  }))
}

export async function fetchToutiaoHot() {
  const data = await fetchJson('https://www.toutiao.com/hot-event/hot-board/?origin=toutiao_pc', {
    headers: { 'User-Agent': 'Mozilla/5.0' }
  })
  const list = data?.data || []
  return list.map((k) => ({
    id: String(k.ClusterIdStr),
    title: k.Title,
    url: `https://www.toutiao.com/trending/${k.ClusterIdStr}/`,
    extra: { info: k.HotValue || '' }
  }))
}

export async function fetchIthomeRealtime() {
  const response = await fetch('https://www.ithome.com/list/', {
    headers: { 'User-Agent': 'Mozilla/5.0' }
  })
  if (!response.ok) throw new Error(`ithome upstream ${response.status}`)
  const html = await response.text()
  const regex = /<li[^>]*>[\s\S]*?<a[^>]*class="t"[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>[\s\S]*?<i>([^<]+)<\/i>/g
  const list = []
  let match
  while (true) {
    match = regex.exec(html)
    if (!match) break
    const url = match[1]
    const title = stripHtml(match[2])
    const date = stripHtml(match[3])
    if (!title || !url) continue
    if (url.includes('lapin') || ['神券', '优惠', '补贴', '京东'].some((k) => title.includes(k))) continue
    list.push({
      id: url,
      title,
      url: url.startsWith('http') ? url : `https://www.ithome.com${url}`,
      extra: {
        info: date || ''
      }
    })
  }
  return list
}

export async function fetchGelonghuiRealtime() {
  const response = await fetch('https://www.gelonghui.com/news/', {
    headers: { 'User-Agent': 'Mozilla/5.0' }
  })
  if (!response.ok) throw new Error(`gelonghui upstream ${response.status}`)
  const html = await response.text()
  const regex = /<a[^>]*href="([^"]+)"[^>]*>\s*<h2[^>]*>([\s\S]*?)<\/h2>[\s\S]*?<div[^>]*class="time"[^>]*>[\s\S]*?<span[^>]*>([^<]*)<\/span>/g
  const list = []
  let match
  while (true) {
    match = regex.exec(html)
    if (!match) break
    const href = match[1]
    const title = stripHtml(match[2])
    const info = stripHtml(match[3])
    if (!href || !title) continue
    list.push({
      id: href,
      title,
      url: href.startsWith('http') ? href : `https://www.gelonghui.com${href}`,
      extra: { info }
    })
  }
  return list
}

export async function fetchJin10Realtime() {
  const response = await fetch(`https://www.jin10.com/flash_newest.js?t=${Date.now()}`, {
    headers: { 'User-Agent': 'Mozilla/5.0' }
  })
  if (!response.ok) throw new Error(`jin10 upstream ${response.status}`)
  const raw = await response.text()
  const jsonText = raw
    .replace(/^var\s+newest\s*=\s*/, '')
    .replace(/;*$/, '')
    .trim()
  const data = JSON.parse(jsonText)

  return (Array.isArray(data) ? data : [])
    .filter((k) => (k?.data?.title || k?.data?.content) && !k?.channel?.includes?.(5))
    .map((k) => {
      const text = String(k?.data?.title || k?.data?.content || '').replace(/<\/?b>/g, '')
      const m = text.match(/^【([^】]*)】(.*)$/)
      const title = m?.[1] || text
      const hover = m?.[2] ? stripHtml(m[2]) : ''
      return {
        id: String(k.id || k.time || text),
        title: stripHtml(title),
        url: `https://flash.jin10.com/detail/${k.id}`,
        extra: {
          hover,
          info: k?.important ? '✰' : ''
        }
      }
    })
}

export const sourceProviders = {
  douyin: fetchDouyinHot,
  zhihu: fetchZhihuHot,
  weibo: fetchWeiboHot,
  coolapk: fetchCoolapkHot,
  'wallstreetcn-quick': fetchWallstreetcnQuick,
  hupu: fetchHupuHot,
  tieba: fetchTiebaHot,
  toutiao: fetchToutiaoHot,
  ithome: fetchIthomeRealtime,
  gelonghui: fetchGelonghuiRealtime,
  jin10: fetchJin10Realtime
}
