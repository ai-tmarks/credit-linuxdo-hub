import { createPaymentParams } from '../../lib/credit'
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

const CREDIT_API_URL = 'https://credit.linux.do/epay/pay/submit.php'

// GET /api/card/redirect?code=xxx&qty=1&order=xxx - 跳转到支付页面
export const onRequestGet: PagesFunction<Env> = async (context) => {
  const { env, request } = context
  const url = new URL(request.url)
  const origin = url.origin

  const code = url.searchParams.get('code')
  const orderNo = url.searchParams.get('order')
  const quantity = Math.max(1, Math.min(10, parseInt(url.searchParams.get('qty') || '1') || 1))

  if (!code || !orderNo) {
    return new Response('参数错误', { status: 400 })
  }

  // 获取链接信息
  const link = await env.DB.prepare(`
    SELECT * FROM card_links WHERE short_code = ? AND is_active = 1
  `).bind(code).first<CardLink>()

  if (!link) {
    return new Response('商品不存在或已下架', { status: 404 })
  }

  // 获取用户的易支付配置
  const settings = await env.DB.prepare(
    'SELECT epay_pid, epay_key FROM user_settings WHERE user_id = ?'
  ).bind(link.user_id).first<{ epay_pid: string; epay_key: string }>()

  if (!settings || !settings.epay_pid || !settings.epay_key) {
    return new Response('商家未配置支付参数', { status: 400 })
  }

  // 计算总价
  const totalPrice = link.price * quantity

  // 生成商品名称
  const productName = quantity > 1 ? `${link.title.slice(0, 15)} x${quantity}` : link.title.slice(0, 20)

  // 生成支付参数
  const paymentParams = await createPaymentParams({
    pid: settings.epay_pid,
    secret: settings.epay_key,
    outTradeNo: orderNo,
    name: productName,
    money: totalPrice.toFixed(2),
    notifyUrl: `${origin}/api/card/callback`,
    returnUrl: `${origin}/card/success?code=${code}&order=${orderNo}`,
  })

  // 生成自动提交的 HTML 表单
  const formInputs = Object.entries(paymentParams)
    .map(([key, value]) => `<input type="hidden" name="${key}" value="${escapeHtml(value)}" />`)
    .join('\n')

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>正在跳转到支付页面...</title>
  <style>
    body { display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; font-family: system-ui, sans-serif; background: #f5f5f5; }
    .loading { text-align: center; }
    .spinner { width: 40px; height: 40px; border: 3px solid #e0e0e0; border-top-color: #3b82f6; border-radius: 50%; animation: spin 1s linear infinite; margin: 0 auto 16px; }
    @keyframes spin { to { transform: rotate(360deg); } }
  </style>
</head>
<body>
  <div class="loading">
    <div class="spinner"></div>
    <p>正在跳转到支付页面...</p>
  </div>
  <form id="payForm" method="POST" action="${CREDIT_API_URL}">
    ${formInputs}
  </form>
  <script>document.getElementById('payForm').submit();</script>
</body>
</html>`

  return new Response(html, {
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  })
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}
