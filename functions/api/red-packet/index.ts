import { getCurrentUser } from '../../lib/auth'

interface Env {
  DB: D1Database
  JWT_SECRET: string
  CREDIT_USER_ID?: string
}

interface RedPacket {
  id: string
  short_code: string
  total_amount: number
  remaining_amount: number
  total_count: number
  remaining_count: number
  type: string
  message: string | null
  status: string
  expires_at: number
  created_at: number
}

// GET /api/red-packet - 获取红包列表
export const onRequestGet: PagesFunction<Env> = async (context) => {
  const { env, request } = context

  // 验证是否是部署者（可选：只有部署者能看列表）
  const user = await getCurrentUser(request, env.JWT_SECRET)
  if (!user) {
    return Response.json({ success: false, error: '请先登录' }, { status: 401 })
  }

  // 只有部署者能看所有红包
  if (env.CREDIT_USER_ID && user.id !== env.CREDIT_USER_ID) {
    return Response.json({ success: false, error: '无权限' }, { status: 403 })
  }

  const packets = await env.DB.prepare(`
    SELECT * FROM red_packets ORDER BY created_at DESC LIMIT 50
  `).all<RedPacket>()

  return Response.json({
    success: true,
    data: { packets: packets.results || [] },
  })
}

// POST /api/red-packet - 创建红包
export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { env, request } = context

  // 验证是否是部署者
  const user = await getCurrentUser(request, env.JWT_SECRET)
  if (!user) {
    return Response.json({ success: false, error: '请先登录' }, { status: 401 })
  }

  if (env.CREDIT_USER_ID && user.id !== env.CREDIT_USER_ID) {
    return Response.json({ success: false, error: '只有部署者能创建红包' }, { status: 403 })
  }

  const body = await request.json() as {
    total_amount: number
    total_count: number
    type?: 'random' | 'fixed'
    message?: string
    expires_hours?: number
  }

  // 验证参数
  if (!body.total_amount || body.total_amount <= 0) {
    return Response.json({ success: false, error: '金额必须大于0' }, { status: 400 })
  }
  if (!body.total_count || body.total_count <= 0 || body.total_count > 100) {
    return Response.json({ success: false, error: '人数必须在1-100之间' }, { status: 400 })
  }

  const id = crypto.randomUUID()
  const shortCode = generateShortCode()
  const expiresHours = body.expires_hours || 24
  const expiresAt = Math.floor(Date.now() / 1000) + expiresHours * 3600

  await env.DB.prepare(`
    INSERT INTO red_packets (id, short_code, total_amount, remaining_amount, total_count, remaining_count, type, message, status, expires_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?)
  `).bind(
    id,
    shortCode,
    body.total_amount,
    body.total_amount,
    body.total_count,
    body.total_count,
    body.type || 'random',
    body.message || null,
    expiresAt
  ).run()

  return Response.json({
    success: true,
    data: {
      id,
      short_code: shortCode,
      total_amount: body.total_amount,
      total_count: body.total_count,
    },
  })
}

function generateShortCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789'
  let code = ''
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return code
}
