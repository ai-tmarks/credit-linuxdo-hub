/**
 * 统一支付回调入口
 * 根据订单号前缀分发到不同的处理逻辑
 * 
 * 订单号格式：
 * - TIP_{code}_{timestamp} - 打赏
 * - CARD_{code}_{quantity}_{timestamp} - 发卡购买
 */

import { verifySign } from '../lib/credit'

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

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const { env, request } = context
  const url = new URL(request.url)

  // 获取回调参数
  const params: Record<string, string> = {}
  url.searchParams.forEach((value, key) => {
    params[key] = value
  })

  console.log('Unified callback received:', JSON.stringify(params))

  // 验证交易状态
  if (params.trade_status !== 'TRADE_SUCCESS') {
    console.log('Trade status not success:', params.trade_status)
    return new Response('invalid status', { status: 400 })
  }

  const outTradeNo = params.out_trade_no
  const tradeNo = params.trade_no
  const money = parseFloat(params.money || '0')

  // 根据订单号前缀分发
  if (outTradeNo?.startsWith('TIP_')) {
    return handleTipCallback(env, params, outTradeNo, money)
  } else if (outTradeNo?.startsWith('CARD_')) {
    return handleCardCallback(env, params, outTradeNo, tradeNo, money)
  } else {
    console.error('Unknown order type:', outTradeNo)
    return new Response('success')
  }
}

// 处理打赏回调
async function handleTipCallback(
  env: Env,
  params: Record<string, string>,
  outTradeNo: string,
  money: number
): Promise<Response> {
  const match = outTradeNo.match(/^TIP_([^_]+)_/)
  if (!match) {
    console.error('Invalid TIP order format:', outTradeNo)
    return new Response('success')
  }

  const linkCode = match[1]

  // 获取链接信息
  const link = await env.DB.prepare(
    'SELECT user_id FROM tip_links WHERE short_code = ?'
  ).bind(linkCode).first<{ user_id: string }>()

  if (!link) {
    console.error('Tip link not found:', linkCode)
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
    console.error('Sign verification failed for tip:', outTradeNo)
  }

  // 更新链接统计
  await env.DB.prepare(`
    UPDATE tip_links 
    SET total_received = total_received + ?, 
        tip_count = tip_count + 1,
        updated_at = unixepoch()
    WHERE short_code = ?
  `).bind(money, linkCode).run()

  console.log('Tip callback processed:', linkCode, money)
  return new Response('success')
}

// 处理发卡回调
async function handleCardCallback(
  env: Env,
  params: Record<string, string>,
  outTradeNo: string,
  tradeNo: string,
  money: number
): Promise<Response> {
  const match = outTradeNo.match(/^CARD_([^_]+)_(\d+)_/)
  if (!match) {
    console.error('Invalid CARD order format:', outTradeNo)
    return new Response('success')
  }

  const linkCode = match[1]
  const quantity = parseInt(match[2]) || 1
  console.log('Card order:', { linkCode, quantity, outTradeNo })

  // 检查是否已处理过
  const existingOrder = await env.DB.prepare(
    'SELECT id, buyer_id, buyer_username, status FROM card_orders WHERE out_trade_no = ?'
  ).bind(outTradeNo).first<{ id: string; buyer_id: string; buyer_username: string; status: string }>()

  if (existingOrder?.status === 'paid') {
    console.log('Order already paid:', outTradeNo)
    return new Response('success')
  }

  const buyerId = existingOrder?.buyer_id || ''
  const buyerUsername = existingOrder?.buyer_username || ''

  // 获取链接信息
  const link = await env.DB.prepare(
    'SELECT * FROM card_links WHERE short_code = ?'
  ).bind(linkCode).first<CardLink>()

  if (!link) {
    console.error('Card link not found:', linkCode)
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
    console.error('Sign verification failed for card:', outTradeNo)
    // 继续处理，不阻止
  }

  const now = Math.floor(Date.now() / 1000)
  const cardIds: string[] = []

  // 根据模式处理卡密
  if (link.card_mode === 'one_to_many') {
    const card = await env.DB.prepare(`
      SELECT id, content FROM cards WHERE link_id = ? LIMIT 1
    `).bind(link.id).first<{ id: string; content: string }>()

    if (!card) {
      console.error('No card found:', linkCode)
      return new Response('success')
    }

    for (let i = 0; i < quantity; i++) {
      cardIds.push(card.id)
    }
  } else if (link.card_mode === 'multi') {
    const cardsPerOrder = link.cards_per_order || 1
    const totalCardsNeeded = cardsPerOrder * quantity

    for (let i = 0; i < totalCardsNeeded; i++) {
      const updateResult = await env.DB.prepare(`
        UPDATE cards SET status = 'reserved', order_no = ?
        WHERE id = (SELECT id FROM cards WHERE link_id = ? AND status = 'available' LIMIT 1)
        AND status = 'available'
      `).bind(`${outTradeNo}_${i}`, link.id).run()

      if (!updateResult.meta.changes) break

      const card = await env.DB.prepare(`
        SELECT id FROM cards WHERE order_no = ? AND status = 'reserved'
      `).bind(`${outTradeNo}_${i}`).first<{ id: string }>()

      if (card) {
        cardIds.push(card.id)
        await env.DB.prepare(`
          UPDATE cards SET status = 'sold', sold_at = ?, order_no = ? WHERE id = ?
        `).bind(now, outTradeNo, card.id).run()
      }
    }
  } else {
    // 一对一模式
    for (let i = 0; i < quantity; i++) {
      const updateResult = await env.DB.prepare(`
        UPDATE cards SET status = 'reserved', order_no = ?
        WHERE id = (SELECT id FROM cards WHERE link_id = ? AND status = 'available' LIMIT 1)
        AND status = 'available'
      `).bind(`${outTradeNo}_${i}`, link.id).run()

      if (!updateResult.meta.changes) break

      const card = await env.DB.prepare(`
        SELECT id FROM cards WHERE order_no = ? AND status = 'reserved'
      `).bind(`${outTradeNo}_${i}`).first<{ id: string }>()

      if (card) {
        cardIds.push(card.id)
        await env.DB.prepare(`
          UPDATE cards SET status = 'sold', sold_at = ?, order_no = ? WHERE id = ?
        `).bind(now, outTradeNo, card.id).run()
      }
    }
  }

  if (cardIds.length === 0 && link.card_mode !== 'one_to_many') {
    console.error('No cards available:', linkCode)
    return new Response('success')
  }

  // 更新或创建订单
  if (existingOrder) {
    await env.DB.prepare(`
      UPDATE card_orders SET card_id = ?, amount = ?, trade_no = ?, status = 'paid', paid_at = ?
      WHERE out_trade_no = ?
    `).bind(cardIds.join(','), money, tradeNo, now, outTradeNo).run()
  } else {
    await env.DB.prepare(`
      INSERT INTO card_orders (id, link_id, card_id, buyer_id, buyer_username, amount, trade_no, out_trade_no, status, paid_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'paid', ?)
    `).bind(crypto.randomUUID(), link.id, cardIds.join(','), buyerId, buyerUsername, money, tradeNo, outTradeNo, now).run()
  }

  // 更新卡密买家信息
  if (buyerId) {
    for (const cardId of cardIds) {
      await env.DB.prepare(`
        UPDATE cards SET buyer_id = ?, buyer_username = ? WHERE id = ?
      `).bind(buyerId, buyerUsername, cardId).run()
    }
  }

  console.log('Card callback processed:', linkCode, 'quantity:', quantity, 'cards:', cardIds.length)
  return new Response('success')
}
