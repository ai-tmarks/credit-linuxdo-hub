import { getCurrentUser } from '../../../lib/auth'

interface Env {
  DB: D1Database
  JWT_SECRET: string
}

// POST /api/card-link/:code/add-cards - 补充卡密
export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { env, request, params } = context
  const code = params.code as string

  const user = await getCurrentUser(request, env.JWT_SECRET)
  if (!user) {
    return Response.json({ success: false, error: '请先登录' }, { status: 401 })
  }

  const link = await env.DB.prepare(`
    SELECT id, user_id FROM card_links WHERE short_code = ?
  `).bind(code).first<{ id: string; user_id: string }>()

  if (!link) {
    return Response.json({ success: false, error: '链接不存在' }, { status: 404 })
  }

  if (link.user_id !== user.id) {
    return Response.json({ success: false, error: '无权限' }, { status: 403 })
  }

  const body = await request.json() as { cards: string[] }

  if (!body.cards || body.cards.length === 0) {
    return Response.json({ success: false, error: '请添加卡密' }, { status: 400 })
  }

  let addedCount = 0
  for (const content of body.cards) {
    if (content.trim()) {
      await env.DB.prepare(`
        INSERT INTO cards (id, link_id, content) VALUES (?, ?, ?)
      `).bind(crypto.randomUUID(), link.id, content.trim()).run()
      addedCount++
    }
  }

  // 更新总库存
  await env.DB.prepare(`
    UPDATE card_links SET total_stock = total_stock + ?, updated_at = unixepoch() WHERE id = ?
  `).bind(addedCount, link.id).run()

  return Response.json({
    success: true,
    data: { added_count: addedCount },
  })
}
