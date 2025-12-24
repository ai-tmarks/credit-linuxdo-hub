// GET /api/tip/return - 支付完成后的同步跳转
// credit.linux.do 支付完成后会跳转到这里
export const onRequestGet: PagesFunction = async (context) => {
  const { request } = context
  const url = new URL(request.url)
  const origin = url.origin

  // 获取支付结果参数
  const tradeNo = url.searchParams.get('trade_no')
  const outTradeNo = url.searchParams.get('out_trade_no')
  const tradeStatus = url.searchParams.get('trade_status')

  // 从订单号解析链接 code (格式: TIP_code_timestamp)
  let code = ''
  if (outTradeNo) {
    const parts = outTradeNo.split('_')
    if (parts.length >= 2) {
      code = parts[1]
    }
  }

  // 跳转到成功页面
  const successUrl = new URL('/tip/success', origin)
  if (code) successUrl.searchParams.set('code', code)
  if (tradeNo) successUrl.searchParams.set('trade_no', tradeNo)
  if (tradeStatus) successUrl.searchParams.set('status', tradeStatus)

  return Response.redirect(successUrl.toString(), 302)
}
