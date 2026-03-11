import { generateApiKey, hashApiKey } from '../../../utils/api-key'
import { getTables } from '../../../utils/db'
import { getEffectiveGlobalSourceScope, isAdminGithubId } from '../../../utils/admin'

export default defineEventHandler(async (event) => {
  if (!event.context.user?.id) {
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }

  const { apiKey: apiKeyTable } = await getTables()
  const userId = event.context.user.id
  const { user: userTable, source: sourceTable, appMeta } = await getTables()
  const user = await userTable.getById(userId)
  if (user?.is_blacklisted) {
    throw createError({ statusCode: 403, message: 'User is blacklisted' })
  }

  if (event.method === 'GET') {
    const keys = await apiKeyTable.getKeysByUserId(userId)
    return { keys }
  }

  if (event.method === 'POST') {
    let body = {}
    try {
      body = await readBody(event)
    } catch {
      body = {}
    }

    const sourceIds = Array.isArray(body?.sourceIds)
      ? [...new Set(body.sourceIds.map((item) => String(item || '').trim()).filter(Boolean))]
      : []
    const requestedMaxCount = Math.min(30, Math.max(1, Number(body?.maxCount) || 12))
    const requestedRateLimitRph = Math.max(1, Number(body?.rateLimitRph) || 100)
    const enabledSources = await sourceTable.listEnabled()
    const enabledIds = new Set(enabledSources.map((item) => String(item.id)))
    const globalAllowed = await getEffectiveGlobalSourceScope({ appMeta, source: sourceTable })
    const isAdmin = isAdminGithubId(user?.id || userId)
    const scopeSet = new Set(globalAllowed.map((id) => String(id)))
    const validSourceIds = sourceIds.filter((id) => enabledIds.has(id) && (isAdmin || scopeSet.has(id)))

    const apiKey = generateApiKey()
    const keyHash = await hashApiKey(apiKey)
    const createdKey = await apiKeyTable.createKey(
      userId,
      keyHash,
      apiKey,
      body?.name || null,
      validSourceIds,
      requestedMaxCount,
      requestedRateLimitRph
    )
    return {
      key: apiKey,
      ...createdKey
    }
  }

  throw createError({ statusCode: 405, message: 'Method not allowed' })
})
