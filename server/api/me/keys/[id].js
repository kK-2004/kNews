import { getTables } from '../../../utils/db'

export default defineEventHandler(async (event) => {
  if (!event.context.user?.id) {
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }

  if (event.method !== 'DELETE') {
    throw createError({ statusCode: 405, message: 'Method not allowed' })
  }

  const keyId = getRouterParam(event, 'id')
  if (!keyId) throw createError({ statusCode: 400, message: 'Key ID is required' })

  const { apiKey: apiKeyTable } = await getTables()
  const deleted = await apiKeyTable.deleteKey(keyId, event.context.user.id)
  if (!deleted) throw createError({ statusCode: 404, message: 'API Key not found' })

  return { success: true }
})
