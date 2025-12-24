import { eq, desc } from 'drizzle-orm'
import { getDb } from '../../lib/db'
import { tipLinks } from '../../lib/schema'
import { getCurrentUser } from '../../lib/auth'

interface Env { DB: D1Database; JWT_SECRET: string }

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const { env, request } = context
  const user = await getCurrentUser(request, env.JWT_SECRET)
  if (!user) return Response.json({ success: false, error: '请先登录' }, { status: 401 })

  const db = getDb(env.DB)
  const list = await db.select().from(tipLinks).where(eq(tipLinks.userId, user.id)).orderBy(desc(tipLinks.createdAt))

  return Response.json({
    success: true,
    data: {
      links: list.map(link => ({
        id: link.id, short_code: link.shortCode, title: link.title, description: link.description,
        preset_amounts: link.presetAmounts ? JSON.parse(link.presetAmounts) : [5, 10, 20, 50],
        total_received: link.totalReceived, tip_count: link.tipCount, is_active: link.isActive,
      })),
    },
  })
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { env, request } = context
  const user = await getCurrentUser(request, env.JWT_SECRET)
  if (!user) return Response.json({ success: false, error: '请先登录' }, { status: 401 })

  const body = await request.json() as { title: string; description?: string; preset_amounts?: number[] }
  if (!body.title) return Response.json({ success: false, error: '标题不能为空' }, { status: 400 })

  const id = crypto.randomUUID()
  const shortCode = crypto.randomUUID().slice(0, 8)

  const db = getDb(env.DB)
  await db.insert(tipLinks).values({
    id, userId: user.id, username: user.username, shortCode, title: body.title, description: body.description,
    presetAmounts: JSON.stringify(body.preset_amounts || [5, 10, 20, 50]),
  })

  return Response.json({
    success: true,
    data: { id, short_code: shortCode, title: body.title, description: body.description, preset_amounts: body.preset_amounts || [5, 10, 20, 50], total_received: 0, tip_count: 0, is_active: true },
  })
}
