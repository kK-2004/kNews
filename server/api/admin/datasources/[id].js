import { getRouterParam } from 'h3'
import { getTables } from '../../../utils/db'
import { requireAdmin } from '../../../utils/admin'

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
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, message: 'Datasource id is required' })
  const { source } = await getTables()

  if (event.method === 'PUT') {
    const body = await readBody(event)
    const hasOwn = (key) => Object.prototype.hasOwnProperty.call(body || {}, key)
    const updated = await source.update(id, {
      name: hasOwn('name') ? String(body?.name || '') : undefined,
      category: hasOwn('type') ? String(body?.type || 'api') : undefined,
      url: hasOwn('connection') ? String(body?.connection || '') : undefined,
      enabled: hasOwn('enabled') ? normalizeEnabled(body?.enabled) : undefined,
      title: hasOwn('title') ? String(body?.title || '') : undefined,
      type: hasOwn('feedType') ? String(body?.feedType || 'hottest') : undefined
    })
    if (!updated) throw createError({ statusCode: 404, message: 'Datasource not found' })
    return { item: normalizeDatasourceRow(updated) }
  }

  if (event.method === 'DELETE') {
    const ok = await source.remove(id)
    if (!ok) throw createError({ statusCode: 404, message: 'Datasource not found' })
    return { success: true }
  }

  throw createError({ statusCode: 405, message: 'Method not allowed' })
})
