import { useState, useEffect } from 'react'
import { Package, Trophy, Loader2, Copy, Check, Gift } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/contexts/auth-context'

interface CardOrder {
  id: string
  amount: number
  paid_at: number
  link_title: string
  link_code: string
  cards: string[]
}

interface LotteryRecord {
  id: string
  is_winner: number
  prize_content: string | null
  joined_at: number
  won_at: number | null
  lottery_title: string
  lottery_code: string
  lottery_status: string
}

export default function MyOrders() {
  useAuth()
  const [loading, setLoading] = useState(true)
  const [cardOrders, setCardOrders] = useState<CardOrder[]>([])
  const [lotteryRecords, setLotteryRecords] = useState<LotteryRecord[]>([])
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [tab, setTab] = useState<'cards' | 'lottery'>('cards')

  useEffect(() => {
    fetchOrders()
  }, [])

  const fetchOrders = async () => {
    try {
      const res = await fetch('/api/my/orders')
      const data = (await res.json()) as {
        success: boolean
        data?: { card_orders: CardOrder[]; lottery_records: LotteryRecord[] }
      }
      if (data.success && data.data) {
        setCardOrders(data.data.card_orders)
        setLotteryRecords(data.data.lottery_records)
      }
    } finally {
      setLoading(false)
    }
  }

  const copyCards = (id: string, cards: string[]) => {
    navigator.clipboard.writeText(cards.join('\n'))
    setCopiedId(id)
    toast.success('已复制卡密')
    setTimeout(() => setCopiedId(null), 2000)
  }

  const copyPrize = (id: string, content: string) => {
    navigator.clipboard.writeText(content)
    setCopiedId(id)
    toast.success('已复制奖品')
    setTimeout(() => setCopiedId(null), 2000)
  }

  const formatTime = (ts: number) => new Date(ts * 1000).toLocaleString('zh-CN')

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="border-b pb-4">
        <h1 className="text-2xl font-semibold">我的记录</h1>
        <p className="text-sm text-muted-foreground mt-1">查看购买的卡密和抽奖记录</p>
      </div>

      {/* Tab 切换 */}
      <div className="flex gap-2 border-b">
        <button
          className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
            tab === 'cards' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
          onClick={() => setTab('cards')}
        >
          <Package className="size-4 inline mr-1" />
          购买记录 ({cardOrders.length})
        </button>
        <button
          className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
            tab === 'lottery' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
          onClick={() => setTab('lottery')}
        >
          <Gift className="size-4 inline mr-1" />
          抽奖记录 ({lotteryRecords.length})
        </button>
      </div>

      {/* 购买记录 */}
      {tab === 'cards' && (
        <div className="space-y-4">
          {cardOrders.length === 0 ? (
            <div className="text-center py-12">
              <Package className="size-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">暂无购买记录</p>
            </div>
          ) : (
            cardOrders.map((order) => (
              <div key={order.id} className="rounded-xl border bg-card p-4">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-semibold">{order.link_title}</h3>
                    <p className="text-sm text-muted-foreground">{formatTime(order.paid_at)}</p>
                  </div>
                  <span className="text-sm font-medium text-primary">{order.amount} 积分</span>
                </div>
                <div className="space-y-2">
                  {order.cards.map((card, i) => (
                    <div key={i} className="flex items-center justify-between p-2 rounded bg-muted/50">
                      <code className="text-sm font-mono break-all flex-1 mr-2">{card}</code>
                    </div>
                  ))}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-3"
                  onClick={() => copyCards(order.id, order.cards)}
                >
                  {copiedId === order.id ? <Check className="size-4 mr-1" /> : <Copy className="size-4 mr-1" />}
                  {order.cards.length > 1 ? '复制全部' : '复制'}
                </Button>
              </div>
            ))
          )}
        </div>
      )}

      {/* 抽奖记录 */}
      {tab === 'lottery' && (
        <div className="space-y-4">
          {lotteryRecords.length === 0 ? (
            <div className="text-center py-12">
              <Gift className="size-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">暂无抽奖记录</p>
            </div>
          ) : (
            lotteryRecords.map((record) => (
              <div key={record.id} className="rounded-xl border bg-card p-4">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-semibold">{record.lottery_title}</h3>
                    <p className="text-sm text-muted-foreground">参与时间：{formatTime(record.joined_at)}</p>
                  </div>
                  {record.lottery_status === 'drawn' ? (
                    record.is_winner ? (
                      <span className="text-xs px-2 py-1 rounded bg-yellow-100 text-yellow-700 flex items-center gap-1">
                        <Trophy className="size-3" /> 中奖
                      </span>
                    ) : (
                      <span className="text-xs px-2 py-1 rounded bg-gray-100 text-gray-600">未中奖</span>
                    )
                  ) : (
                    <span className="text-xs px-2 py-1 rounded bg-blue-100 text-blue-600">等待开奖</span>
                  )}
                </div>
                {record.is_winner && record.prize_content && (
                  <div className="mt-3 p-3 rounded-lg bg-yellow-50 border border-yellow-200">
                    <p className="text-sm text-yellow-700 mb-2">🎉 恭喜中奖！</p>
                    <code className="text-sm font-mono break-all block">{record.prize_content}</code>
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-2"
                      onClick={() => copyPrize(record.id, record.prize_content!)}
                    >
                      {copiedId === record.id ? <Check className="size-4 mr-1" /> : <Copy className="size-4 mr-1" />}
                      复制奖品
                    </Button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}
