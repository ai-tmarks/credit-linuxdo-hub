import { verifySign } from '../../lib/credit'

interface Env {
  DB: D1Database
}

interface CardLink {
  id: string
  user_id: string
  total_stock: number
  sold_count: number
  card_mode: string
  cards_per_order: number
}

/**
 * 发卡支付回调
 * 支付成功后自动发放卡密
 * 订单号格式: CARD_{code}_{quantity}_{timestamp}
 */
export const onRequestGet: PagesFunction<Env> = async (context) => {
  const { env, request } = context
  const url = new URL(request.url)

  // 获取回调参数
  const params: Record<string, string> = {}
  url.searchParams.forEach((value, key) => {
    params[key] = value
  })

  console.log('Card callback:', params)

  // 验证交易状态
  if (params.trade_status !== 'TRADE_SUCCESS') {
    return new Response('invalid status', { status: 400 })
  }

  const outTradeNo = params.out_trade_no
  const tradeNo = params.trade_no
  const money = parseFloat(params.money || '0')

  // 从订单号解析链接 code 和数量: CARD_{code}_{quantity}_{timestamp}
  const match = outTradeNo?.match(/^CARD_([^_]+)_(\d+)_/)
  if (!match) {
    console.error('Invalid out_trade_no format:', outTradeNo)
    return new Response('success')
  }

  const linkCode = match[1]
  const quantity = parseInt(match[2]) || 1

  // 检查是否已处理过（防止重复回调）
  const existingOrder = await env.DB.prepare(
    'SELECT id FROM card_orders WHERE out_trade_no = ? AND status = ?'
  ).bind(outTradeNo, 'paid').first()

  if (existingOrder) {
    console.log('Order already processed:', outTradeNo)
    return new Response('success')
  }

  // 获取链接信息
  const link = await env.DB.prepare(
    'SELECT * FROM card_links WHERE short_code = ?'
  ).bind(linkCode).first<CardLink>()

  if (!link) {
    console.error('Link not found:', linkCode)
    return new Response('success')
  }

  // 获取用户的易支付密钥用于验签
  const settings = await env.DB.prepare(
    'SELECT epay_key FROM user_settings WHERE user_id = ?'
  ).bind(link.user_id).first<{ epay_key: string }>()

  if (!settings?.epay_key) {
    console.error('User settings not found:', link.user_id)
    return new Response('success')
  }

  // 验证签名
  const isValid = await verifySign(params, settings.epay_key)
  if (!isValid) {
    console.error('Sign verification failed')
    return new Response('sign error', { status: 400 })
  }

  // 检查库存
  const isOneToMany = link.card_mode === 'one_to_many'
  const hasUnlimitedStock = isOneToMany && link.total_stock <= 0

  if (!hasUnlimitedStock) {
    const remainingStock = link.total_stock - link.sold_count
    if (remainingStock < quantity) {
      console.error('Out of stock:', linkCode, 'need:', quantity, 'have:', remainingStock)
      return new Response('success')
    }
  }

  const now = Math.floor(Date.now() / 1000)
  const cardIds: string[] = []
  const cardContents: string[] = []

  // 根据模式和数量处理卡密
  if (link.card_mode === 'one_to_many') {
    // 一对多模式：所有人获得相同的卡密（第一个），数量只影响销量计数
    const card = await env.DB.prepare(`
      SELECT id, content FROM cards WHERE link_id = ? LIMIT 1
    `).bind(link.id).first<{ id: string; content: string }>()

    if (!card) {
      console.error('No card found:', linkCode)
      return new Response('success')
    }

    // 一对多模式，购买多个也只返回同一个卡密
    for (let i = 0; i < quantity; i++) {
      cardIds.push(card.id)
      cardContents.push(card.content)
    }

  } else if (link.card_mode === 'multi') {
    // 多对多模式：每次购买发放 cards_per_order 个卡密，购买 quantity 次
    const cardsPerOrder = link.cards_per_order || 1
    const totalCardsNeeded = cardsPerOrder * quantity

    for (let i = 0; i < totalCardsNeeded; i++) {
      const updateResult = await env.DB.prepare(`
        UPDATE cards 
        SET status = 'reserved', order_no = ?
        WHERE id = (
          SELECT id FROM cards 
          WHERE link_id = ? AND status = 'available' 
          LIMIT 1
        ) AND status = 'available'
      `).bind(`${outTradeNo}_${i}`, link.id).run()

      if (!updateResult.meta.changes || updateResult.meta.changes === 0) {
        break
      }

      const card = await env.DB.prepare(`
        SELECT id, content FROM cards WHERE order_no = ? AND status = 'reserved'
      `).bind(`${outTradeNo}_${i}`).first<{ id: string; content: string }>()

      if (card) {
        cardIds.push(card.id)
        cardContents.push(card.content)

        // 更新为已售出
        await env.DB.prepare(`
          UPDATE cards SET status = 'sold', sold_at = ?, order_no = ? WHERE id = ?
        `).bind(now, outTradeNo, card.id).run()
      }
    }

    if (cardIds.length === 0) {
      console.error('No available cards:', linkCode)
      return new Response('success')
    }

  } else {
    // 一对一模式（默认）：购买 quantity 个卡密
    for (let i = 0; i < quantity; i++) {
      const updateResult = await env.DB.prepare(`
        UPDATE cards 
        SET status = 'reserved', order_no = ?
        WHERE id = (
          SELECT id FROM cards 
          WHERE link_id = ? AND status = 'available' 
          LIMIT 1
        ) AND status = 'available'
      `).bind(`${outTradeNo}_${i}`, link.id).run()

      if (!updateResult.meta.changes || updateResult.meta.changes === 0) {
        console.error('No available card at index:', i)
        break
      }

      const card = await env.DB.prepare(`
        SELECT id, content FROM cards WHERE order_no = ? AND status = 'reserved'
      `).bind(`${outTradeNo}_${i}`).first<{ id: string; content: string }>()

      if (card) {
        cardIds.push(card.id)
        cardContents.push(card.content)

        // 更新卡密状态为已售出
        await env.DB.prepare(`
          UPDATE cards SET status = 'sold', sold_at = ?, order_no = ? WHERE id = ?
        `).bind(now, outTradeNo, card.id).run()
      }
    }

    if (cardIds.length === 0) {
      console.error('No available card or concurrent conflict:', linkCode)
      return new Response('success')
    }
  }

  // 更新链接销量（按购买数量增加）
  await env.DB.prepare(`
    UPDATE card_links 
    SET sold_count = sold_count + ?, updated_at = ?
    WHERE id = ?
  `).bind(quantity, now, link.id).run()

  // 创建订单记录（存储所有卡密ID，用逗号分隔）
  await env.DB.prepare(`
    INSERT INTO card_orders (id, link_id, card_id, buyer_id, buyer_username, amount, trade_no, out_trade_no, status, paid_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'paid', ?)
  `).bind(
    crypto.randomUUID(),
    link.id,
    cardIds.join(','),
    '',
    '',
    money,
    tradeNo,
    outTradeNo,
    now
  ).run()

  // 检查是否售罄，自动关闭
  const shouldCheckSoldOut = !hasUnlimitedStock
  if (shouldCheckSoldOut) {
    const updatedLink = await env.DB.prepare(`
      SELECT total_stock, sold_count FROM card_links WHERE id = ?
    `).bind(link.id).first<{ total_stock: number; sold_count: number }>()

    if (updatedLink && updatedLink.total_stock > 0 && updatedLink.sold_count >= updatedLink.total_stock) {
      await env.DB.prepare(`
        UPDATE card_links SET is_active = 0, updated_at = ? WHERE id = ?
      `).bind(now, link.id).run()
      console.log('Link auto closed due to sold out:', linkCode)
    }
  }

  console.log('Card callback processed:', linkCode, 'quantity:', quantity, 'cards:', cardIds.length)

  return new Response('success')
}
