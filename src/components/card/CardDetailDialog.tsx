import { useState } from 'react'
import { Copy, Trash2, Loader2, Eye, EyeOff, Power } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'

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

interface Props {
  link: CardLink | null
  cards: Card[]
  onClose: () => void
  onRefresh: () => void
  onDelete: (code: string) => void
}

export function CardDetailDialog({ link, cards, onClose, onRefresh, onDelete }: Props) {
  const [showCardContent, setShowCardContent] = useState(false)
  const [addingCards, setAddingCards] = useState(false)
  const [newCards, setNewCards] = useState('')
  const origin = typeof window !== 'undefined' ? window.location.origin : ''

  if (!link) return null

  const handleToggle = async () => {
    const res = await fetch(`/api/card-link/${link.short_code}/toggle`, { method: 'POST' })
    const data = (await res.json()) as { success: boolean }
    if (data.success) {
      toast.success('状态已更新')
      onRefresh()
    }
  }

  const handleAddCards = async () => {
    const cardList = newCards.split('\n').map((s) => s.trim()).filter(Boolean)
    if (cardList.length === 0) return

    setAddingCards(true)
    try {
      const res = await fetch(`/api/card-link/${link.short_code}/add-cards`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cards: cardList }),
      })
      const data = (await res.json()) as { success: boolean; data?: { added_count: number } }
      if (data.success) {
        toast.success(`已添加 ${data.data?.added_count} 个卡密`)
        setNewCards('')
        onRefresh()
      }
    } finally {
      setAddingCards(false)
    }
  }

  const copyLink = () => {
    navigator.clipboard.writeText(`${origin}/c/${link.short_code}`)
    toast.success('链接已复制')
  }

  const isUnlimited = link.card_mode === 'one_to_many' && link.total_stock <= 0
  const remaining = isUnlimited ? '∞' : link.total_stock - link.sold_count

  return (
    <Dialog open={!!link} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{link.title}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {link.card_mode && link.card_mode !== 'one_to_one' && (
            <div className="flex items-center gap-2">
              {link.card_mode === 'one_to_many' && (
                <span className="text-xs px-2 py-1 rounded bg-blue-100 text-blue-600">
                  一对多模式{link.total_stock > 0 && `，限售 ${link.total_stock} 次`}
                </span>
              )}
              {link.card_mode === 'multi' && (
                <span className="text-xs px-2 py-1 rounded bg-purple-100 text-purple-600">
                  多对多模式：每单 {link.cards_per_order || 1} 个
                </span>
              )}
            </div>
          )}

          <div className="grid grid-cols-3 gap-4 p-4 rounded-lg bg-muted/50">
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">{link.price}</div>
              <div className="text-xs text-muted-foreground">单价</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">{link.sold_count}</div>
              <div className="text-xs text-muted-foreground">已售</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">{remaining}</div>
              <div className="text-xs text-muted-foreground">库存</div>
            </div>
          </div>

          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleToggle}>
              <Power className="size-4 mr-1" />
              {link.is_active ? '关闭' : '开启'}
            </Button>
            <Button variant="outline" size="sm" onClick={copyLink}>
              <Copy className="size-4 mr-1" />
              复制链接
            </Button>
            <Button variant="outline" size="sm" className="text-destructive" onClick={() => onDelete(link.short_code)}>
              <Trash2 className="size-4 mr-1" />
              删除
            </Button>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">卡密列表</span>
              <Button variant="ghost" size="sm" onClick={() => setShowCardContent(!showCardContent)}>
                {showCardContent ? <EyeOff className="size-4 mr-1" /> : <Eye className="size-4 mr-1" />}
                {showCardContent ? '隐藏' : '显示'}
              </Button>
            </div>
            <div className="space-y-1 max-h-48 overflow-y-auto">
              {cards.map((card) => (
                <div key={card.id} className={`flex items-center justify-between p-2 rounded text-sm ${card.status === 'sold' ? 'bg-gray-100' : 'bg-green-50'}`}>
                  <span className={`font-mono ${!showCardContent && 'blur-sm select-none'}`}>{card.content}</span>
                  <span className={`text-xs ${card.status === 'sold' ? 'text-gray-500' : 'text-green-600'}`}>
                    {card.status === 'sold' ? '已售' : '可用'}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">补充卡密</label>
            <Textarea placeholder="每行一个" rows={3} value={newCards} onChange={(e) => setNewCards(e.target.value)} />
            <Button size="sm" className="mt-2" onClick={handleAddCards} disabled={addingCards || !newCards.trim()}>
              {addingCards && <Loader2 className="size-4 animate-spin mr-1" />}
              添加
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
