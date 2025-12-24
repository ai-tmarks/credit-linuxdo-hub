import { useState, useEffect } from 'react'
import { CreditCard, Copy, Loader2, Package } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/contexts/auth-context'
import { CreateCardDialog } from '@/components/card/CreateCardDialog'
import { CardDetailDialog } from '@/components/card/CardDetailDialog'

interface CardLink {
  id: string
  short_code: string
  title: string
  price: number
  total_stock: number
  sold_count: number
  card_mode?: string
  cards_per_order?: number
  is_active: number
}

interface Card {
  id: string
  content: string
  status: string
}

export default function CardLinks() {
  useAuth()
  const [links, setLinks] = useState<CardLink[]>([])
  const [loading, setLoading] = useState(true)
  const [detailLink, setDetailLink] = useState<CardLink | null>(null)
  const [detailCards, setDetailCards] = useState<Card[]>([])
  const origin = typeof window !== 'undefined' ? window.location.origin : ''

  useEffect(() => {
    fetchLinks()
  }, [])

  const fetchLinks = async () => {
    try {
      const res = await fetch('/api/card-link')
      const data = (await res.json()) as { success: boolean; data?: { links: CardLink[] } }
      if (data.success) setLinks(data.data?.links || [])
    } finally {
      setLoading(false)
    }
  }

  const fetchDetail = async (code: string) => {
    const res = await fetch(`/api/card-link/${code}`)
    const data = (await res.json()) as { success: boolean; data?: { link: CardLink; cards: Card[] } }
    if (data.success && data.data) {
      setDetailLink(data.data.link)
      setDetailCards(data.data.cards)
    }
  }

  const handleDelete = async (code: string) => {
    if (!confirm('确定删除？')) return
    await fetch(`/api/card-link/${code}`, { method: 'DELETE' })
    setLinks(links.filter((l) => l.short_code !== code))
    setDetailLink(null)
    toast.success('删除成功')
  }

  const copyLink = (code: string) => {
    navigator.clipboard.writeText(`${origin}/c/${code}`)
    toast.success('链接已复制')
  }

  const handleRefresh = () => {
    if (detailLink) fetchDetail(detailLink.short_code)
    fetchLinks()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between border-b pb-4">
        <div>
          <h1 className="text-2xl font-semibold">发卡链接</h1>
          <p className="text-sm text-muted-foreground mt-1">创建商品链接，用户付款后自动发放卡密</p>
        </div>
        <CreateCardDialog onCreated={fetchLinks} />
      </div>

      {loading ? (
        <div className="flex items-center justify-center min-h-[40vh]">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      ) : links.length === 0 ? (
        <div className="flex items-center justify-center min-h-[40vh]">
          <div className="text-center">
            <div className="rounded-lg p-3 bg-muted/50 w-fit mx-auto mb-4">
              <CreditCard className="size-8 text-muted-foreground" />
            </div>
            <h3 className="font-medium mb-1">暂无商品</h3>
            <p className="text-sm text-muted-foreground mb-4">创建您的第一个发卡商品</p>
            <CreateCardDialog onCreated={fetchLinks} />
          </div>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {links.map((link) => {
            const isUnlimited = link.card_mode === 'one_to_many' && link.total_stock <= 0
            const remaining = link.total_stock - link.sold_count
            const isSoldOut = !isUnlimited && remaining <= 0
            return (
              <div
                key={link.id}
                className="rounded-xl border bg-card p-4 cursor-pointer hover:border-primary/50 transition-colors"
                onClick={() => fetchDetail(link.short_code)}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="size-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Package className="size-5 text-primary" />
                    </div>
                    <div>
                      <div className="font-semibold">{link.title}</div>
                      <div className="text-sm text-primary font-medium">{link.price} 积分</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    {link.card_mode === 'one_to_many' && <span className="text-xs px-2 py-0.5 rounded bg-blue-100 text-blue-600">一对多</span>}
                    {link.card_mode === 'multi' && <span className="text-xs px-2 py-0.5 rounded bg-purple-100 text-purple-600">多对多</span>}
                    {!link.is_active ? (
                      <span className="text-xs px-2 py-0.5 rounded bg-gray-100 text-gray-600">已关闭</span>
                    ) : isSoldOut ? (
                      <span className="text-xs px-2 py-0.5 rounded bg-red-100 text-red-600">已售罄</span>
                    ) : (
                      <span className="text-xs px-2 py-0.5 rounded bg-green-100 text-green-600">销售中</span>
                    )}
                  </div>
                </div>
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <span>库存：{isUnlimited ? '∞' : `${remaining}/${link.total_stock}`}</span>
                  <span>已售：{link.sold_count}</span>
                </div>
                <div className="mt-3 pt-3 border-t flex items-center justify-between">
                  <code className="text-xs text-muted-foreground truncate flex-1">{origin}/c/{link.short_code}</code>
                  <Button variant="ghost" size="icon" className="size-8 ml-2" onClick={(e) => { e.stopPropagation(); copyLink(link.short_code) }}>
                    <Copy className="size-4" />
                  </Button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      <CardDetailDialog link={detailLink} cards={detailCards} onClose={() => setDetailLink(null)} onRefresh={handleRefresh} onDelete={handleDelete} />
    </div>
  )
}
