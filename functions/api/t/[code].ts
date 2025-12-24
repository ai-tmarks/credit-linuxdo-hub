import { createPaymentParams } from '../../lib/credit'

interface Env {
  DB: D1Database
}

const CREDIT_API_URL = 'https://credit.linux.do/epay/pay/submit.php'

// GET /api/t/:code?amount=10&name=打赏
// 返回自动提交的表单，POST 到 credit.linux.do
export const onRequestGet: PagesFunction<Env> = async (context) => {
  const { env, request, params } = context
  const code = params.code as string
  const url = new URL(request.url)
  const origin = url.origin

  // 获取参数
  const amountStr = url.searchParams.get('amount')
  const name = url.searchParams.get('name') || '打赏'

  if (!amountStr) {
    return new Response('缺少 amount 参数', { status: 400 })
  }

  const amount = parseFloat(amountStr)
  if (isNaN(amount) || amount <= 0 || amount > 10000) {
    return new Response('金额无效（需在 0-10000 之间）', { status: 400 })
  }

  // 获取链接信息
  const link = await env.DB.prepare(
    'SELECT user_id, title FROM tip_links WHERE short_code = ? AND is_active = 1'
  ).bind(code).first<{ user_id: string; title: string }>()

  if (!link) {
    return new Response('链接不存在或已失效', { status: 404 })
  }

  // 获取用户的易支付配置
  const settings = await env.DB.prepare(
    'SELECT epay_pid, epay_key FROM user_settings WHERE user_id = ?'
  ).bind(link.user_id).first<{ epay_pid: string; epay_key: string }>()

  if (!settings || !settings.epay_pid || !settings.epay_key) {
    return new Response('收款方未配置支付参数', { status: 400 })
  }

  // 生成订单号
  const outTradeNo = `TIP_${code}_${Date.now()}`

  // 生成支付参数
  const paymentParams = await createPaymentParams({
    pid: settings.epay_pid,
    secret: settings.epay_key,
    outTradeNo,
    name: name.slice(0, 20),
    money: amount.toFixed(2),
    notifyUrl: `${origin}/api/callback`,
    returnUrl: `${origin}/api/tip/return`,
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
