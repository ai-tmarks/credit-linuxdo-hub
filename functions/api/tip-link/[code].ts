import { eq } from 'drizzle-orm'
import { getDb } from '../../lib/db'
import { tipLinks } from '../../lib/schema'
import { getCurrentUser } from '../../lib/auth'

interface Env { DB: D1Database; JWT_SECRET: string }

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const { env, params } = context
  const code = params.code as string

  const db = getDb(env.DB)
  const [link] = await db.select().from(tipLinks).where(eq(tipLinks.shortCode, code)).limit(1)

  if (!link || !link.isActive) return Response.json({ success: false, error: '链接不存在或已失效' }, { status: 404 })

  return Response.json({
    success: true,
    data: {
      id: link.id, short_code: link.shortCode, user_id: link.userId, username: link.username, title: link.title, description: link.description,
      preset_amounts: link.presetAmounts ? JSON.parse(link.presetAmounts) : [5, 10, 20, 50],
      min_amount: link.minAmount, max_amount: link.maxAmount, allow_custom: link.allowCustom,
      thank_message: link.thankMessage, total_received: link.totalReceived, tip_count: link.tipCount,
    },
  })
}

export const onRequestDelete: PagesFunction<Env> = async (context) => {
  const { env, params, request } = context
  const code = params.code as string
  const user = await getCurrentUser(request, env.JWT_SECRET)
  if (!user) return Response.json({ success: false, error: '请先登录' }, { status: 401 })

  const db = getDb(env.DB)
  const [link] = await db.select().from(tipLinks).where(eq(tipLinks.shortCode, code)).limit(1)

  if (!link) return Response.json({ success: false, error: '链接不存在' }, { status: 404 })
  if (link.userId !== user.id) return Response.json({ success: false, error: '无权限' }, { status: 403 })

  await db.delete(tipLinks).where(eq(tipLinks.id, link.id))
  return Response.json({ success: true })
}
