import { getTables } from './db'
import { getEnv } from './runtime-env'

function getAdminGithubIds() {
  return String(getEnv('ADMIN_GITHUB_IDS') || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
}

export function isAdminGithubId(id) {
  const normalized = String(id || '').trim()
  if (!normalized) return false
  return getAdminGithubIds().includes(normalized)
}

export async function resolveCurrentUser(event) {
  const userId = event.context.user?.id
  if (!userId) return null
  const { user } = await getTables()
  return user.getById(userId)
}

export async function requireAdmin(event) {
  if (!event.context.user?.id) {
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }

  const row = await resolveCurrentUser(event)
  const userId = String(row?.id || event.context.user?.id || '')
  const isAdmin = isAdminGithubId(userId)
  if (!isAdmin) {
    throw createError({ statusCode: 403, message: 'Admin access required' })
  }

  return {
    user: row,
    isAdmin
  }
}

export async function getEffectiveGlobalSourceScope(tables) {
  const stored = await tables.appMeta.getJson('admin:global_source_scope', null)
  if (Array.isArray(stored)) return stored.map((item) => String(item || '')).filter(Boolean)
  const enabled = await tables.source.listEnabled()
  return enabled.map((item) => String(item.id))
}
