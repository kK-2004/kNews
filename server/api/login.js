import { randomBytes } from 'node:crypto'
import { setCookie } from 'h3'
import { getEnv } from '../utils/runtime-env'

export default defineEventHandler((event) => {
  const clientId = getEnv('G_CLIENT_ID')
  if (!clientId) {
    throw createError({ statusCode: 503, message: 'G_CLIENT_ID not configured' })
  }

  const state = randomBytes(24).toString('hex')
  setCookie(event, 'oauth_github_state', state, {
    httpOnly: true,
    sameSite: 'lax',
    secure: getEnv('NODE_ENV') === 'production',
    maxAge: 10 * 60,
    path: '/api/oauth/github'
  })

  const params = new URLSearchParams({
    client_id: clientId,
    state
  })

  return sendRedirect(event, `https://github.com/login/oauth/authorize?${params.toString()}`)
})
