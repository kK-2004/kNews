import { getTables } from '../../../utils/db'

function normalizeArray(value) {
  if (!Array.isArray(value)) return []
  return [...new Set(value.map((item) => String(item || '').trim()).filter(Boolean))]
}

function normalizePayload(payload) {
  const input = payload && typeof payload === 'object' ? payload : {}
  const board = input.board && typeof input.board === 'object' ? input.board : {}
  return {
    board: {
      followedSourceIds: normalizeArray(board.followedSourceIds),
      orderedSourceIds: normalizeArray(board.orderedSourceIds)
    }
  }
}

export default defineEventHandler(async (event) => {
  if (!event.context.user?.id) {
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }

  const { preference } = await getTables()
  const userId = event.context.user.id

  if (event.method === 'GET') {
    const row = await preference.getByUserId(userId)
    return { preferences: row?.value || { board: { followedSourceIds: [], orderedSourceIds: [] } } }
  }

  if (event.method === 'PUT') {
    const body = await readBody(event)
    const value = normalizePayload(body)
    const row = await preference.setByUserId(userId, value)
    return { preferences: row.value }
  }

  throw createError({ statusCode: 405, message: 'Method not allowed' })
})
