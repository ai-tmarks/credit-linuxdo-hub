import { serializeCookie } from '../../lib/cookies'

interface Env {
  LINUXDO_CLIENT_ID: string
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const { env, request } = context
  const url = new URL(request.url)
  const origin = url.origin
  const redirect = url.searchParams.get('redirect') || '/dashboard'
  const state = crypto.randomUUID()

  // Linux Do Connect OAuth2 参数
  const redirectUri = `${origin}/api/auth/callback`
  const params = new URLSearchParams({
    client_id: env.LINUXDO_CLIENT_ID,
    redirect_uri: redirectUri,
    response_type: 'code',
    state,
  })

  const headers = new Headers()
  headers.set('Location', `https://connect.linux.do/oauth2/authorize?${params}`)
  headers.append('Set-Cookie', serializeCookie('oauth_state', state, { httpOnly: true, path: '/', maxAge: 600, sameSite: 'Lax' }))
  headers.append('Set-Cookie', serializeCookie('oauth_redirect', redirect, { httpOnly: true, path: '/', maxAge: 600, sameSite: 'Lax' }))

  return new Response(null, { status: 302, headers })
}
