import { getCurrentUser } from '../../lib/auth'

interface Env {
  DB: D1Database
  JWT_SECRET: string
}

interface CardOrder {
  id: string
  card_id: string
  amount: number
  status: string
  paid_at: number
  link_title: string
  link_code: string
}

interface LotteryRecord {
  id: string
  is_winner: number
  prize_content: string | null
  joined_at: number
  won_at: number | null
  lottery_title: string
  lottery_code: string
  lottery_status: string
}

// GET /api/my/orders - 获取我的购买记录
export const onRequestGet: PagesFunction<Env> = async (context) => {
  const { env, request } = context
  const user = await getCurrentUser(request, env.JWT_SECRET)
  if (!user) {
    return Response.json({ success: false, error: '请先登录' }, { status: 401 })
  }

  // 获取发卡订单
  const cardOrders = await env.DB.prepare(`
    SELECT 
      o.id, o.card_id, o.amount, o.status, o.paid_at,
      l.title as link_title, l.short_code as link_code
    FROM card_orders o
    JOIN card_links l ON o.link_id = l.id
    WHERE o.buyer_id = ? AND o.status = 'paid'
    ORDER BY o.paid_at DESC
    LIMIT 50
  `).bind(user.id).all<CardOrder>()

  // 获取卡密内容
  const ordersWithCards = []
  for (const order of cardOrders.results || []) {
    const cardIds = order.card_id.split(',').filter(Boolean)
    const cards: string[] = []
    for (const cardId of cardIds) {
      const card = await env.DB.prepare(`SELECT content FROM cards WHERE id = ?`).bind(cardId).first<{ content: string }>()
      if (card) cards.push(card.content)
    }
    ordersWithCards.push({ ...order, cards })
  }

  // 获取抽奖记录
  const lotteryRecords = await env.DB.prepare(`
    SELECT 
      p.id, p.is_winner, p.prize_content, p.joined_at, p.won_at,
      l.title as lottery_title, l.short_code as lottery_code, l.status as lottery_status
    FROM lottery_participants p
    JOIN lotteries l ON p.lottery_id = l.id
    WHERE p.user_id = ?
    ORDER BY p.joined_at DESC
    LIMIT 50
  `).bind(user.id).all<LotteryRecord>()

  return Response.json({
    success: true,
    data: {
      card_orders: ordersWithCards,
      lottery_records: lotteryRecords.results || [],
    },
  })
}
