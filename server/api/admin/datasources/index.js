import { getTables } from '../../../utils/db'
import { getEffectiveGlobalSourceScope, requireAdmin } from '../../../utils/admin'

function normalizeEnabled(value) {
  if (typeof value === 'boolean') return value
  if (typeof value === 'number') return value === 1
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase()
    return normalized === '1' || normalized === 'true'
  }
  return false
}

function normalizeDatasourceRow(row) {
  const rawType = String(row.category || 'api')
  const type = ['mysql', 'postgresql', 'api'].includes(rawType) ? rawType : 'api'
  return {
    id: row.id,
    name: row.name,
    type,
    connection: row.url || '',
    enabled: normalizeEnabled(row.enabled),
    updatedAt: new Date(Number(row.updated || 0)).toISOString()
  }
}

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const tables = await getTables()

  if (event.method === 'GET') {
    const items = await tables.source.list()
    const globalSourceIds = await getEffectiveGlobalSourceScope(tables)
    return {
      items: items.map(normalizeDatasourceRow),
      globalSourceIds
    }
  }

  if (event.method === 'POST') {
    const body = await readBody(event)
    const created = await tables.source.create({
      name: String(body?.name || 'Untitled datasource'),
      category: String(body?.type || 'api'),
      url: String(body?.connection || ''),
      enabled: normalizeEnabled(body?.enabled),
      title: String(body?.title || ''),
      type: String(body?.feedType || 'hottest')
    })
    return { item: normalizeDatasourceRow(created) }
  }

  throw createError({ statusCode: 405, message: 'Method not allowed' })
})
