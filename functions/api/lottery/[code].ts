import { getCurrentUser } from '../../lib/auth'

interface Env {
  DB: D1Database
  JWT_SECRET: string
}

interface Lottery {
  id: string
  user_id: string
  short_code: string
  title: string
  status: string
}

interface Prize {
  id: string
  name: string
  prize_type: string
  content: string
  winner_count: number
  won_count: number
}

interface Participant {
  id: string
  username: string
  is_winner: number
  prize_content: string | null
  joined_at: number
}

// GET /api/lottery/:code - 获取抽奖详情
export const onRequestGet: PagesFunction<Env> = async (context) => {
  const { env, request, params } = context
  const code = params.code as string
  const user = await getCurrentUser(request, env.JWT_SECRET)

  const lottery = await env.DB.prepare(`SELECT * FROM lotteries WHERE short_code = ?`).bind(code).first<Lottery>()
  if (!lottery) {
    return Response.json({ success: false, error: '活动不存在' }, { status: 404 })
  }

  // 只有创建者可以看到完整信息
  if (user?.id !== lottery.user_id) {
    return Response.json({ success: false, error: '无权限' }, { status: 403 })
  }

  const prizes = await env.DB.prepare(`
    SELECT * FROM lottery_prizes WHERE lottery_id = ? ORDER BY sort_order
  `).bind(lottery.id).all<Prize>()

  const participants = await env.DB.prepare(`
    SELECT * FROM lottery_participants WHERE lottery_id = ? ORDER BY joined_at DESC
  `).bind(lottery.id).all<Participant>()

  return Response.json({
    success: true,
    data: {
      lottery: {
        ...lottery,
        prizes: prizes.results || [],
        participants: participants.results || [],
      },
    },
  })
}

// DELETE /api/lottery/:code - 删除抽奖
export const onRequestDelete: PagesFunction<Env> = async (context) => {
  const { env, request, params } = context
  const code = params.code as string
  const user = await getCurrentUser(request, env.JWT_SECRET)
  if (!user) {
    return Response.json({ success: false, error: '请先登录' }, { status: 401 })
  }

  const lottery = await env.DB.prepare(`SELECT id, user_id FROM lotteries WHERE short_code = ?`).bind(code).first<{ id: string; user_id: string }>()
  if (!lottery) {
    return Response.json({ success: false, error: '活动不存在' }, { status: 404 })
  }
  if (lottery.user_id !== user.id) {
    return Response.json({ success: false, error: '无权限' }, { status: 403 })
  }

  await env.DB.prepare(`DELETE FROM lottery_participants WHERE lottery_id = ?`).bind(lottery.id).run()
  await env.DB.prepare(`DELETE FROM lottery_prizes WHERE lottery_id = ?`).bind(lottery.id).run()
  await env.DB.prepare(`DELETE FROM lotteries WHERE id = ?`).bind(lottery.id).run()

  return Response.json({ success: true })
}
