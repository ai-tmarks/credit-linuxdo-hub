import { getCurrentUser } from '../../lib/auth'

interface Env {
  DB: D1Database
  JWT_SECRET: string
}

interface Lottery {
  id: string
  user_id: string
  username: string
  short_code: string
  title: string
  description: string | null
  join_type: string
  join_price: number
  draw_type: string
  draw_time: number | null
  draw_count: number | null
  max_participants: number
  per_user_limit: number
  participant_count: number
  status: string
  created_at: number
}

// GET /api/lottery - 获取抽奖列表
export const onRequestGet: PagesFunction<Env> = async (context) => {
  const { env, request } = context
  const user = await getCurrentUser(request, env.JWT_SECRET)
  if (!user) {
    return Response.json({ success: false, error: '请先登录' }, { status: 401 })
  }

  const lotteries = await env.DB.prepare(`
    SELECT * FROM lotteries WHERE user_id = ? ORDER BY created_at DESC
  `).bind(user.id).all<Lottery>()

  return Response.json({ success: true, data: { lotteries: lotteries.results || [] } })
}

// POST /api/lottery - 创建抽奖
export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { env, request } = context
  const user = await getCurrentUser(request, env.JWT_SECRET)
  if (!user) {
    return Response.json({ success: false, error: '请先登录' }, { status: 401 })
  }

  const body = (await request.json()) as {
    title: string
    description?: string
    join_type: string
    join_price?: number
    draw_type: string
    draw_time?: number
    draw_count?: number
    max_participants?: number
    per_user_limit?: number
    min_trust_level?: number
    prizes: Array<{ name: string; prize_type: string; content: string; winner_count: number }>
  }

  if (!body.title?.trim()) {
    return Response.json({ success: false, error: '请输入活动标题' }, { status: 400 })
  }
  if (!body.prizes || body.prizes.length === 0) {
    return Response.json({ success: false, error: '请添加奖品' }, { status: 400 })
  }

  const id = crypto.randomUUID()
  const shortCode = generateShortCode()

  await env.DB.prepare(`
    INSERT INTO lotteries (id, user_id, username, short_code, title, description, join_type, join_price, draw_type, draw_time, draw_count, max_participants, per_user_limit, min_trust_level)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    id,
    user.id,
    user.username,
    shortCode,
    body.title.trim(),
    body.description?.trim() || null,
    body.join_type || 'free',
    body.join_price || 0,
    body.draw_type || 'manual',
    body.draw_time || null,
    body.draw_count || null,
    body.max_participants || 0,
    body.per_user_limit || 1,
    body.min_trust_level || 0
  ).run()

  // 插入奖品
  for (let i = 0; i < body.prizes.length; i++) {
    const prize = body.prizes[i]
    await env.DB.prepare(`
      INSERT INTO lottery_prizes (id, lottery_id, name, prize_type, content, winner_count, sort_order)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).bind(crypto.randomUUID(), id, prize.name, prize.prize_type, prize.content, prize.winner_count, i).run()
  }

  return Response.json({ success: true, data: { id, short_code: shortCode } })
}

function generateShortCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789'
  let code = ''
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return code
}
