interface Env {
  DB: D1Database
}

interface CardOrder {
  id: string
  card_id: string
  status: string
}

// GET /api/card/status?order=xxx - 检查订单状态
export const onRequestGet: PagesFunction<Env> = async (context) => {
  const { env, request } = context
  const url = new URL(request.url)
  const orderNo = url.searchParams.get('order')

  if (!orderNo) {
    return Response.json({ success: false, error: '缺少订单号' }, { status: 400 })
  }

  // 查询订单状态
  const order = await env.DB.prepare(`
    SELECT id, card_id, status FROM card_orders WHERE out_trade_no = ?
  `).bind(orderNo).first<CardOrder>()

  if (!order) {
    return Response.json({ success: false, error: '订单不存在' }, { status: 404 })
  }

  if (order.status === 'paid') {
    // 获取卡密内容
    const cardIds = order.card_id.split(',').filter(Boolean)
    const cardContents: string[] = []

    for (const cardId of cardIds) {
      const card = await env.DB.prepare(`SELECT content FROM cards WHERE id = ?`).bind(cardId).first<{ content: string }>()
      if (card) cardContents.push(card.content)
    }

    return Response.json({
      success: true,
      data: {
        status: 'paid',
        cards: cardContents,
      },
    })
  }

  return Response.json({
    success: true,
    data: {
      status: order.status,
    },
  })
}
