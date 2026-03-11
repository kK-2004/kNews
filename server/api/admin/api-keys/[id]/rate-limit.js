import { getRouterParam } from 'h3'
import { getTables } from '../../../../utils/db'
import { requireAdmin } from '../../../../utils/admin'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  if (event.method !== 'PUT') throw createError({ statusCode: 405, message: 'Method not allowed' })
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, message: 'Key id is required' })
  const body = await readBody(event)
  const { apiKey } = await getTables()
  const updated = await apiKey.setRateLimit(id, Number(body?.rateLimitRph) || 100)
  if (!updated) throw createError({ statusCode: 404, message: 'Key not found' })
  return {
    key: {
      id: updated.id,
      rateLimitRph: updated.rate_limit_rph
    }
  }
})
