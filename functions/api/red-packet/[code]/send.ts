import { getCurrentUser } from '../../../lib/auth'
import { transfer } from '../../../lib/credit-transfer'

interface Env {
  DB: D1Database
  JWT_SECRET: string
  CREDIT_USER_ID?: string
  CREDIT_SESSION_COOKIE?: string
  CREDIT_PAY_KEY?: string
}

interface RedPacket {
  id: string
  short_code: string
  total_amount: number
  remaining_count: number
  status: string
}

interface Claim {
  id: string
  user_id: string
  username: string
  amount: number
  status: string
}

// POST /api/red-packet/:code/send - 发放红包
export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { env, request, params } = context
  const code = params.code as string

  // 验证是否是部署者
  const user = await getCurrentUser(request, env.JWT_SECRET)
  if (!user) {
    return Response.json({ success: false, error: '请先登录' }, { status: 401 })
  }

  if (env.CREDIT_USER_ID && user.id !== env.CREDIT_USER_ID) {
    return Response.json({ success: false, error: '只有部署者能发放红包' }, { status: 403 })
  }

  // 检查配置
  if (!env.CREDIT_SESSION_COOKIE || !env.CREDIT_PAY_KEY) {
    return Response.json({ success: false, error: '请先配置 CREDIT_SESSION_COOKIE 和 CREDIT_PAY_KEY' }, { status: 400 })
  }

  // 获取红包
  const packet = await env.DB.prepare(`
    SELECT * FROM red_packets WHERE short_code = ?
  `).bind(code).first<RedPacket>()

  if (!packet) {
    return Response.json({ success: false, error: '红包不存在' }, { status: 404 })
  }

  if (packet.status === 'finished') {
    return Response.json({ success: false, error: '红包已发放完毕' }, { status: 400 })
  }

  // 获取待发放的领取记录
  const claims = await env.DB.prepare(`
    SELECT * FROM red_packet_claims 
    WHERE packet_id = ? AND status = 'pending'
    ORDER BY created_at ASC
  `).bind(packet.id).all<Claim>()

  if (!claims.results || claims.results.length === 0) {
    return Response.json({ success: false, error: '没有待发放的记录' }, { status: 400 })
  }

  // 更新红包状态为发放中
  await env.DB.prepare(`
    UPDATE red_packets SET status = 'sending' WHERE id = ?
  `).bind(packet.id).run()

  // 逐个转账
  const results: { user_id: string; username: string; amount: number; success: boolean; error?: string }[] = []

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

    // 更新领取记录状态
    const now = Math.floor(Date.now() / 1000)
    if (result.success) {
      await env.DB.prepare(`
        UPDATE red_packet_claims SET status = 'sent', sent_at = ? WHERE id = ?
      `).bind(now, claim.id).run()
    } else {
      await env.DB.prepare(`
        UPDATE red_packet_claims SET status = 'failed', error_msg = ? WHERE id = ?
      `).bind(result.error || '未知错误', claim.id).run()
    }

    results.push({
      user_id: claim.user_id,
      username: claim.username,
      amount: claim.amount,
      success: result.success,
      error: result.error,
    })

    // 延迟避免请求过快
    await new Promise(resolve => setTimeout(resolve, 500))
  }

  // 检查是否全部发放完成
  const pendingCount = await env.DB.prepare(`
    SELECT COUNT(*) as count FROM red_packet_claims 
    WHERE packet_id = ? AND status = 'pending'
  `).bind(packet.id).first<{ count: number }>()

  const newStatus = (pendingCount?.count || 0) === 0 && packet.remaining_count === 0 ? 'finished' : 'pending'
  await env.DB.prepare(`
    UPDATE red_packets SET status = ? WHERE id = ?
  `).bind(newStatus, packet.id).run()

  const successCount = results.filter(r => r.success).length
  const failCount = results.filter(r => !r.success).length

  return Response.json({
    success: true,
    data: {
      total: results.length,
      success_count: successCount,
      fail_count: failCount,
      results,
    },
  })
}
