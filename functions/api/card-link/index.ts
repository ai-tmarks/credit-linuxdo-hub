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
  created_at: number
}

// GET /api/card-link - 获取发卡链接列表
export const onRequestGet: PagesFunction<Env> = async (context) => {
  const { env, request } = context

  const user = await getCurrentUser(request, env.JWT_SECRET)
  if (!user) {
    return Response.json({ success: false, error: '请先登录' }, { status: 401 })
  }

  const links = await env.DB.prepare(`
    SELECT * FROM card_links WHERE user_id = ? ORDER BY created_at DESC
  `).bind(user.id).all<CardLink>()

  return Response.json({
    success: true,
    data: { links: links.results || [] },
  })
}

// POST /api/card-link - 创建发卡链接
export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { env, request } = context

  const user = await getCurrentUser(request, env.JWT_SECRET)
  if (!user) {
    return Response.json({ success: false, error: '请先登录' }, { status: 401 })
  }

  const body = await request.json() as {
    title: string
    description?: string
    price: number
    cards: string[]
    per_user_limit?: number
    min_trust_level?: number
    card_mode?: 'one_to_one' | 'one_to_many' | 'multi'
    cards_per_order?: number
    max_sales?: number // 一对多模式的最大销售次数
  }

  // 验证参数
  if (!body.title?.trim()) {
    return Response.json({ success: false, error: '请输入商品标题' }, { status: 400 })
  }
  if (!body.price || body.price <= 0) {
    return Response.json({ success: false, error: '价格必须大于0' }, { status: 400 })
  }
  if (!body.cards || body.cards.length === 0) {
    return Response.json({ success: false, error: '请添加至少一个卡密' }, { status: 400 })
  }

  const cardMode = body.card_mode || 'one_to_one'
  const cardsPerOrder = body.cards_per_order || 1
  const maxSales = body.max_sales || 0

  // 验证多对多模式
  if (cardMode === 'multi' && cardsPerOrder > body.cards.length) {
    return Response.json({ success: false, error: '每单发放数量不能超过卡密总数' }, { status: 400 })
  }

  // 计算库存
  let totalStock: number
  if (cardMode === 'one_to_one') {
    // 一对一：库存 = 卡密数量
    totalStock = body.cards.length
  } else if (cardMode === 'one_to_many') {
    // 一对多：使用 max_sales 作为库存，0 表示不限
    totalStock = maxSales > 0 ? maxSales : 0
  } else {
    // 多对多：库存 = 卡密数量 / 每单数量
    totalStock = Math.floor(body.cards.length / cardsPerOrder)
  }

  const id = crypto.randomUUID()
  const shortCode = generateShortCode()

  // 创建发卡链接
  await env.DB.prepare(`
    INSERT INTO card_links (id, user_id, username, short_code, title, description, price, total_stock, per_user_limit, min_trust_level, card_mode, cards_per_order)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    id,
    user.id,
    user.username,
    shortCode,
    body.title.trim(),
    body.description?.trim() || null,
    body.price,
    totalStock,
    body.per_user_limit || 0,
    body.min_trust_level || 0,
    cardMode,
    cardsPerOrder
  ).run()

  // 批量插入卡密
  for (const content of body.cards) {
    if (content.trim()) {
      await env.DB.prepare(`
        INSERT INTO cards (id, link_id, content) VALUES (?, ?, ?)
      `).bind(crypto.randomUUID(), id, content.trim()).run()
    }
  }

  return Response.json({
    success: true,
    data: { id, short_code: shortCode, card_mode: cardMode },
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
