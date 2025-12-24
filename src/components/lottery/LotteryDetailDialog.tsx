import { useState } from 'react'
import { Copy, Trash2, Loader2, Users, Trophy, Play } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'

interface Prize {
  id: string
  name: string
  prize_type: string
  winner_count: number
  won_count: number
}

interface Participant {
  id: string
  username: string
  is_winner: number
  joined_at: number
}

interface LotteryDetail {
  short_code: string
  title: string
  participant_count: number
  status: string
  prizes: Prize[]
  participants: Participant[]
}

interface Props {
  lottery: LotteryDetail | null
  onClose: () => void
  onRefresh: () => void
  onDelete: (code: string) => void
}

export function LotteryDetailDialog({ lottery, onClose, onRefresh, onDelete }: Props) {
  const [drawing, setDrawing] = useState(false)
  const origin = typeof window !== 'undefined' ? window.location.origin : ''

  if (!lottery) return null

  const handleDraw = async () => {
    if (!confirm('确定要立即开奖吗？')) return
    setDrawing(true)
    try {
      const res = await fetch(`/api/lottery/${lottery.short_code}/draw`, { method: 'POST' })
      const data = (await res.json()) as { success: boolean; error?: string }
      if (data.success) {
        toast.success('开奖成功！')
        onRefresh()
      } else {
        toast.error(data.error || '开奖失败')
      }
    } finally {
      setDrawing(false)
    }
  }

  const copyLink = () => {
    navigator.clipboard.writeText(`${origin}/l/${lottery.short_code}`)
    toast.success('链接已复制')
  }

  const totalPrizes = lottery.prizes.reduce((sum, p) => sum + p.winner_count, 0)
  const totalWon = lottery.prizes.reduce((sum, p) => sum + p.won_count, 0)

  return (
    <Dialog open={!!lottery} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{lottery.title}</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-4 p-4 rounded-lg bg-muted/50">
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">{lottery.participant_count}</div>
              <div className="text-xs text-muted-foreground">参与人数</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">{totalPrizes}</div>
              <div className="text-xs text-muted-foreground">奖品数量</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">{totalWon}</div>
              <div className="text-xs text-muted-foreground">已中奖</div>
            </div>
          </div>

          <div className="flex gap-2">
            {lottery.status === 'active' && (
              <Button variant="default" size="sm" onClick={handleDraw} disabled={drawing}>
                {drawing ? <Loader2 className="size-4 animate-spin mr-1" /> : <Play className="size-4 mr-1" />}立即开奖
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={copyLink}><Copy className="size-4 mr-1" />复制链接</Button>
            <Button variant="outline" size="sm" className="text-destructive" onClick={() => onDelete(lottery.short_code)}>
              <Trash2 className="size-4 mr-1" />删除
            </Button>
          </div>

          <div>
            <h3 className="text-sm font-medium mb-2 flex items-center gap-1"><Trophy className="size-4" />奖品列表</h3>
            <div className="space-y-2">
              {lottery.prizes.map((prize) => (
                <div key={prize.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                  <div>
                    <div className="font-medium">{prize.name}</div>
                    <div className="text-xs text-muted-foreground">{prize.prize_type === 'card' ? '卡密' : '文本'}</div>
                  </div>
                  <div className="text-sm">{prize.won_count}/{prize.winner_count} 人中奖</div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h3 className="text-sm font-medium mb-2 flex items-center gap-1"><Users className="size-4" />参与者 ({lottery.participants.length})</h3>
            <div className="max-h-48 overflow-y-auto space-y-1">
              {lottery.participants.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">暂无参与者</p>
              ) : (
                lottery.participants.map((p) => (
                  <div key={p.id} className={`flex items-center justify-between p-2 rounded text-sm ${p.is_winner ? 'bg-yellow-50' : 'bg-muted/30'}`}>
                    <span>{p.username}</span>
                    {p.is_winner ? (
                      <span className="text-yellow-600 flex items-center gap-1"><Trophy className="size-3" />中奖</span>
                    ) : (
                      <span className="text-muted-foreground">{new Date(p.joined_at * 1000).toLocaleString('zh-CN')}</span>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
