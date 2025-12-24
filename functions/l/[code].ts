interface Env {
  DB: D1Database
  ASSETS: Fetcher
}

interface Lottery {
  title: string
  description: string | null
  join_type: string
  join_price: number
  participant_count: number
  status: string
}

// GET /l/:code - 返回带有动态 OG 标签的 HTML
export const onRequestGet: PagesFunction<Env> = async (context) => {
  const { env, request, params } = context
  const code = params.code as string
  const url = new URL(request.url)
  const origin = url.origin

  // 获取抽奖信息
  const lottery = await env.DB.prepare(`
    SELECT title, description, join_type, join_price, participant_count, status FROM lotteries WHERE short_code = ?
  `).bind(code).first<Lottery>()

  // 默认 meta 信息
  let title = 'Credit Hub - 抽奖活动'
  let description = '参与抽奖，赢取奖品'

  if (lottery) {
    const statusText = lottery.status === 'drawn' ? '已开奖' : '进行中'
    const joinText = lottery.join_type === 'free' ? '免费参与' : `${lottery.join_price} 积分参与`
    title = `${lottery.title} - ${statusText}`
    description = lottery.description || `${joinText} | ${lottery.participant_count} 人已参与`
  }

  // 获取原始 index.html
  const assetResponse = await env.ASSETS.fetch(new URL('/', request.url))
  let html = await assetResponse.text()

  // 注入动态 meta 标签
  const metaTags = `
  <title>${escapeHtml(title)}</title>
  <meta name="description" content="${escapeHtml(description)}">
  <meta property="og:type" content="website">
  <meta property="og:url" content="${origin}/l/${code}">
  <meta property="og:title" content="${escapeHtml(title)}">
  <meta property="og:description" content="${escapeHtml(description)}">
  <meta property="og:site_name" content="Credit Hub">
  <meta name="twitter:card" content="summary">
  <meta name="twitter:title" content="${escapeHtml(title)}">
  <meta name="twitter:description" content="${escapeHtml(description)}">`

  html = html.replace(/<title>.*?<\/title>/, '')
  html = html.replace('</head>', `${metaTags}\n</head>`)

  return new Response(html, {
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  })
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}
