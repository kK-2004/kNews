import { jwtVerify } from 'jose'
import { getEnv } from '../utils/runtime-env'

const REQUIRED_LOGIN_ENV = ['JWT_SECRET', 'G_CLIENT_ID', 'G_CLIENT_SECRET']

export default defineEventHandler(async (event) => {
  const url = getRequestURL(event)
  if (!url.pathname.startsWith('/api')) return

  const loginEnabled = REQUIRED_LOGIN_ENV.every((key) => Boolean(getEnv(key)))
  event.context.disabledLogin = !loginEnabled

  if (!loginEnabled && (url.pathname.startsWith('/api/me') || url.pathname.startsWith('/api/admin'))) {
    throw createError({ statusCode: 503, message: 'Login is not configured on server' })
  }

  const needsStrictAuth = url.pathname.startsWith('/api/me') || url.pathname.startsWith('/api/admin')
  const token = getHeader(event, 'Authorization')?.replace(/Bearer\s*/i, '').trim()
  if (!token) {
    if (needsStrictAuth) throw createError({ statusCode: 401, message: 'JWT verification failed' })
    return
  }

  try {
    const { payload } = await jwtVerify(token, new TextEncoder().encode(getEnv('JWT_SECRET')))
    if (payload?.id) {
      event.context.user = {
        id: String(payload.id),
        type: payload.type ? String(payload.type) : 'github'
      }
    }
  } catch {
    if (needsStrictAuth) throw createError({ statusCode: 401, message: 'JWT verification failed' })
  }
})
