/**
 * Credit.linux.do 转账 API 封装
 */

const CREDIT_API_BASE = 'https://credit.linux.do'

export interface TransferParams {
  recipientId: number | string
  recipientUsername: string
  amount: number
  remark?: string
}

export interface TransferResult {
  success: boolean
  error?: string
}

/**
 * 调用 credit.linux.do 转账 API
 */
export async function transfer(
  params: TransferParams,
  sessionCookie: string,
  payKey: string
): Promise<TransferResult> {
  try {
    const response = await fetch(`${CREDIT_API_BASE}/api/v1/payment/transfer`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': sessionCookie,
      },
      body: JSON.stringify({
        recipient_id: Number(params.recipientId),
        recipient_username: params.recipientUsername,
        amount: params.amount,
        pay_key: payKey,
        remark: params.remark || '红包',
      }),
    })

    const data = await response.json() as { error_msg?: string; data?: unknown }

    if (!response.ok) {
      return {
        success: false,
        error: data.error_msg || `HTTP ${response.status}`,
      }
    }

    // 官方 API 成功返回 { error_msg: null, data: null }
    if (data.error_msg) {
      return {
        success: false,
        error: data.error_msg,
      }
    }

    return { success: true }
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : '网络错误',
    }
  }
}

/**
 * 批量转账（顺序执行，避免并发问题）
 */
export async function batchTransfer(
  transfers: TransferParams[],
  sessionCookie: string,
  payKey: string,
  onProgress?: (index: number, result: TransferResult) => void
): Promise<TransferResult[]> {
  const results: TransferResult[] = []

  for (let i = 0; i < transfers.length; i++) {
    const result = await transfer(transfers[i], sessionCookie, payKey)
    results.push(result)
    onProgress?.(i, result)

    // 每次转账后稍微延迟，避免请求过快
    if (i < transfers.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 500))
    }
  }

  return results
}
