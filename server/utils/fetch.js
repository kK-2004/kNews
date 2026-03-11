function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function withDefaultHeaders(headers = {}) {
  return {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
    ...headers
  }
}

export async function myFetch(url, options = {}) {
  const {
    retry,
    timeout: timeoutOption,
    responseType,
    headers,
    body,
    ...rest
  } = options || {}
  const retries = Number.isFinite(retry) ? Number(retry) : 3
  const timeout = Number.isFinite(timeoutOption) ? Number(timeoutOption) : 10000
  let lastError

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), timeout)
    try {
      const requestHeaders = withDefaultHeaders(headers || {})
      let requestBody = body
      const isBodyObject = requestBody && typeof requestBody === 'object' && !(requestBody instanceof ArrayBuffer) && !(requestBody instanceof Uint8Array) && !(requestBody instanceof FormData) && !(requestBody instanceof URLSearchParams)
      if (isBodyObject) {
        requestBody = JSON.stringify(requestBody)
        if (!requestHeaders['Content-Type']) requestHeaders['Content-Type'] = 'application/json'
      }

      const response = await fetch(url, {
        ...rest,
        headers: requestHeaders,
        body: requestBody,
        signal: controller.signal
      })
      if (!response.ok) throw new Error(`upstream ${response.status}`)

      if (responseType === 'arrayBuffer') return response.arrayBuffer()
      if (responseType === 'text') return response.text()
      if (responseType === 'json') return response.json()

      const type = response.headers.get('content-type') || ''
      if (type.includes('application/json')) return response.json()
      if (type.includes('text/') || type.includes('javascript')) return response.text()
      return response.arrayBuffer()
    } catch (error) {
      lastError = error
      if (attempt < retries) await sleep((attempt + 1) * 250)
    } finally {
      clearTimeout(timer)
    }
  }

  throw lastError || new Error('fetch failed')
}
