import { useState, useEffect } from 'react'
import { Gift, Copy, Loader2, Users, Clock } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/contexts/auth-context'
import { CreateLotteryDialog } from '@/components/lottery/CreateLotteryDialog'
import { LotteryDetailDialog } from '@/components/lottery/LotteryDetailDialog'

interface Lottery {
  id: string
  short_code: string
  title: string
  join_type: string
  join_price: number
  draw_type: string
  draw_time: number | null
  draw_count: number | null
  participant_count: number
  status: string
}

interface LotteryDetail extends Lottery {
  prizes: Array<{ id: string; name: string; prize_type: string; winner_count: number; won_count: number }>
  participants: Array<{ id: string; username: string; is_winner: number; joined_at: number }>
}

export default function Lotteries() {
  useAuth()
  const [lotteries, setLotteries] = useState<Lottery[]>([])
  const [loading, setLoading] = useState(true)
  const [detailLottery, setDetailLottery] = useState<LotteryDetail | null>(null)
  const origin = typeof window !== 'undefined' ? window.location.origin : ''

  useEffect(() => {
    fetchLotteries()
  }, [])

  const fetchLotteries = async () => {
    try {
      const res = await fetch('/api/lottery')
      const data = (await res.json()) as { success: boolean; data?: { lotteries: Lottery[] } }
      if (data.success) setLotteries(data.data?.lotteries || [])
    } finally {
      setLoading(false)
    }
  }

  const fetchDetail = async (code: string) => {
    const res = await fetch(`/api/lottery/${code}`)
    const data = (await res.json()) as { success: boolean; data?: { lottery: LotteryDetail } }
    if (data.success && data.data) setDetailLottery(data.data.lottery)
  }

  const handleDelete = async (code: string) => {
    if (!confirm('确定删除？')) return
    await fetch(`/api/lottery/${code}`, { method: 'DELETE' })
    setLotteries(lotteries.filter((l) => l.short_code !== code))
    setDetailLottery(null)
    toast.success('删除成功')
  }

  const copyLink = (code: string) => {
    navigator.clipboard.writeText(`${origin}/l/${code}`)
    toast.success('链接已复制')
  }

  const handleRefresh = () => {
    if (detailLottery) fetchDetail(detailLottery.short_code)
    fetchLotteries()
  }

  const getStatusBadge = (lottery: Lottery) => {
    if (lottery.status === 'drawn') return <span className="text-xs px-2 py-0.5 rounded bg-green-100 text-green-600">已开奖</span>
    if (lottery.status === 'cancelled') return <span className="text-xs px-2 py-0.5 rounded bg-gray-100 text-gray-600">已取消</span>
    return <span className="text-xs px-2 py-0.5 rounded bg-blue-100 text-blue-600">进行中</span>
  }

  const formatTime = (ts: number) => new Date(ts * 1000).toLocaleString('zh-CN')

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between border-b pb-4">
        <div>
          <h1 className="text-2xl font-semibold">抽奖活动</h1>
          <p className="text-sm text-muted-foreground mt-1">创建抽奖活动，用户参与后自动开奖</p>
        </div>
        <CreateLotteryDialog onCreated={fetchLotteries} />
      </div>

      {loading ? (
        <div className="flex items-center justify-center min-h-[40vh]">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      ) : lotteries.length === 0 ? (
        <div className="flex items-center justify-center min-h-[40vh]">
          <div className="text-center">
            <div className="rounded-lg p-3 bg-muted/50 w-fit mx-auto mb-4">
              <Gift className="size-8 text-muted-foreground" />
            </div>
            <h3 className="font-medium mb-1">暂无抽奖</h3>
            <p className="text-sm text-muted-foreground mb-4">创建您的第一个抽奖活动</p>
            <CreateLotteryDialog onCreated={fetchLotteries} />
          </div>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {lotteries.map((lottery) => (
            <div
              key={lottery.id}
              className="rounded-xl border bg-card p-4 cursor-pointer hover:border-primary/50 transition-colors"
              onClick={() => fetchDetail(lottery.short_code)}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="size-10 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                    <Gift className="size-5 text-white" />
                  </div>
                  <div>
                    <div className="font-semibold">{lottery.title}</div>
                    <div className="text-sm text-muted-foreground">{lottery.join_type === 'free' ? '免费参与' : `${lottery.join_price} 积分`}</div>
                  </div>
                </div>
                {getStatusBadge(lottery)}
              </div>
              <div className="flex items-center justify-between text-sm text-muted-foreground mb-3">
                <span className="flex items-center gap-1"><Users className="size-4" />{lottery.participant_count} 人参与</span>
                <span className="flex items-center gap-1">
                  <Clock className="size-4" />
                  {lottery.draw_type === 'time' ? (lottery.draw_time ? formatTime(lottery.draw_time) : '待定') : lottery.draw_type === 'count' ? `${lottery.draw_count} 人开奖` : '手动'}
                </span>
              </div>
              <div className="pt-3 border-t flex items-center justify-between">
                <code className="text-xs text-muted-foreground truncate flex-1">{origin}/l/{lottery.short_code}</code>
                <Button variant="ghost" size="icon" className="size-8 ml-2" onClick={(e) => { e.stopPropagation(); copyLink(lottery.short_code) }}>
                  <Copy className="size-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <LotteryDetailDialog lottery={detailLottery} onClose={() => setDetailLottery(null)} onRefresh={handleRefresh} onDelete={handleDelete} />
    </div>
  )
}
