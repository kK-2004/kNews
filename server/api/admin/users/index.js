import { getQuery } from 'h3'
import { getTables } from '../../../utils/db'
import { isAdminGithubId, requireAdmin } from '../../../utils/admin'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const query = getQuery(event)
  const username = String(query?.username || '')
  const status = String(query?.status || '')
  const page = Number(query?.page) || 1
  const pageSize = Number(query?.pageSize) || 10
  const { user, loginAudit } = await getTables()
  const result = await user.listForAdmin({ username, status, page, pageSize })
  const recentLogins = await loginAudit.listRecent(500)

  return {
    users: result.items.map((row) => ({
      id: row.id,
      username: row.login || row.email || row.id,
      email: row.email,
      login: row.login,
      isAdmin: isAdminGithubId(row.id),
      status: row.is_blacklisted ? 'blacklist' : 'normal',
      apikeyCount: row.apikey_count,
      totalCalls: row.total_calls,
      lastActive: row.last_login_at ? new Date(row.last_login_at).toISOString() : null
    })),
    pagination: {
      total: result.total,
      page: result.page,
      pageSize: result.pageSize,
      totalPages: result.totalPages
    },
    loginAudits: recentLogins
  }
})
