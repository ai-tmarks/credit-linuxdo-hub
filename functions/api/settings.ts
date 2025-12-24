import * as jose from 'jose'
import { parseCookies } from '../lib/cookies'

interface Env {
  DB: D1Database
  JWT_SECRET: string
}

async function getCurrentUser(request: Request, env: Env) {
  const cookies = parseCookies(request.headers.get('Cookie'))
  const token = cookies['token']
  if (!token) return null

  try {
    const secret = new TextEncoder().encode(env.JWT_SECRET)
    const { payload } = await jose.jwtVerify(token, secret)
    return payload as { id: string; username: string }
  } catch {
    return null
  }
}

// GET /api/settings
export const onRequestGet: PagesFunction<Env> = async (context) => {
  const { env, request } = context
  const user = await getCurrentUser(request, env)

  if (!user) {
    return Response.json({ success: false, error: '未登录' }, { status: 401 })
  }

  const result = await env.DB.prepare(
    'SELECT epay_pid, epay_key FROM user_settings WHERE user_id = ?'
  ).bind(user.id).first()

  return Response.json({
    success: true,
    data: result || { epay_pid: '', epay_key: '' },
  })
}

// POST /api/settings
export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { env, request } = context
  const user = await getCurrentUser(request, env)

  if (!user) {
    return Response.json({ success: false, error: '未登录' }, { status: 401 })
  }

  const body = await request.json() as { epay_pid?: string; epay_key?: string }
  const epayPid = body.epay_pid?.trim() || ''
  const epayKey = body.epay_key?.trim() || ''

  await env.DB.prepare(`
    INSERT INTO user_settings (user_id, epay_pid, epay_key, updated_at)
    VALUES (?, ?, ?, unixepoch())
    ON CONFLICT(user_id) DO UPDATE SET
      epay_pid = excluded.epay_pid,
      epay_key = excluded.epay_key,
      updated_at = unixepoch()
  `).bind(user.id, epayPid, epayKey).run()

  return Response.json({ success: true })
}
