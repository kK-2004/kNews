import { getRouterParam } from 'h3'
import { getTables } from '../../../../utils/db'
import { requireAdmin } from '../../../../utils/admin'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const userId = getRouterParam(event, 'id')
  if (!userId) throw createError({ statusCode: 400, message: 'User id is required' })
  const { apiKey } = await getTables()
  const keys = await apiKey.listByUserForAdmin(userId)
  return {
    keys: keys.map((key) => ({
      id: key.id,
      name: key.name || 'Untitled key',
      sourceIds: key.source_ids,
      maxCount: key.max_count,
      rateLimitRph: key.rate_limit_rph,
      callCount: key.call_count,
      lastUsed: key.last_used
    }))
  }
})
