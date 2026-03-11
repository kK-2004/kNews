import { getRouterParam } from 'h3'
import { getTables } from '../../../utils/db'
import { requireAdmin } from '../../../utils/admin'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  if (event.method !== 'DELETE') throw createError({ statusCode: 405, message: 'Method not allowed' })
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, message: 'Key id is required' })
  const { apiKey } = await getTables()
  const deleted = await apiKey.adminDeleteKey(id)
  if (!deleted) throw createError({ statusCode: 404, message: 'Key not found' })
  return { success: true }
})
