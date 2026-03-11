import { sendWebResponse } from 'h3'
import { WebStandardStreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js'
import { getServer } from '../mcp/server'
import { requireMcpAuth, isMcpAuthRequired } from '../utils/api-key-auth'
import { getTables } from '../utils/db'
import { checkRateLimit } from '../utils/rate-limit'
import { getEffectiveGlobalSourceScope, isAdminGithubId } from '../utils/admin'

function parseSourceIds(value) {
  if (Array.isArray(value)) return value.map((item) => String(item || '')).filter(Boolean)
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value || '[]')
      if (Array.isArray(parsed)) return parsed.map((item) => String(item || '')).filter(Boolean)
    } catch {
      return []
    }
  }
  return []
}

export default defineEventHandler(async (event) => {
  function jsonRpcErrorResponse(status, message, extraHeaders = null) {
    const headers = new Headers({ 'content-type': 'application/json' })
    if (extraHeaders) {
      for (const [k, v] of Object.entries(extraHeaders)) headers.set(k, String(v))
    }
    return new Response(JSON.stringify({
      jsonrpc: '2.0',
      error: { code: -32603, message },
      id: null
    }), {
      status,
      headers
    })
  }

  if (event.method === 'POST') {
    const contentLength = Number(getHeader(event, 'content-length') || '0')
    if (!Number.isNaN(contentLength) && contentLength === 0) {
      return sendWebResponse(
        event,
        jsonRpcErrorResponse(400, 'Parse error: request body is required for POST')
      )
    }
  }

  let apiKey = null
  if (isMcpAuthRequired()) {
    try {
      apiKey = await requireMcpAuth(event)
    } catch {
      return sendWebResponse(event, jsonRpcErrorResponse(401, 'Invalid or expired API Key'))
    }
  }

  if (apiKey) {
    const { user, appMeta, source } = await getTables()
    const owner = await user.getById(apiKey.user_id)
    if (owner?.is_blacklisted) {
      return sendWebResponse(event, jsonRpcErrorResponse(403, 'User is blacklisted'))
    }

    const isAdmin = isAdminGithubId(owner?.id || apiKey.user_id)
    const globalScope = await getEffectiveGlobalSourceScope({ appMeta, source })
    const globalSet = new Set((Array.isArray(globalScope) ? globalScope : []).map((item) => String(item)))
    if (!isAdmin) {
      const keyScope = parseSourceIds(apiKey.source_ids)
      const effective = keyScope.length
        ? keyScope.filter((id) => globalSet.has(id))
        : Array.from(globalSet)
      apiKey.source_ids = effective
    }

    const perKeyRate = Math.max(1, Number(apiKey.rate_limit_rph) || 100)
    const rateLimit = checkRateLimit(apiKey.key_hash, {
      requestsPerUnit: perKeyRate,
      windowMs: 60 * 60 * 1000
    })
    if (!rateLimit.allowed) {
      return sendWebResponse(
        event,
        jsonRpcErrorResponse(429, `Rate limit exceeded. Try again in ${rateLimit.retryAfter} seconds.`, {
          'Retry-After': String(rateLimit.retryAfter)
        })
      )
    }

    try {
      const { apiKey: apiKeyTable } = await getTables()
      await apiKeyTable.updateUsage(apiKey.key_hash)
    } catch (error) {
      console.warn('Failed to update API key usage', error)
    }
  }

  // Create server and transport for this request
  const server = getServer({ apiKey })
  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
    enableJsonResponse: false
  })

  try {
    // In Cloudflare Workers with Nitro, we need to construct the Request manually
    const url = getRequestURL(event).href
    const headersObj = {}

    // Nitro getHeaders returns a Headers-like object, but may not have entries()
    // Use getAll to get all header values
    const headers = getHeaders(event)
    for (const key of Object.keys(headers)) {
      const value = headers[key]
      if (typeof value === 'string') {
        headersObj[key] = value
      } else if (Array.isArray(value)) {
        headersObj[key] = value.join(', ')
      }
    }

    // Ensure Accept header includes both JSON and SSE
    const accept = headersObj['accept'] || ''
    if (!accept.includes('application/json') || !accept.includes('text/event-stream')) {
      headersObj['accept'] = 'application/json, text/event-stream'
    }

    // Read body as raw text, then let MCP SDK parse it
    let body = null
    if (event.method !== 'GET' && event.method !== 'HEAD') {
      // Read as raw text first
      const rawBody = await readRawBody(event).catch(() => null)
      if (rawBody) {
        body = rawBody
      }
    }

    const mcpRequest = new Request(url, {
      method: event.method,
      headers: headersObj,
      body
    })

    transport.onerror = (err) => console.error('MCP transport error:', err)
    await server.connect(transport)

    const response = await transport.handleRequest(mcpRequest)
    return sendWebResponse(event, response)
  } catch (error) {
    console.error('[MCP] Error:', error)
    return sendWebResponse(event, jsonRpcErrorResponse(500, `Internal server error: ${error.message}`))
  }
})
