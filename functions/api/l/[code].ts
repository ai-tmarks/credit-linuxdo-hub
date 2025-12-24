import { getCurrentUser } from '../../lib/auth'

interface Env {
  DB: D1Database
  JWT_SECRET: string
}

interface Lottery {
  id: string
  title: string
  description: string | null
  join_type: string
  join_price: number
  draw_type: string
  draw_time: number | null
  draw_count: number | null
  max_participants: number
  min_trust_level: number
  participant_count: number
  status: string
}

interface Prize {
  id: string
  name: string
  prize_type: string
  winner_count: number
  won_count: number
}

interface Participant {
  id: string
  user_id: string
  username: string
  is_winner: number
  prize_content: string | null
}

// GET /api/l/:code - 获取抽奖页面数据
export const onRequestGet: PagesFunction<Env> = async (context) => {
  const { env, request, params } = context
  const code = params.code as string
  const user = await getCurrentUser(request, env.JWT_SECRET)

  const lottery = await env.DB.prepare(`SELECT * FROM lotteries WHERE short_code = ?`).bind(code).first<Lottery>()
  if (!lottery) {
    return Response.json({ success: false, error: '活动不存在' }, { status: 404 })
  }

  const prizes = await env.DB.prepare(`
    SELECT id, name, prize_type, winner_count, won_count FROM lottery_prizes WHERE lottery_id = ? ORDER BY sort_order
  `).bind(lottery.id).all<Prize>()

  const participants = await env.DB.prepare(`
    SELECT id, user_id, username, is_winner, prize_content FROM lottery_participants WHERE lottery_id = ? ORDER BY joined_at DESC LIMIT 100
  `).bind(lottery.id).all<Participant>()

  // 检查当前用户是否已参与
  let userJoined = false
  let userWon = false
  let userPrize: string | null = null

  if (user) {
    const userParticipant = await env.DB.prepare(`
      SELECT is_winner, prize_content FROM lottery_participants WHERE lottery_id = ? AND user_id = ?
    `).bind(lottery.id, user.id).first<{ is_winner: number; prize_content: string | null }>()

    if (userParticipant) {
      userJoined = true
      userWon = userParticipant.is_winner === 1
      userPrize = userParticipant.prize_content
    }
  }

  return Response.json({
    success: true,
    logged_in: !!user,
    data: {
      id: lottery.id,
      title: lottery.title,
      description: lottery.description,
      join_type: lottery.join_type,
      join_price: lottery.join_price,
      draw_type: lottery.draw_type,
      draw_time: lottery.draw_time,
      draw_count: lottery.draw_count,
      max_participants: lottery.max_participants,
      min_trust_level: lottery.min_trust_level,
      participant_count: lottery.participant_count,
      status: lottery.status,
      prizes: prizes.results || [],
      participants: (participants.results || []).map((p) => ({
        id: p.id,
        username: p.username,
        is_winner: p.is_winner,
        prize_content: p.user_id === user?.id ? p.prize_content : null,
      })),
      user_joined: userJoined,
      user_won: userWon,
      user_prize: userPrize,
    },
  })
}
