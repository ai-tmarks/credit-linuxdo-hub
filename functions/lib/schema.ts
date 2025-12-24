import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core'

/**
 * 打赏链接表
 */
export const tipLinks = sqliteTable('tip_links', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull(),
  username: text('username').notNull(),
  shortCode: text('short_code').notNull().unique(),
  title: text('title').notNull(),
  description: text('description'),
  presetAmounts: text('preset_amounts').default('[5,10,20,50]'),
  minAmount: real('min_amount').default(1),
  maxAmount: real('max_amount').default(1000),
  allowCustom: integer('allow_custom', { mode: 'boolean' }).default(true),
  totalReceived: real('total_received').default(0),
  tipCount: integer('tip_count').default(0),
  isActive: integer('is_active', { mode: 'boolean' }).default(true),
  createdAt: integer('created_at', { mode: 'timestamp' }),
  updatedAt: integer('updated_at', { mode: 'timestamp' }),
})

export type TipLink = typeof tipLinks.$inferSelect
export type NewTipLink = typeof tipLinks.$inferInsert
