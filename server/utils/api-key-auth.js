import { getQuery } from 'h3'
import { verifyApiKey, isValidApiKeyFormat } from './api-key'
import { getTables } from './db'
import { getEnv } from './runtime-env'

export function isMcpAuthRequired() {
  return getEnv('MCP_REQUIRE_AUTH') === 'true'
}

export async function validateApiKey(event) {
  const query = getQuery(event)
  const headerValue = getHeader(event, 'x-api-key')
  const queryValue = query?.apiKey || query?.apikey || query?.['x-api-key']
  const value = headerValue || queryValue
  if (!value || typeof value !== 'string') return null
  const apiKey = value.trim()
  if (!isValidApiKeyFormat(apiKey)) return null

  const { apiKey: apiKeyTable } = await getTables()
  const allKeys = await apiKeyTable.listActiveKeys()

  for (const row of allKeys || []) {
    if (await verifyApiKey(apiKey, row.key_hash)) return row
  }
  return null
}

export async function requireMcpAuth(event) {
  if (!isMcpAuthRequired()) return null
  const apiKey = await validateApiKey(event)
  if (!apiKey) {
    throw createError({
      statusCode: 401,
      message: 'Invalid or expired API Key'
    })
  }
  event.context.apiKey = apiKey
  return apiKey
}
