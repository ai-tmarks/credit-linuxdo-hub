import { getCurrentUser } from '../../../lib/auth'

interface Env {
  DB: D1Database
  JWT_SECRET: string
}

interface Lottery {
  id: string
  join_type: string
  join_price: number
  draw_type: string
  draw_count: number | null
  max_participants: number
  per_user_limit: number
  min_trust_level: number
  participant_count: number
  status: string
}

// POST /api/l/:code/join - 参与抽奖
export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { env, request, params } = context
  const code = params.code as string
  const user = await getCurrentUser(request, env.JWT_SECRET)
  if (!user) {
    return Response.json({ success: false, error: '请先登录' }, { status: 401 })
  }

  const lottery = await env.DB.prepare(`SELECT * FROM lotteries WHERE short_code = ?`).bind(code).first<Lottery>()
  if (!lottery) {
    return Response.json({ success: false, error: '活动不存在' }, { status: 404 })
  }
  if (lottery.status !== 'active') {
    return Response.json({ success: false, error: '活动已结束' }, { status: 400 })
  }

  // 检查信任等级
  if (lottery.min_trust_level > 0 && user.trustLevel < lottery.min_trust_level) {
    return Response.json({ success: false, error: `需要信任等级 ${lottery.min_trust_level} 以上` }, { status: 400 })
  }

  // 检查是否已达最大参与人数
  if (lottery.max_participants > 0 && lottery.participant_count >= lottery.max_participants) {
    return Response.json({ success: false, error: '参与人数已满' }, { status: 400 })
  }

  // 检查用户参与次数（使用唯一索引防止并发重复）
  const userCount = await env.DB.prepare(`
    SELECT COUNT(*) as count FROM lottery_participants WHERE lottery_id = ? AND user_id = ?
  `).bind(lottery.id, user.id).first<{ count: number }>()

  if (userCount && userCount.count >= lottery.per_user_limit) {
    return Response.json({ success: false, error: '已达参与上限' }, { status: 400 })
  }

  // TODO: 付费参与需要扣除积分

  const now = Math.floor(Date.now() / 1000)

  // 添加参与记录（使用 INSERT OR IGNORE 防止并发重复插入）
  try {
    await env.DB.prepare(`
      INSERT INTO lottery_participants (id, lottery_id, user_id, username, joined_at)
      VALUES (?, ?, ?, ?, ?)
    `).bind(crypto.randomUUID(), lottery.id, user.id, user.username, now).run()
  } catch (e) {
    // 唯一索引冲突，说明已经参与过
    return Response.json({ success: false, error: '您已参与过此活动' }, { status: 400 })
  }

  // 更新参与人数
  await env.DB.prepare(`
    UPDATE lotteries SET participant_count = participant_count + 1, updated_at = ? WHERE id = ?
  `).bind(now, lottery.id).run()

  // 检查是否满足人满开奖条件
  if (lottery.draw_type === 'count' && lottery.draw_count) {
    const newCount = lottery.participant_count + 1
    if (newCount >= lottery.draw_count) {
      // 触发自动开奖
      await triggerDraw(env, lottery.id)
    }
  }

  return Response.json({ success: true })
}

async function triggerDraw(env: Env, lotteryId: string) {
  // 获取所有参与者
  const participantsResult = await env.DB.prepare(`
    SELECT * FROM lottery_participants WHERE lottery_id = ? AND is_winner = 0
  `).bind(lotteryId).all<{ id: string; user_id: string; username: string }>()
  const participants = participantsResult.results || []

  if (participants.length === 0) return

  // 获取奖品
  const prizesResult = await env.DB.prepare(`
    SELECT * FROM lottery_prizes WHERE lottery_id = ? ORDER BY sort_order
  `).bind(lotteryId).all<{ id: string; prize_type: string; content: string; winner_count: number; won_count: number }>()
  const prizes = prizesResult.results || []

  // 随机打乱参与者
  const shuffled = [...participants].sort(() => Math.random() - 0.5)
  const now = Math.floor(Date.now() / 1000)
  let winnerIndex = 0

  for (const prize of prizes) {
    const winnersNeeded = prize.winner_count - prize.won_count
    const contents = prize.content.split('\n').filter((c) => c.trim())

    for (let i = 0; i < winnersNeeded && winnerIndex < shuffled.length; i++) {
      const winner = shuffled[winnerIndex++]
      const prizeContent = prize.prize_type === 'card' ? contents[i % contents.length] || contents[0] : prize.content

      await env.DB.prepare(`
        UPDATE lottery_participants SET is_winner = 1, prize_id = ?, prize_content = ?, won_at = ? WHERE id = ?
      `).bind(prize.id, prizeContent, now, winner.id).run()

      await env.DB.prepare(`
        UPDATE lottery_prizes SET won_count = won_count + 1 WHERE id = ?
      `).bind(prize.id).run()
    }
  }

  await env.DB.prepare(`
    UPDATE lotteries SET status = 'drawn', updated_at = ? WHERE id = ?
  `).bind(now, lotteryId).run()
}
