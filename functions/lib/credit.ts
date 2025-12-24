/**
 * LINUX DO Credit 易支付兼容接口
 * 文档: https://credit.linux.do/docs/api
 */

/**
 * 生成签名
 * 签名算法：
 * 1. 取所有非空字段（排除 sign、sign_type）
 * 2. 按 ASCII 升序拼成 k1=v1&k2=v2
 * 3. 末尾追加密钥：k1=v1&k2=v2{secret}
 * 4. MD5 取小写十六进制
 */
export async function generateSign(params: Record<string, string>, secret: string): Promise<string> {
  // 过滤空值和 sign/sign_type
  const filtered = Object.entries(params)
    .filter(([key, value]) => value && key !== 'sign' && key !== 'sign_type')
    .sort(([a], [b]) => a.localeCompare(b))

  // 拼接字符串
  const str = filtered.map(([k, v]) => `${k}=${v}`).join('&') + secret

  // MD5 哈希
  const encoder = new TextEncoder()
  const data = encoder.encode(str)
  const hashBuffer = await crypto.subtle.digest('MD5', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

/**
 * 验证签名
 */
export async function verifySign(params: Record<string, string>, secret: string): Promise<boolean> {
  const sign = params.sign
  if (!sign) return false
  const expectedSign = await generateSign(params, secret)
  return sign.toLowerCase() === expectedSign.toLowerCase()
}

/**
 * 创建支付参数
 */
export interface CreatePaymentParams {
  pid: string           // Client ID
  secret: string        // Client Secret
  outTradeNo: string    // 业务单号
  name: string          // 标题
  money: string         // 金额（最多2位小数）
  notifyUrl: string     // 回调地址
  returnUrl: string     // 返回地址
}

/**
 * 生成支付表单参数
 */
export async function createPaymentParams(params: CreatePaymentParams): Promise<Record<string, string>> {
  const formParams: Record<string, string> = {
    pid: params.pid,
    type: 'epay',
    out_trade_no: params.outTradeNo,
    name: params.name,
    money: params.money,
    notify_url: params.notifyUrl,
    return_url: params.returnUrl,
    sign_type: 'MD5',
  }

  formParams.sign = await generateSign(formParams, params.secret)
  return formParams
}

/**
 * 获取支付跳转 URL
 */
export function getPaymentUrl(baseUrl: string, params: Record<string, string>): string {
  const searchParams = new URLSearchParams(params)
  return `${baseUrl}/epay/pay/submit.php?${searchParams}`
}
