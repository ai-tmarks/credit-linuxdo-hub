import * as jose from 'jose'
import { parseCookies, serializeCookie } from '../../lib/cookies'

interface Env {
  LINUXDO_CLIENT_ID: string
  LINUXDO_CLIENT_SECRET: string
  JWT_SECRET: string
}

// Linux Do Connect 用户信息结构
interface LinuxDoUser {
  id: number
  username: string
  name?: string
  avatar_url?: string
  trust_level?: number
  active?: boolean
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const { env, request } = context
  const url = new URL(request.url)
  const origin = url.origin
  const code = url.searchParams.get('code')
  const state = url.searchParams.get('state')
  const error = url.searchParams.get('error')

  const cookies = parseCookies(request.headers.get('Cookie'))
  const savedState = cookies['oauth_state']
  const redirectTo = cookies['oauth_redirect'] || '/dashboard'

  // 错误处理
  if (error || !code) {
    return Response.redirect(`${origin}/login?error=${encodeURIComponent(error || 'no_code')}`)
  }

  // 验证 state 防止 CSRF
  if (!state || state !== savedState) {
    return Response.redirect(`${origin}/login?error=invalid_state`)
  }

  const redirectUri = `${origin}/api/auth/callback`

  try {
    // 1. 用 code 换取 access_token
    const tokenRes = await fetch('https://connect.linux.do/oauth2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: env.LINUXDO_CLIENT_ID,
        client_secret: env.LINUXDO_CLIENT_SECRET,
        code,
        grant_type: 'authorization_code',
        redirect_uri: redirectUri,
      }),
    })

    if (!tokenRes.ok) {
      const errorText = await tokenRes.text()
      console.error('Token exchange failed:', errorText)
      return Response.redirect(`${origin}/login?error=token_failed`)
    }

    const tokenData = await tokenRes.json() as { access_token: string; token_type: string }

    // 2. 获取用户信息
    const userRes = await fetch('https://connect.linux.do/api/user', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    })

    if (!userRes.ok) {
      const errorText = await userRes.text()
      console.error('User info failed:', errorText)
      return Response.redirect(`${origin}/login?error=user_failed`)
    }

    const userData = await userRes.json() as LinuxDoUser

    // 检查用户是否被封禁
    if (userData.active === false) {
      return Response.redirect(`${origin}/login?error=banned`)
    }

    // 3. 生成 JWT
    const secret = new TextEncoder().encode(env.JWT_SECRET)
    const token = await new jose.SignJWT({
      id: String(userData.id),
      username: userData.username,
      nickname: userData.name || userData.username,
      avatarUrl: userData.avatar_url,
      trustLevel: userData.trust_level || 0,
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('7d')
      .sign(secret)

    // 4. 设置 cookie 并重定向
    const headers = new Headers()
    headers.set('Location', `${origin}${redirectTo}`)
    headers.append('Set-Cookie', serializeCookie('token', token, { httpOnly: true, path: '/', maxAge: 604800, sameSite: 'Lax' }))
    headers.append('Set-Cookie', serializeCookie('oauth_state', '', { httpOnly: true, path: '/', maxAge: 0 }))
    headers.append('Set-Cookie', serializeCookie('oauth_redirect', '', { httpOnly: true, path: '/', maxAge: 0 }))

    return new Response(null, { status: 302, headers })
  } catch (err) {
    console.error('OAuth callback error:', err)
    return Response.redirect(`${origin}/login?error=auth_failed`)
  }
}
