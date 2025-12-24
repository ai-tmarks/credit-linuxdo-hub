import { getCurrentUser } from '../../lib/auth'

interface Env {
  DB: D1Database
  JWT_SECRET: string
}

interface CardLink {
  id: string
  user_id: string
  title: string
  price: number
  total_stock: number
  sold_count: number
  card_mode: string
  cards_per_order: number
  per_user_limit: number
  is_active: number
}

// POST /api/card/pay - 创建订单并返回支付 URL
export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { env, request } = context
  const url = new URL(request.url)
  const origin = url.origin

  // 获取当前登录用户
  const user = await getCurrentUser(request, env.JWT_SECRET)

  // 解析请求体
  const body = (await request.json()) as { code: string; quantity?: number }
  const code = body.code
  const quantity = Math.max(1, Math.min(10, body.quantity || 1))

  if (!code) {
    return Response.json({ success: false, error: '缺少商品代码' }, { status: 400 })
  }

  // 获取链接信息
  const link = await env.DB.prepare(`
    SELECT * FROM card_links WHERE short_code = ? AND is_active = 1
  `).bind(code).first<CardLink>()

  if (!link) {
    return Response.json({ success: false, error: '商品不存在或已下架' }, { status: 404 })
  }

  // 检查库存
  const isOneToMany = link.card_mode === 'one_to_many'
  const hasUnlimitedStock = isOneToMany && link.total_stock <= 0

  if (!hasUnlimitedStock) {
    const remainingStock = link.total_stock - link.sold_count
    if (remainingStock < quantity) {
      return Response.json({ success: false, error: `库存不足，仅剩 ${remainingStock} 件` }, { status: 400 })
    }
  }

  // 获取用户的易支付配置
  const settings = await env.DB.prepare(
    'SELECT epay_pid, epay_key FROM user_settings WHERE user_id = ?'
  ).bind(link.user_id).first<{ epay_pid: string; epay_key: string }>()

  if (!settings || !settings.epay_pid || !settings.epay_key) {
    return Response.json({ success: false, error: '商家未配置支付参数' }, { status: 400 })
  }

  // 计算总价
  const totalPrice = link.price * quantity

  // 生成订单号
  const outTradeNo = `CARD_${code}_${quantity}_${Date.now()}`

  // 预先创建 pending 订单
  const orderId = crypto.randomUUID()
  await env.DB.prepare(`
    INSERT INTO card_orders (id, link_id, card_id, buyer_id, buyer_username, amount, out_trade_no, status, created_at)
    VALUES (?, ?, '', ?, ?, ?, ?, 'pending', ?)
  `).bind(
    orderId,
    link.id,
    user?.id || '',
    user?.username || '',
    totalPrice,
    outTradeNo,
    Math.floor(Date.now() / 1000)
  ).run()

  // 返回跳转页面 URL（该页面会自动 POST 提交表单到支付平台）
  const payUrl = `${origin}/api/card/redirect?code=${code}&qty=${quantity}&order=${outTradeNo}`

  return Response.json({
    success: true,
    data: {
      order_no: outTradeNo,
      pay_url: payUrl,
    },
  })
}
