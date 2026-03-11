import { getTables } from '../../utils/db'
import { validateApiKey } from '../../utils/api-key-auth'
import { getEffectiveGlobalSourceScope, isAdminGithubId, requireAdmin } from '../../utils/admin'

export default defineEventHandler(async (event) => {
  const { source } = await getTables()

  if (event.method === 'GET') {
    const items = await source.list()
    const apiKey = await validateApiKey(event)
    if (!apiKey) {
      // 未登录用户也只返回已启用的数据源
      return { items: items.filter((item) => item.enabled === 1) }
    }
    const { user: userTable, appMeta } = await getTables()

    let allowedSourceIds = []
    if (Array.isArray(apiKey.source_ids)) {
      allowedSourceIds = apiKey.source_ids.map((item) => String(item || '')).filter(Boolean)
    } else if (typeof apiKey.source_ids === 'string') {
      try {
        const parsed = JSON.parse(apiKey.source_ids || '[]')
        if (Array.isArray(parsed)) {
          allowedSourceIds = parsed.map((item) => String(item || '')).filter(Boolean)
        }
      } catch {
        allowedSourceIds = []
      }
    }

    const keyOwner = await userTable.getById(apiKey.user_id)
    if (keyOwner?.is_blacklisted) {
      throw createError({ statusCode: 403, message: 'User is blacklisted' })
    }
    const isAdminKey = isAdminGithubId(keyOwner?.id || apiKey.user_id)
    const globalScope = await getEffectiveGlobalSourceScope({ appMeta, source })
    const globalSet = new Set((Array.isArray(globalScope) ? globalScope : []).map((item) => String(item)))

    // 先过滤已启用的数据源
    const enabledItems = isAdminKey ? items : items.filter((item) => item.enabled === 1)

    const scopedByGlobal = !isAdminKey
      ? enabledItems.filter((item) => globalSet.has(String(item.id)))
      : enabledItems
    const filteredItems = allowedSourceIds.length
      ? scopedByGlobal.filter((item) => allowedSourceIds.includes(item.id))
      : scopedByGlobal
    const effectiveSourceIds = filteredItems.map((item) => String(item.id))

    return {
      items: filteredItems,
      scope: {
        sourceIds: effectiveSourceIds,
        maxCount: Math.min(30, Math.max(1, Number(apiKey.max_count) || 12))
      }
    }
  }

  if (event.method === 'POST') {
    await requireAdmin(event)
    const body = await readBody(event)
    const item = await source.create(body || {})
    return { item }
  }

  throw createError({ statusCode: 405, message: 'Method not allowed' })
})
