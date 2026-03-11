import NEWSNOW_SOURCES_JSON from '../../shared/newsnow-sources.json' with { type: 'json' }

export const NEWSNOW_SOURCES = NEWSNOW_SOURCES_JSON

export function getSourceMeta(id) {
  return NEWSNOW_SOURCES?.[id]
}

export function resolveSourceId(input) {
  const id = String(input || '')
  if (!id) return ''
  const current = getSourceMeta(id)
  if (!current) return ''
  return current.redirect || id
}

export function isValidSourceId(id) {
  return Boolean(getSourceMeta(id))
}

export function getTopLevelSourceIds() {
  return Object.entries(NEWSNOW_SOURCES)
    .filter(([id, meta]) => !meta?.redirect && !String(id).includes('-'))
    .map(([id]) => id)
}
