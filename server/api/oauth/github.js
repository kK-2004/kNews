import { SignJWT } from 'jose'
import { deleteCookie, getCookie } from 'h3'
import { getTables } from '../../utils/db'
import { isAdminGithubId } from '../../utils/admin'
import { getEnv } from '../../utils/runtime-env'

export default defineEventHandler(async (event) => {
  const clientId = getEnv('G_CLIENT_ID')
  const clientSecret = getEnv('G_CLIENT_SECRET')
  const jwtSecret = getEnv('JWT_SECRET')

  if (!clientId || !clientSecret || !jwtSecret) {
    throw createError({ statusCode: 503, message: 'OAuth is not configured on server' })
  }

  const code = getQuery(event).code
  const state = getQuery(event).state
  const cookieState = getCookie(event, 'oauth_github_state')

  if (!state || typeof state !== 'string' || !cookieState || state !== cookieState) {
    throw createError({ statusCode: 400, message: 'Invalid OAuth state' })
  }
  deleteCookie(event, 'oauth_github_state', { path: '/api/oauth/github' })

  if (!code || typeof code !== 'string') {
    throw createError({ statusCode: 400, message: 'Missing OAuth code' })
  }

  const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      client_id: clientId,
      client_secret: clientSecret,
      code,
      state
    })
  })

  if (!tokenResponse.ok) {
    throw createError({ statusCode: 502, message: 'Failed to exchange GitHub access token' })
  }

  const tokenData = await tokenResponse.json()
  if (!tokenData?.access_token) {
    throw createError({ statusCode: 502, message: 'GitHub token response missing access_token' })
  }

  const userResponse = await fetch('https://api.github.com/user', {
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `token ${tokenData.access_token}`,
      'User-Agent': 'kNews App'
    }
  })

  if (!userResponse.ok) {
    throw createError({ statusCode: 502, message: 'Failed to fetch GitHub user profile' })
  }

  const userInfo = await userResponse.json()
  const userId = String(userInfo.id)
  const githubLogin = String(userInfo.login || '')
  const isAdmin = isAdminGithubId(userId)
  const email = userInfo.notification_email || userInfo.email || ''
  const { user, loginAudit } = await getTables()
  await user.upsertUser({ id: userId, email, login: githubLogin, type: 'github' })
  await loginAudit.recordLogin({ userId, githubLogin })

  const jwtToken = await new SignJWT({ id: userId, type: 'github' })
    .setExpirationTime('7d')
    .setProtectedHeader({ alg: 'HS256' })
    .sign(new TextEncoder().encode(jwtSecret))

  const params = new URLSearchParams({
    login: 'github',
    jwt: jwtToken,
    user: JSON.stringify({
      avatar: userInfo.avatar_url,
      name: userInfo.name || githubLogin || `github:${userId}`,
      login: githubLogin,
      isAdmin
    })
  })

  return sendRedirect(event, `/?${params.toString()}`)
})
