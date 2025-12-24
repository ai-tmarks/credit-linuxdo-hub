import { verifySign } from '../../lib/credit'

interface Env {
  DB: D1Database
}

/**
 * LINUX DO Credit 异步回调
 * 
 * 支付成功后更新打赏链接的统计数据
 */
export const onRequestGet: PagesFunction<Env> = async (context) => {
  const { env, request } = context
  const url = new URL(request.url)

  // 获取回调参数
  const params: Record<string, string> = {}
  url.searchParams.forEach((value, key) => {
    params[key] = value
  })

  console.log('Credit callback:', params)

  // 验证交易状态
  if (params.trade_status !== 'TRADE_SUCCESS') {
    return new Response('invalid status', { status: 400 })
  }

  const outTradeNo = params.out_trade_no
  const money = parseFloat(params.money || '0')

  // 从订单号解析链接 code: TIP_{code}_{timestamp}
  const match = outTradeNo?.match(/^TIP_([^_]+)_/)
  if (!match) {
    console.error('Invalid out_trade_no format:', outTradeNo)
    return new Response('success') // 返回 success 避免重试
  }

  const linkCode = match[1]

  // 获取链接信息和用户的密钥
  const link = await env.DB.prepare(
    'SELECT user_id FROM tip_links WHERE short_code = ?'
  ).bind(linkCode).first<{ user_id: string }>()

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

  // 更新链接统计
  await env.DB.prepare(`
    UPDATE tip_links 
    SET total_received = total_received + ?, 
        tip_count = tip_count + 1,
        updated_at = unixepoch()
    WHERE short_code = ?
  `).bind(money, linkCode).run()

  console.log('Callback processed:', linkCode, money)

  return new Response('success')
}
