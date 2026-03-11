import { setRuntimeEnv } from '../utils/runtime-env.js'

export default defineEventHandler((event) => {
  const env = event?.context?.cloudflare?.env || null
  if (env) setRuntimeEnv(env)
})
