import { getRuntimeEnv } from './runtime-env.js'
import { getD1Tables } from './db.d1.js'
import { getLocalDatabase, getLocalTables } from './db.local.js'

function resolveD1Binding() {
  const runtime = getRuntimeEnv()
  if (runtime?.DB) return runtime.DB
  if (globalThis?.DB) return globalThis.DB
  return null
}

export async function getDatabase() {
  const d1 = resolveD1Binding()
  if (d1) return d1
  return getLocalDatabase()
}

export function getTables() {
  const d1 = resolveD1Binding()
  if (d1) return getD1Tables(d1)
  return getLocalTables()
}
