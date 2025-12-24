interface Env {
  DB: D1Database
  ASSETS: Fetcher
}

interface CardLink {
  title: string
  description: string | null
  price: number
  sold_count: number
  total_stock: number
  card_mode: string
}

// GET /c/:code - 返回带有动态 OG 标签的 HTML
export const onRequestGet: PagesFunction<Env> = async (context) => {
  const { env, request, params } = context
  const code = params.code as string
  const url = new URL(request.url)
  const origin = url.origin

  // 获取商品信息
  const link = await env.DB.prepare(`
    SELECT title, description, price, sold_count, total_stock, card_mode FROM card_links WHERE short_code = ?
  `).bind(code).first<CardLink>()

  // 默认 meta 信息
  let title = 'Credit Hub - 商品购买'
  let description = '使用 Linux Do 积分购买商品'

  if (link) {
    title = `${link.title} - ${link.price} 积分`
    description = link.description || `已售 ${link.sold_count} 件 | 使用 Linux Do 积分购买`
  }

  // 获取原始 index.html
  const assetResponse = await env.ASSETS.fetch(new URL('/', request.url))
  let html = await assetResponse.text()

  // 注入动态 meta 标签
  const metaTags = `
  <title>${escapeHtml(title)}</title>
  <meta name="description" content="${escapeHtml(description)}">
  <meta property="og:type" content="website">
  <meta property="og:url" content="${origin}/c/${code}">
  <meta property="og:title" content="${escapeHtml(title)}">
  <meta property="og:description" content="${escapeHtml(description)}">
  <meta property="og:site_name" content="Credit Hub">
  <meta name="twitter:card" content="summary">
  <meta name="twitter:title" content="${escapeHtml(title)}">
  <meta name="twitter:description" content="${escapeHtml(description)}">`

  // 替换 <head> 中的 title 或在 </head> 前插入
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
