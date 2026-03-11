import { getEnv } from './runtime-env'

const store = new Map()

function parseRateLimitConfig() {
  const config = getEnv('MCP_RATE_LIMIT')
  if (!config) {
    return {
      enabled: true,
      requestsPerUnit: 100,
      windowMs: 60 * 60 * 1000
    }
  }

  const match = config.match(/^(\d+)\/(minute|hour|day)$/i)
  if (!match) {
    return {
      enabled: true,
      requestsPerUnit: 100,
      windowMs: 60 * 60 * 1000
    }
  }

  const unit = match[2].toLowerCase()
  const windowMs = unit === 'minute'
    ? 60 * 1000
    : unit === 'hour'
      ? 60 * 60 * 1000
      : 24 * 60 * 60 * 1000

  return {
    enabled: true,
    requestsPerUnit: Number.parseInt(match[1], 10),
    windowMs
  }
}

const rateLimitConfig = parseRateLimitConfig()

export function checkRateLimit(identifier, override = null) {
  const effectiveConfig = override?.requestsPerUnit
    ? {
        enabled: true,
        requestsPerUnit: Math.max(1, Number(override.requestsPerUnit) || 100),
        windowMs: Math.max(1000, Number(override.windowMs) || (60 * 60 * 1000))
      }
    : rateLimitConfig
  if (!effectiveConfig.enabled) return { allowed: true, retryAfter: null }

  const now = Date.now()
  const minWindowStart = now - effectiveConfig.windowMs
  let entry = store.get(identifier)
  if (!entry) {
    entry = { count: 0, windowStart: now }
    store.set(identifier, entry)
  }

  if (entry.windowStart < minWindowStart) {
    entry.count = 0
    entry.windowStart = now
  }

  if (entry.count >= effectiveConfig.requestsPerUnit) {
    const retryAfter = Math.ceil((entry.windowStart + effectiveConfig.windowMs - now) / 1000)
    return { allowed: false, retryAfter: retryAfter > 0 ? retryAfter : 1 }
  }

  entry.count += 1
  return { allowed: true, retryAfter: null }
}
