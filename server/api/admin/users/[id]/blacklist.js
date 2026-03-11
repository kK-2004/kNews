import { getRouterParam } from 'h3'
import { getTables } from '../../../../utils/db'
import { requireAdmin } from '../../../../utils/admin'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  if (event.method !== 'PUT') throw createError({ statusCode: 405, message: 'Method not allowed' })
  const userId = getRouterParam(event, 'id')
  if (!userId) throw createError({ statusCode: 400, message: 'User id is required' })
  const body = await readBody(event)
  const blacklisted = Boolean(body?.blacklisted)
  const { user } = await getTables()
  const updated = await user.setBlacklisted(userId, blacklisted)
  if (!updated) throw createError({ statusCode: 404, message: 'User not found' })
  return {
    user: {
      id: updated.id,
      login: updated.login,
      status: updated.is_blacklisted ? 'blacklist' : 'normal'
    }
  }
})
