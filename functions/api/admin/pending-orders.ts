import { getCurrentUser } from '../../lib/auth'

interface Env {
  DB: D1Database
  JWT_SECRET: string
}

interface PendingOrder {
  id: string
  out_trade_no: string
  buyer_username: string
  amount: number
  created_at: number
  link_title: string
  link_code: string
}

// GET /api/admin/pending-orders - 获取待处理订单列表
export const onRequestGet: PagesFunction<Env> = async (context) => {
  const { env, request } = context
  const user = await getCurrentUser(request, env.JWT_SECRET)
  if (!user) {
    return Response.json({ success: false, error: '请先登录' }, { status: 401 })
  }

  const url = new URL(request.url)
  const showAll = url.searchParams.get('all') === '1'

  const statusFilter = showAll ? '' : "AND o.status = 'pending'"

  const orders = await env.DB.prepare(`
    SELECT o.id, o.out_trade_no, o.buyer_username, o.amount, o.created_at, o.status,
           l.title as link_title, l.short_code as link_code
    FROM card_orders o
    JOIN card_links l ON o.link_id = l.id
    WHERE l.user_id = ? ${statusFilter}
    ORDER BY o.created_at DESC
    LIMIT 100
  `).bind(user.id).all<PendingOrder & { status: string }>()

  return Response.json({ success: true, data: { orders: orders.results || [] } })
}

// POST /api/admin/pending-orders - 处理指定订单
export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { env, request } = context
  const user = await getCurrentUser(request, env.JWT_SECRET)
  if (!user) {
    return Response.json({ success: false, error: '请先登录' }, { status: 401 })
  }

  const body = (await request.json()) as { order_id: string }
  if (!body.order_id) {
    return Response.json({ success: false, error: '缺少订单ID' }, { status: 400 })
  }

  // 验证订单属于当前用户
  const order = await env.DB.prepare(`
    SELECT o.*, l.card_mode, l.cards_per_order
    FROM card_orders o
    JOIN card_links l ON o.link_id = l.id
    WHERE o.id = ? AND l.user_id = ? AND o.status = 'pending'
  `).bind(body.order_id, user.id).first<{
    id: string; link_id: string; out_trade_no: string
    buyer_id: string; buyer_username: string
    card_mode: string; cards_per_order: number
  }>()

  if (!order) {
    return Response.json({ success: false, error: '订单不存在或无权限' }, { status: 404 })
  }

  // 解析数量
  const match = order.out_trade_no.match(/^CARD_([^_]+)_(\d+)_/)
  const quantity = match ? parseInt(match[2]) || 1 : 1

  const now = Math.floor(Date.now() / 1000)
  const cardIds: string[] = []

  // 发放卡密
  if (order.card_mode === 'one_to_many') {
    const card = await env.DB.prepare(`SELECT id FROM cards WHERE link_id = ? LIMIT 1`).bind(order.link_id).first<{ id: string }>()
    if (card) for (let i = 0; i < quantity; i++) cardIds.push(card.id)
  } else {
    const total = order.card_mode === 'multi' ? (order.cards_per_order || 1) * quantity : quantity
    for (let i = 0; i < total; i++) {
      const card = await env.DB.prepare(`SELECT id FROM cards WHERE link_id = ? AND status = 'available' LIMIT 1`).bind(order.link_id).first<{ id: string }>()
      if (!card) break
      await env.DB.prepare(`UPDATE cards SET status = 'sold', sold_at = ?, order_no = ?, buyer_id = ?, buyer_username = ? WHERE id = ?`)
        .bind(now, order.out_trade_no, order.buyer_id, order.buyer_username, card.id).run()
      cardIds.push(card.id)
    }
  }

  if (cardIds.length === 0 && order.card_mode !== 'one_to_many') {
    return Response.json({ success: false, error: '没有可用卡密' }, { status: 400 })
  }

  await env.DB.prepare(`UPDATE card_orders SET card_id = ?, status = 'paid', paid_at = ? WHERE id = ?`)
    .bind(cardIds.join(','), now, order.id).run()

  return Response.json({ success: true, data: { cards_count: cardIds.length } })
}

// DELETE /api/admin/pending-orders - 删除订单
export const onRequestDelete: PagesFunction<Env> = async (context) => {
  const { env, request } = context
  const user = await getCurrentUser(request, env.JWT_SECRET)
  if (!user) {
    return Response.json({ success: false, error: '请先登录' }, { status: 401 })
  }

  const url = new URL(request.url)
  const orderId = url.searchParams.get('id')
  if (!orderId) {
    return Response.json({ success: false, error: '缺少订单ID' }, { status: 400 })
  }

  const result = await env.DB.prepare(`
    DELETE FROM card_orders WHERE id = ? AND status = 'pending'
    AND link_id IN (SELECT id FROM card_links WHERE user_id = ?)
  `).bind(orderId, user.id).run()

  if (!result.meta.changes) {
    return Response.json({ success: false, error: '订单不存在或无权限' }, { status: 404 })
  }

  return Response.json({ success: true })
}
