let runtimeEnv = null

export function setRuntimeEnv(env) {
  if (env && typeof env === 'object') {
    runtimeEnv = env
  }
}

export function getRuntimeEnv() {
  return runtimeEnv
}

export function getEnv(name, fallback = '') {
  const key = String(name || '').trim()
  if (!key) return fallback

  const fromRuntime = runtimeEnv?.[key]
  if (fromRuntime !== undefined && fromRuntime !== null && String(fromRuntime) !== '') {
    return String(fromRuntime)
  }

  const fromProcess = globalThis?.process?.env?.[key]
  if (fromProcess !== undefined && fromProcess !== null && String(fromProcess) !== '') {
    return String(fromProcess)
  }

  return fallback
}

export function hasEnv(name) {
  return getEnv(name, '') !== ''
}
