export const columns = {
  china: { zh: '国内' },
  world: { zh: '国际' },
  tech: { zh: '科技' },
  finance: { zh: '财经' },
  focus: { zh: '关注' },
  realtime: { zh: '实时' },
  hottest: { zh: '最热' }
}

export const fixedColumnIds = ['focus', 'hottest', 'realtime']

function isTopLevelSource([id, source]) {
  return !String(id).includes('-')
}

export function buildMetadata(sourcesMap) {
  const entries = Object.entries(sourcesMap || {}).filter(isTopLevelSource)
  return Object.fromEntries(Object.keys(columns).map((key) => {
    if (key === 'focus') return [key, { name: columns[key].zh, sources: [] }]
    if (key === 'hottest') {
      return [key, {
        name: columns[key].zh,
        sources: entries.filter(([, v]) => v?.type === 'hottest').map(([id]) => id)
      }]
    }
    if (key === 'realtime') {
      return [key, {
        name: columns[key].zh,
        sources: entries.filter(([, v]) => v?.type === 'realtime').map(([id]) => id)
      }]
    }
    return [key, {
      name: columns[key].zh,
      sources: entries.filter(([, v]) => v?.column === key).map(([id]) => id)
    }]
  }))
}

export function getBoardSourceIds(sourcesMap, tab = 'hottest') {
  const metadata = buildMetadata(sourcesMap)
  const ids = metadata?.[tab]?.sources || []
  if (ids.length) return ids
  return metadata?.china?.sources || []
}
