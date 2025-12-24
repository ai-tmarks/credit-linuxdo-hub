import { getCurrentUser } from '../../../lib/auth'

interface Env {
  DB: D1Database
  JWT_SECRET: string
}

interface Lottery {
  id: string
  user_id: string
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
  user_id: string
  username: string
}

// POST /api/lottery/:code/draw - 开奖
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
  if (lottery.user_id !== user.id) {
    return Response.json({ success: false, error: '无权限' }, { status: 403 })
  }
  if (lottery.status !== 'active') {
    return Response.json({ success: false, error: '活动已结束' }, { status: 400 })
  }

  // 获取所有参与者
  const participantsResult = await env.DB.prepare(`
    SELECT * FROM lottery_participants WHERE lottery_id = ? AND is_winner = 0
  `).bind(lottery.id).all<Participant>()
  const participants = participantsResult.results || []

  if (participants.length === 0) {
    return Response.json({ success: false, error: '暂无参与者' }, { status: 400 })
  }

  // 获取奖品
  const prizesResult = await env.DB.prepare(`
    SELECT * FROM lottery_prizes WHERE lottery_id = ? ORDER BY sort_order
  `).bind(lottery.id).all<Prize>()
  const prizes = prizesResult.results || []

  // 随机打乱参与者
  const shuffled = [...participants].sort(() => Math.random() - 0.5)
  const now = Math.floor(Date.now() / 1000)
  let winnerIndex = 0

  // 为每个奖品分配中奖者
  for (const prize of prizes) {
    const winnersNeeded = prize.winner_count - prize.won_count
    const contents = prize.content.split('\n').filter((c) => c.trim())

    for (let i = 0; i < winnersNeeded && winnerIndex < shuffled.length; i++) {
      const winner = shuffled[winnerIndex++]
      const prizeContent = prize.prize_type === 'card' ? contents[i % contents.length] || contents[0] : prize.content

      // 更新参与者为中奖
      await env.DB.prepare(`
        UPDATE lottery_participants SET is_winner = 1, prize_id = ?, prize_content = ?, won_at = ? WHERE id = ?
      `).bind(prize.id, prizeContent, now, winner.id).run()

      // 更新奖品已中奖数
      await env.DB.prepare(`
        UPDATE lottery_prizes SET won_count = won_count + 1 WHERE id = ?
      `).bind(prize.id).run()
    }
  }

  // 更新活动状态
  await env.DB.prepare(`
    UPDATE lotteries SET status = 'drawn', updated_at = ? WHERE id = ?
  `).bind(now, lottery.id).run()

  return Response.json({ success: true })
}
