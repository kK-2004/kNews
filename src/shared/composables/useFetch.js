import { getCurrentInstance, onUnmounted, ref } from 'vue'

const cache = new Map()
const inFlight = new Map()

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function isRetryable(status) {
  return status >= 500
}

export function invalidateCache(pattern = '') {
  for (const key of cache.keys()) {
    if (!pattern || key.includes(pattern)) cache.delete(key)
  }
}

/**
 * Generic fetch composable with cache, dedupe, retry, timeout and abort support.
 */
export function useFetch(url, options = {}) {
  const data = ref(null)
  const error = ref(null)
  const loading = ref(false)
  const controller = new AbortController()

  const ttl = options.ttl ?? 5 * 60 * 1000
  const timeout = options.timeout ?? 30_000
  const retries = options.retries ?? 3
  const useCache = options.cache !== false
  const transform = options.transform

  const fetchOptions = { ...options }
  delete fetchOptions.ttl
  delete fetchOptions.timeout
  delete fetchOptions.retries
  delete fetchOptions.cache
  delete fetchOptions.transform

  const key = `${options.method || 'GET'}:${url}`

  const execute = async ({ force = false } = {}) => {
    error.value = null

    if (useCache && !force) {
      const hit = cache.get(key)
      if (hit && hit.expiresAt > Date.now()) {
        data.value = hit.value
        return hit.value
      }
    }

    if (inFlight.has(key)) {
      const pending = await inFlight.get(key)
      data.value = pending
      return pending
    }

    loading.value = true

    const request = (async () => {
      let lastError = null
      for (let attempt = 0; attempt <= retries; attempt += 1) {
        const timeoutId = setTimeout(() => controller.abort(), timeout)
        try {
          const response = await fetch(url, {
            ...fetchOptions,
            signal: controller.signal,
            headers: {
              ...(fetchOptions.headers || {})
            }
          })

          if (!response.ok) {
            if (!isRetryable(response.status) || attempt === retries) {
              throw new Error(`Request failed: ${response.status}`)
            }
            await sleep(2 ** attempt * 1000)
            continue
          }

          const json = await response.json()
          const transformed = transform ? transform(json) : json

          if (useCache) {
            cache.set(key, {
              value: transformed,
              expiresAt: Date.now() + ttl
            })
          }

          data.value = transformed
          return transformed
        } catch (err) {
          lastError = err
          if (attempt === retries) throw err
          if (err?.name === 'AbortError') throw err
          await sleep(2 ** attempt * 1000)
        } finally {
          clearTimeout(timeoutId)
        }
      }
      throw lastError || new Error('Unknown fetch error')
    })()

    inFlight.set(key, request)

    try {
      return await request
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Unknown error'
      throw err
    } finally {
      inFlight.delete(key)
      loading.value = false
    }
  }

  const refresh = () => execute({ force: true })
  const abort = () => controller.abort()

  if (getCurrentInstance()) {
    onUnmounted(abort)
  }

  return {
    data,
    error,
    loading,
    refresh,
    execute,
    abort
  }
}
