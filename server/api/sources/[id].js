import { getRouterParam } from 'h3'
import { getTables } from '../../utils/db'
import { requireAdmin } from '../../utils/admin'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, message: 'Source id is required' })

  const { source } = await getTables()
  await requireAdmin(event)

  if (event.method === 'PUT') {
    const body = await readBody(event)
    const item = await source.update(id, body || {})
    if (!item) throw createError({ statusCode: 404, message: 'Source not found' })
    return { item }
  }

  if (event.method === 'DELETE') {
    const ok = await source.remove(id)
    if (!ok) throw createError({ statusCode: 404, message: 'Source not found' })
    return { success: true }
  }

  throw createError({ statusCode: 405, message: 'Method not allowed' })
})
