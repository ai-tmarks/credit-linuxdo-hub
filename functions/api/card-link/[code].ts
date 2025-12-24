import { getCurrentUser } from '../../lib/auth'

interface Env {
  DB: D1Database
  JWT_SECRET: string
}

interface CardLink {
  id: string
  user_id: string
  username: string
  short_code: string
  title: string
  description: string | null
  price: number
  total_stock: number
  sold_count: number
  per_user_limit: number
  min_trust_level: number
  card_mode: string
  cards_per_order: number
  is_active: number
}

interface Card {
  id: string
  content: string
  status: string
  buyer_id: string | null
  buyer_username: string | null
  sold_at: number | null
}

// GET /api/card-link/:code - 获取发卡链接详情
export const onRequestGet: PagesFunction<Env> = async (context) => {
  const { env, request, params } = context
  const code = params.code as string

  const link = await env.DB.prepare(`
    SELECT * FROM card_links WHERE short_code = ?
  `).bind(code).first<CardLink>()

  if (!link) {
    return Response.json({ success: false, error: '链接不存在' }, { status: 404 })
  }

  const user = await getCurrentUser(request, env.JWT_SECRET)

  // 检查是否是创建者（管理员视角）
  const isOwner = user?.id === link.user_id

  // 如果是创建者，返回卡密列表
  let cards: Card[] = []
  if (isOwner) {
    const cardsResult = await env.DB.prepare(`
      SELECT id, content, status, buyer_id, buyer_username, sold_at 
      FROM cards WHERE link_id = ? ORDER BY created_at ASC
    `).bind(link.id).all<Card>()
    cards = cardsResult.results || []
  }

  // 检查当前用户已购买数量
  let userPurchaseCount = 0
  if (user) {
    const countResult = await env.DB.prepare(`
      SELECT COUNT(*) as count FROM card_orders 
      WHERE link_id = ? AND buyer_id = ? AND status = 'paid'
    `).bind(link.id, user.id).first<{ count: number }>()
    userPurchaseCount = countResult?.count || 0
  }

  // 计算剩余库存
  const remainingStock = link.total_stock - link.sold_count
  const isOneToMany = link.card_mode === 'one_to_many'
  // 一对多模式：total_stock=0 表示不限
  const hasUnlimitedStock = isOneToMany && link.total_stock <= 0

  // 检查是否可购买
  let canBuy = true
  let cantBuyReason = ''

  if (!link.is_active) {
    canBuy = false
    cantBuyReason = '该商品已下架'
  } else if (isOneToMany && link.total_stock > 0 && link.sold_count >= link.total_stock) {
    // 一对多有限制且已达上限
    canBuy = false
    cantBuyReason = '已售罄'
  } else if (!isOneToMany && remainingStock <= 0) {
    canBuy = false
    cantBuyReason = '已售罄'
  } else if (user && link.per_user_limit > 0 && userPurchaseCount >= link.per_user_limit) {
    canBuy = false
    cantBuyReason = `每人限购 ${link.per_user_limit} 个`
  } else if (user && link.min_trust_level > 0 && user.trustLevel < link.min_trust_level) {
    canBuy = false
    cantBuyReason = `需要信任等级 ${link.min_trust_level} 以上`
  }

  return Response.json({
    success: true,
    data: {
      link: {
        ...link,
        remaining_stock: hasUnlimitedStock ? -1 : remainingStock,
      },
      cards: isOwner ? cards : [],
      is_owner: isOwner,
      can_buy: canBuy,
      cant_buy_reason: cantBuyReason,
      user_purchase_count: userPurchaseCount,
      current_user: user ? { id: user.id, username: user.username, trustLevel: user.trustLevel } : null,
    },
  })
}

// DELETE /api/card-link/:code - 删除发卡链接
export const onRequestDelete: PagesFunction<Env> = async (context) => {
  const { env, request, params } = context
  const code = params.code as string

  const user = await getCurrentUser(request, env.JWT_SECRET)
  if (!user) {
    return Response.json({ success: false, error: '请先登录' }, { status: 401 })
  }

  const link = await env.DB.prepare(`
    SELECT id, user_id FROM card_links WHERE short_code = ?
  `).bind(code).first<{ id: string; user_id: string }>()

  if (!link) {
    return Response.json({ success: false, error: '链接不存在' }, { status: 404 })
  }

  if (link.user_id !== user.id) {
    return Response.json({ success: false, error: '无权限' }, { status: 403 })
  }

  // 删除卡密
  await env.DB.prepare(`DELETE FROM cards WHERE link_id = ?`).bind(link.id).run()
  // 删除链接
  await env.DB.prepare(`DELETE FROM card_links WHERE id = ?`).bind(link.id).run()

  return Response.json({ success: true })
}
