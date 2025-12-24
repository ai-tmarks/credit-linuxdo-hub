import { getCurrentUser } from '../../lib/auth'

interface Env {
  DB: D1Database
  JWT_SECRET: string
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
  created_at: number
}

interface Claim {
  id: string
  user_id: string
  username: string
  amount: number
  status: string
  created_at: number
}

// GET /api/red-packet/:code - 获取红包详情
export const onRequestGet: PagesFunction<Env> = async (context) => {
  const { env, request, params } = context
  const code = params.code as string

  const packet = await env.DB.prepare(`
    SELECT * FROM red_packets WHERE short_code = ?
  `).bind(code).first<RedPacket>()

  if (!packet) {
    return Response.json({ success: false, error: '红包不存在' }, { status: 404 })
  }

  // 获取领取记录
  const claims = await env.DB.prepare(`
    SELECT id, user_id, username, amount, status, created_at 
    FROM red_packet_claims 
    WHERE packet_id = ? 
    ORDER BY created_at ASC
  `).bind(packet.id).all<Claim>()

  // 检查当前用户是否已领取
  const user = await getCurrentUser(request, env.JWT_SECRET)
  let userClaim = null
  if (user) {
    userClaim = claims.results?.find(c => c.user_id === user.id) || null
  }

  // 检查是否过期
  const now = Math.floor(Date.now() / 1000)
  const isExpired = packet.expires_at < now

  return Response.json({
    success: true,
    data: {
      packet: {
        ...packet,
        is_expired: isExpired,
        is_full: packet.remaining_count <= 0,
      },
      claims: claims.results || [],
      user_claim: userClaim,
      current_user: user ? { id: user.id, username: user.username } : null,
    },
  })
}
