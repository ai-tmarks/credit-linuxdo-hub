import { getCurrentUser } from '../../../lib/auth'
import { transfer } from '../../../lib/credit-transfer'

interface Env {
  DB: D1Database
  JWT_SECRET: string
  CREDIT_SESSION_COOKIE?: string
  CREDIT_PAY_KEY?: string
}

interface RedPacket {
  id: string
  short_code: string
  total_amount: number
  remaining_amount: number
  total_count: number
  remaining_count: number
  type: string
  message: string | null
  status: string
  expires_at: number
}

// POST /api/red-packet/:code/claim - 登记领取红包
export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { env, request, params } = context
  const code = params.code as string

  // 必须登录
  const user = await getCurrentUser(request, env.JWT_SECRET)
  if (!user) {
    return Response.json({ success: false, error: '请先登录' }, { status: 401 })
  }

  // 获取红包
  const packet = await env.DB.prepare(`
    SELECT * FROM red_packets WHERE short_code = ?
  `).bind(code).first<RedPacket>()

  if (!packet) {
    return Response.json({ success: false, error: '红包不存在' }, { status: 404 })
  }

  // 检查状态
  if (packet.status === 'finished') {
    return Response.json({ success: false, error: '红包已发放完毕' }, { status: 400 })
  }

  // 检查是否过期
  const now = Math.floor(Date.now() / 1000)
  if (packet.expires_at < now) {
    return Response.json({ success: false, error: '红包已过期' }, { status: 400 })
  }

  // 检查是否已满
  if (packet.remaining_count <= 0) {
    return Response.json({ success: false, error: '红包已被领完' }, { status: 400 })
  }

  // 检查是否已领取
  const existingClaim = await env.DB.prepare(`
    SELECT id FROM red_packet_claims WHERE packet_id = ? AND user_id = ?
  `).bind(packet.id, user.id).first()

  if (existingClaim) {
    return Response.json({ success: false, error: '您已登记过了' }, { status: 400 })
  }

  // 计算金额
  const amount = calculateAmount(packet)

  // 创建领取记录
  const claimId = crypto.randomUUID()
  await env.DB.prepare(`
    INSERT INTO red_packet_claims (id, packet_id, user_id, username, amount, status)
    VALUES (?, ?, ?, ?, ?, 'pending')
  `).bind(claimId, packet.id, user.id, user.username, amount).run()

  // 更新红包剩余
  await env.DB.prepare(`
    UPDATE red_packets 
    SET remaining_amount = remaining_amount - ?, remaining_count = remaining_count - 1
    WHERE id = ?
  `).bind(amount, packet.id).run()

  // 检查是否人齐了，自动发放
  const updatedPacket = await env.DB.prepare(`
    SELECT remaining_count FROM red_packets WHERE id = ?
  `).bind(packet.id).first<{ remaining_count: number }>()

  let autoSent = false
  if (updatedPacket?.remaining_count === 0 && env.CREDIT_SESSION_COOKIE && env.CREDIT_PAY_KEY) {
    // 人齐了，自动发放
    autoSent = await autoSendRedPacket(env, packet.id)
  }

  return Response.json({
    success: true,
    data: {
      claim_id: claimId,
      amount,
      message: autoSent ? '领取成功，红包已自动发放！' : '登记成功，等待发放',
      auto_sent: autoSent,
    },
  })
}

/**
 * 自动发放红包
 */
async function autoSendRedPacket(env: Env, packetId: string): Promise<boolean> {
  if (!env.CREDIT_SESSION_COOKIE || !env.CREDIT_PAY_KEY) {
    return false
  }

  try {
    // 更新状态为发放中
    await env.DB.prepare(`
      UPDATE red_packets SET status = 'sending' WHERE id = ?
    `).bind(packetId).run()

    // 获取所有待发放记录
    const claims = await env.DB.prepare(`
      SELECT * FROM red_packet_claims 
      WHERE packet_id = ? AND status = 'pending'
    `).bind(packetId).all<{
      id: string
      user_id: string
      username: string
      amount: number
    }>()

    if (!claims.results || claims.results.length === 0) {
      return false
    }

    let allSuccess = true

    // 逐个转账
    for (const claim of claims.results) {
      const result = await transfer(
        {
          recipientId: claim.user_id,
          recipientUsername: claim.username,
          amount: claim.amount,
          remark: '红包',
        },
        env.CREDIT_SESSION_COOKIE,
        env.CREDIT_PAY_KEY
      )

      const now = Math.floor(Date.now() / 1000)
      if (result.success) {
        await env.DB.prepare(`
          UPDATE red_packet_claims SET status = 'sent', sent_at = ? WHERE id = ?
        `).bind(now, claim.id).run()
      } else {
        allSuccess = false
        await env.DB.prepare(`
          UPDATE red_packet_claims SET status = 'failed', error_msg = ? WHERE id = ?
        `).bind(result.error || '未知错误', claim.id).run()
      }

      // 延迟避免请求过快
      await new Promise(resolve => setTimeout(resolve, 500))
    }

    // 更新红包状态
    await env.DB.prepare(`
      UPDATE red_packets SET status = 'finished' WHERE id = ?
    `).bind(packetId).run()

    return allSuccess
  } catch (err) {
    console.error('Auto send failed:', err)
    // 恢复状态
    await env.DB.prepare(`
      UPDATE red_packets SET status = 'pending' WHERE id = ?
    `).bind(packetId).run()
    return false
  }
}

/**
 * 计算领取金额
 */
function calculateAmount(packet: RedPacket): number {
  if (packet.type === 'fixed') {
    // 固定金额：平均分配
    return Math.round((packet.total_amount / packet.total_count) * 100) / 100
  }

  // 拼手气红包：随机金额
  const remaining = packet.remaining_amount
  const remainingCount = packet.remaining_count

  if (remainingCount === 1) {
    // 最后一个人拿剩余全部
    return Math.round(remaining * 100) / 100
  }

  // 随机金额：最少0.01，最多是剩余金额的2倍平均值
  const avg = remaining / remainingCount
  const min = 0.01
  const max = Math.min(remaining - (remainingCount - 1) * min, avg * 2)

  const amount = min + Math.random() * (max - min)
  return Math.round(amount * 100) / 100
}
