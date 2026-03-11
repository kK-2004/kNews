import { getQuery } from 'h3'
import { getTables } from '../../../utils/db'
import { requireAdmin } from '../../../utils/admin'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const query = getQuery(event)
  const start = Number(query?.start) || Date.now() - 7 * 24 * 60 * 60 * 1000
  const end = Number(query?.end) || Date.now()
  const keyId = String(query?.keyId || '')

  const { apiKey } = await getTables()
  const usage = await apiKey.getUsageAnalytics({ start, end, keyId })
  const leaderboard = await apiKey.getHourlyLeaderboard(20)

  return {
    daily: usage.daily,
    hourly: usage.hourly,
    leaderboard
  }
})
