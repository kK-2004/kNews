import { getTables } from '../../../utils/db'
import { getEffectiveGlobalSourceScope, requireAdmin } from '../../../utils/admin'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const tables = await getTables()

  if (event.method === 'GET') {
    const sourceIds = await getEffectiveGlobalSourceScope(tables)
    return { sourceIds }
  }

  if (event.method === 'PUT') {
    const body = await readBody(event)
    const sourceIds = Array.isArray(body?.sourceIds)
      ? [...new Set(body.sourceIds.map((item) => String(item || '').trim()).filter(Boolean))]
      : []
    const allSources = await tables.source.list()
    const valid = new Set(allSources.map((item) => String(item.id)))
    const normalized = sourceIds.filter((id) => valid.has(id))
    await tables.appMeta.setJson('admin:global_source_scope', normalized)
    return { sourceIds: normalized }
  }

  throw createError({ statusCode: 405, message: 'Method not allowed' })
})
