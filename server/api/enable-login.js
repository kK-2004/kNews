import { getEnv } from '../utils/runtime-env'

export default defineEventHandler(() => {
  const enabled = Boolean(getEnv('G_CLIENT_ID') && getEnv('G_CLIENT_SECRET') && getEnv('JWT_SECRET'))
  return {
    enable: enabled,
    url: enabled ? '/api/login' : null
  }
})
