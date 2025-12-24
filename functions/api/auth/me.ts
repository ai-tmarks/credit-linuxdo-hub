import * as jose from 'jose'
import { parseCookies } from '../../lib/cookies'

interface Env {
  JWT_SECRET: string
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const { env, request } = context
  const cookies = parseCookies(request.headers.get('Cookie'))
  const token = cookies['token']

  if (!token) {
    return Response.json({ user: null }, { status: 401 })
  }

  try {
    const secret = new TextEncoder().encode(env.JWT_SECRET)
    const { payload } = await jose.jwtVerify(token, secret)

    return Response.json({
      user: {
        id: payload.id,
        username: payload.username,
        nickname: payload.nickname,
        avatarUrl: payload.avatarUrl,
        trustLevel: payload.trustLevel,
      },
    })
  } catch {
    return Response.json({ user: null }, { status: 401 })
  }
}
