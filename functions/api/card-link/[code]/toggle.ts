import { getCurrentUser } from '../../../lib/auth'

interface Env {
  DB: D1Database
  JWT_SECRET: string
}

// POST /api/card-link/:code/toggle - 开启/关闭发卡链接
export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { env, request, params } = context
  const code = params.code as string

  const user = await getCurrentUser(request, env.JWT_SECRET)
  if (!user) {
    return Response.json({ success: false, error: '请先登录' }, { status: 401 })
  }

  const link = await env.DB.prepare(`
    SELECT id, user_id, is_active FROM card_links WHERE short_code = ?
  `).bind(code).first<{ id: string; user_id: string; is_active: number }>()

  if (!link) {
    return Response.json({ success: false, error: '链接不存在' }, { status: 404 })
  }

  if (link.user_id !== user.id) {
    return Response.json({ success: false, error: '无权限' }, { status: 403 })
  }

  const newStatus = link.is_active ? 0 : 1

  await env.DB.prepare(`
    UPDATE card_links SET is_active = ?, updated_at = unixepoch() WHERE id = ?
  `).bind(newStatus, link.id).run()

  return Response.json({
    success: true,
    data: { is_active: newStatus },
  })
}
