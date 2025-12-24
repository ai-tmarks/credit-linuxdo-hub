interface Env {
  DB: D1Database
}

interface CardLink {
  title: string
  description: string | null
  card_mode: string
}

interface CardOrder {
  id: string
  card_id: string
}

// GET /api/card/success?code=xxx&order=xxx - 获取购买成功的卡密
export const onRequestGet: PagesFunction<Env> = async (context) => {
  const { env, request } = context
  const url = new URL(request.url)
  const code = url.searchParams.get('code')
  const orderNo = url.searchParams.get('order')

  if (!code || !orderNo) {
    return Response.json({ success: false, error: '参数错误' }, { status: 400 })
  }

  // 验证订单号格式必须匹配 code
  // 订单号格式：CARD_{code}_{quantity}_{timestamp}
  const orderMatch = orderNo.match(/^CARD_([^_]+)_\d+_\d+$/)
  if (!orderMatch || orderMatch[1] !== code) {
    return Response.json({ success: false, error: '订单号无效' }, { status: 400 })
  }

  // 获取链接信息
  const link = await env.DB.prepare(`
    SELECT title, description, card_mode FROM card_links WHERE short_code = ?
  `).bind(code).first<CardLink>()

  if (!link) {
    return Response.json({ success: false, error: '链接不存在' }, { status: 404 })
  }

  // 先检查订单是否存在且已支付
  const order = await env.DB.prepare(`
    SELECT id, card_id FROM card_orders WHERE out_trade_no = ? AND status = 'paid'
  `).bind(orderNo).first<CardOrder>()

  if (!order) {
    // 订单不存在或未支付，可能还在处理中
    return Response.json({
      success: true,
      data: {
        status: 'pending',
        title: link.title,
        message: '订单处理中，请稍后刷新...',
      },
    })
  }

  // card_id 可能是多个（逗号分隔）
  const cardIds = order.card_id.split(',').filter(Boolean)
  const cardContents: string[] = []

  for (const cardId of cardIds) {
    const card = await env.DB.prepare(`
      SELECT content FROM cards WHERE id = ?
    `).bind(cardId).first<{ content: string }>()

    if (card) {
      cardContents.push(card.content)
    }
  }

  // 一对多模式：直接获取第一个卡密
  if (link.card_mode === 'one_to_many' && cardContents.length === 0) {
    const firstCard = await env.DB.prepare(`
      SELECT content FROM cards WHERE id = ?
    `).bind(cardIds[0]).first<{ content: string }>()

    if (firstCard) {
      cardContents.push(firstCard.content)
    }
  }

  if (cardContents.length === 0) {
    return Response.json({
      success: true,
      data: {
        status: 'pending',
        title: link.title,
        message: '卡密发放中，请稍后刷新...',
      },
    })
  }

  return Response.json({
    success: true,
    data: {
      status: 'success',
      title: link.title,
      description: link.description,
      // 兼容单个和多个卡密
      card_content: cardContents.length === 1 ? cardContents[0] : null,
      card_contents: cardContents,
    },
  })
}
