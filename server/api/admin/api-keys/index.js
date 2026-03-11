import { getQuery } from 'h3'
import { getTables } from '../../../utils/db'
import { requireAdmin } from '../../../utils/admin'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const query = getQuery(event)
  const keyId = String(query?.keyId || '')
  const { apiKey } = await getTables()
  const keys = await apiKey.listForAdmin({ keyId })
  return {
    keys: keys.map((key) => ({
      id: key.id,
      name: key.name || 'Untitled key',
      username: key.username,
      key: key.key_plaintext || key.id,
      userId: key.user_id,
      sourceIds: key.source_ids,
      maxCount: key.max_count,
      rateLimitRph: key.rate_limit_rph,
      callCount: key.call_count,
      lastCallTime: key.last_used ? new Date(key.last_used).toISOString() : null,
      createdAt: key.created ? new Date(key.created).toISOString() : null
    }))
  }
})
