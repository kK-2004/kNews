import { getTables } from '../../utils/db'
import { isAdminGithubId } from '../../utils/admin'

export default defineEventHandler(async (event) => {
  if (!event.context.user?.id) {
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }

  const { user } = await getTables()
  const row = await user.getById(event.context.user.id)
  const current = row || event.context.user
  const userId = String(current?.id || event.context.user.id || '')
  const isAdmin = isAdminGithubId(userId)

  return {
    user: {
      ...current,
      isAdmin,
      isBlacklisted: Boolean(current?.is_blacklisted)
    }
  }
})
