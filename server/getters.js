import './source-runtime'

const sourceLoaders = {
  '36kr': () => import('./sources/_36kr.ts'),
  _36kr: () => import('./sources/_36kr.ts'),
  baidu: () => import('./sources/baidu.ts'),
  bilibili: () => import('./sources/bilibili.ts'),
  cankaoxiaoxi: () => import('./sources/cankaoxiaoxi.ts'),
  chongbuluo: () => import('./sources/chongbuluo.ts'),
  cls: () => import('./sources/cls/index.ts'),
  coolapk: () => import('./sources/coolapk/index.ts'),
  douban: () => import('./sources/douban.ts'),
  douyin: () => import('./sources/douyin.ts'),
  fastbull: () => import('./sources/fastbull.ts'),
  freebuf: () => import('./sources/freebuf.ts'),
  gelonghui: () => import('./sources/gelonghui.ts'),
  ghxi: () => import('./sources/ghxi.ts'),
  github: () => import('./sources/github.ts'),
  hackernews: () => import('./sources/hackernews.ts'),
  hupu: () => import('./sources/hupu.ts'),
  ifeng: () => import('./sources/ifeng.ts'),
  iqiyi: () => import('./sources/iqiyi.ts'),
  ithome: () => import('./sources/ithome.ts'),
  jin10: () => import('./sources/jin10.ts'),
  juejin: () => import('./sources/juejin.ts'),
  kaopu: () => import('./sources/kaopu.ts'),
  kuaishou: () => import('./sources/kuaishou.ts'),
  linuxdo: () => import('./sources/linuxdo.ts'),
  mktnews: () => import('./sources/mktnews.ts'),
  nowcoder: () => import('./sources/nowcoder.ts'),
  pcbeta: () => import('./sources/pcbeta.ts'),
  producthunt: () => import('./sources/producthunt.ts'),
  qqvideo: () => import('./sources/qqvideo.ts'),
  smzdm: () => import('./sources/smzdm.ts'),
  solidot: () => import('./sources/solidot.ts'),
  sputniknewscn: () => import('./sources/sputniknewscn.ts'),
  sspai: () => import('./sources/sspai.ts'),
  steam: () => import('./sources/steam.ts'),
  tencent: () => import('./sources/tencent.ts'),
  thepaper: () => import('./sources/thepaper.ts'),
  tieba: () => import('./sources/tieba.ts'),
  toutiao: () => import('./sources/toutiao.ts'),
  v2ex: () => import('./sources/v2ex.ts'),
  wallstreetcn: () => import('./sources/wallstreetcn.ts'),
  weibo: () => import('./sources/weibo.ts'),
  xueqiu: () => import('./sources/xueqiu.ts'),
  zaobao: () => import('./sources/zaobao.ts'),
  zhihu: () => import('./sources/zhihu.ts')
}

function isFunction(value) {
  return typeof value === 'function'
}

async function resolveFromModule(id, mod) {
  const loaded = mod?.default
  if (isFunction(loaded)) return loaded
  if (loaded && typeof loaded === 'object' && isFunction(loaded[id])) return loaded[id]
  return null
}

export function listKnownSourceIds() {
  return Object.keys(sourceLoaders)
}

export async function resolveGetter(id) {
  const normalized = String(id || '').trim()
  const rootId = normalized.split('-')[0]
  const loader = sourceLoaders[normalized] || sourceLoaders[rootId]
  if (!loader) return null
  const mod = await loader()
  return (await resolveFromModule(normalized, mod)) || (await resolveFromModule(rootId, mod))
}
