import process from "node:process"

// Interface for Bilibili Hot Video response
interface HotVideoRes {
  code: number
  message: string
  ttl: number
  data: {
    list: {
      aid: number
      videos: number
      tid: number
      tname: string
      copyright: number
      pic: string
      title: string
      pubdate: number
      ctime: number
      desc: string
      state: number
      duration: number
      owner: {
        mid: number
        name: string
        face: string
      }
      stat: {
        view: number
        danmaku: number
        reply: number
        favorite: number
        coin: number
        share: number
        now_rank: number
        his_rank: number
        like: number
        dislike: number
      }
      dynamic: string
      cid: number
      dimension: {
        width: number
        height: number
        rotate: number
      }
      short_link: string
      short_link_v2: string
      bvid: string
      rcmd_reason: {
        content: string
        corner_mark: number
      }
    }[]
  }
}

function toObject(value: any) {
  if (value && typeof value === 'object') return value
  if (typeof value !== 'string') return null
  try {
    return JSON.parse(value)
  } catch {
    return null
  }
}

function toHotSearchList(payload: any) {
  const obj = toObject(payload) as any
  if (!obj) return []

  const direct = Array.isArray(obj?.list) ? obj.list : []
  if (direct.length) {
    return direct
      .map((item: any) => ({
        keyword: String(item?.keyword || item?.show_name || item?.word || '').trim(),
        show_name: String(item?.show_name || item?.keyword || item?.word || '').trim(),
        icon: String(item?.icon || ''),
      }))
      .filter((item: any) => item.keyword && item.show_name)
  }

  const trending = Array.isArray(obj?.data?.trending?.list) ? obj.data.trending.list : []
  const fallback = Array.isArray(obj?.data?.list) ? obj.data.list : []
  const merged = trending.length ? trending : fallback

  return merged
    .map((item: any) => ({
      keyword: String(item?.keyword || item?.show_name || item?.word || '').trim(),
      show_name: String(item?.show_name || item?.keyword || item?.word || '').trim(),
      icon: String(item?.icon || ''),
    }))
    .filter((item: any) => item.keyword && item.show_name)
}

const hotSearch = defineSource(async () => {
  const cookie = process.env.BILIBILI_COOKIE || ''
  const endpoints = [
    "https://s.search.bilibili.com/main/hotword?limit=30",
    "https://api.bilibili.com/x/web-interface/search/square?limit=30",
    "https://api.bilibili.com/x/web-interface/search/square?platform=web&limit=30",
  ]
  const headers = {
    Referer: "https://www.bilibili.com/",
    Accept: "application/json, text/plain, */*",
    ...(cookie ? { Cookie: cookie } : {}),
  }

  let list: any[] = []
  for (const endpoint of endpoints) {
    try {
      const raw: any = await myFetch(endpoint, { headers })
      list = toHotSearchList(raw)
      if (list.length) break
    } catch {
      // Try next endpoint.
    }
  }

  if (!list.length) {
    throw new Error("bilibili hot search returned empty list")
  }

  return list.map(k => ({
    id: k.keyword,
    title: k.show_name,
    url: `https://search.bilibili.com/all?keyword=${encodeURIComponent(k.keyword)}`,
    extra: {
      icon: k.icon,
    },
  }))
})

const hotVideo = defineSource(async () => {
  const url = "https://api.bilibili.com/x/web-interface/popular"
  const raw: any = await myFetch(url, {
    headers: { Referer: "https://www.bilibili.com/" },
  })
  const res = (toObject(raw) || {}) as HotVideoRes

  const list = Array.isArray(res?.data?.list) ? res.data.list : []
  if (!list.length) throw new Error("bilibili popular returned empty list")
  return list.map(video => ({
    id: video.bvid,
    title: video.title,
    url: `https://www.bilibili.com/video/${video.bvid}`,
    pubDate: video.pubdate * 1000,
    extra: {
      info: `${video.owner.name} · ${formatNumber(video.stat.view)}观看 · ${formatNumber(video.stat.like)}点赞`,
      hover: video.desc,
      icon: video.pic,
    },
  }))
})

const ranking = defineSource(async () => {
  const url = "https://api.bilibili.com/x/web-interface/ranking/v2"
  const raw: any = await myFetch(url, {
    headers: { Referer: "https://www.bilibili.com/" },
  })
  const res = (toObject(raw) || {}) as HotVideoRes

  const list = Array.isArray(res?.data?.list) ? res.data.list : []
  if (!list.length) throw new Error("bilibili ranking returned empty list")
  return list.map(video => ({
    id: video.bvid,
    title: video.title,
    url: `https://www.bilibili.com/video/${video.bvid}`,
    pubDate: video.pubdate * 1000,
    extra: {
      info: `${video.owner.name} · ${formatNumber(video.stat.view)}观看 · ${formatNumber(video.stat.like)}点赞`,
      hover: video.desc,
      icon: video.pic,
    },
  }))
})

function formatNumber(num: number): string {
  if (num >= 10000) {
    return `${Math.floor(num / 10000)}w+`
  }
  return num.toString()
}

export default defineSource({
  "bilibili": hotSearch,
  "bilibili-hot-search": hotSearch,
  "bilibili-hot-video": hotVideo,
  "bilibili-ranking": ranking,
})
