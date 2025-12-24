import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { Gift, Loader2, Users, Clock, Trophy, Check, LogIn } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'

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
  prize_content: string | null
}

interface LotteryData {
  id: string
  title: string
  description: string | null
  join_type: string
  join_price: number
  draw_type: string
  draw_time: number | null
  draw_count: number | null
  max_participants: number
  participant_count: number
  status: string
  prizes: Prize[]
  participants: Participant[]
  user_joined: boolean
  user_won: boolean
  user_prize: string | null
}

export default function LotteryJoin() {
  const { code } = useParams<{ code: string }>()
  const [loading, setLoading] = useState(true)
  const [joining, setJoining] = useState(false)
  const [lottery, setLottery] = useState<LotteryData | null>(null)
  const [isLoggedIn, setIsLoggedIn] = useState(false)

  useEffect(() => {
    if (code) fetchLottery()
  }, [code])

  const fetchLottery = async () => {
    try {
      const res = await fetch(`/api/l/${code}`)
      const data = (await res.json()) as { success: boolean; data?: LotteryData; logged_in?: boolean }
      if (data.success && data.data) {
        setLottery(data.data)
        setIsLoggedIn(data.logged_in || false)
      }
    } finally {
      setLoading(false)
    }
  }

  const handleJoin = async () => {
    if (!isLoggedIn) {
      window.location.href = '/api/auth/login?redirect=' + encodeURIComponent(window.location.pathname)
      return
    }
    setJoining(true)
    try {
      const res = await fetch(`/api/l/${code}/join`, { method: 'POST' })
      const data = (await res.json()) as { success: boolean; error?: string }
      if (data.success) {
        toast.success('参与成功！')
        fetchLottery()
      } else {
        toast.error(data.error || '参与失败')
      }
    } finally {
      setJoining(false)
    }
  }

  const formatTime = (timestamp: number) => new Date(timestamp * 1000).toLocaleString('zh-CN')

  const getTimeRemaining = (timestamp: number) => {
    const now = Date.now() / 1000
    const diff = timestamp - now
    if (diff <= 0) return '即将开奖'
    const hours = Math.floor(diff / 3600)
    const minutes = Math.floor((diff % 3600) / 60)
    if (hours > 24) return `${Math.floor(hours / 24)} 天后`
    if (hours > 0) return `${hours} 小时 ${minutes} 分钟后`
    return `${minutes} 分钟后`
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-purple-50 to-white">
        <Loader2 className="size-8 animate-spin text-purple-500" />
      </div>
    )
  }

  if (!lottery) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-gray-50 to-white">
        <div className="text-center">
          <Gift className="size-16 text-gray-300 mx-auto mb-4" />
          <h1 className="text-xl font-semibold text-gray-600">活动不存在</h1>
          <p className="text-gray-400 mt-2">该抽奖活动可能已被删除</p>
        </div>
      </div>
    )
  }

  const isDrawn = lottery.status === 'drawn'
  const totalPrizes = lottery.prizes.reduce((sum, p) => sum + p.winner_count, 0)

  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-50 to-white py-8 px-4">
      <div className="max-w-lg mx-auto">
        {/* 活动卡片 */}
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          {/* 顶部 */}
          <div className="bg-gradient-to-r from-purple-500 to-pink-500 p-6 text-white text-center">
            <div className="size-16 rounded-2xl bg-white/20 flex items-center justify-center mx-auto mb-4">
              <Gift className="size-8" />
            </div>
            <h1 className="text-xl font-bold">{lottery.title}</h1>
            {lottery.description && <p className="text-purple-100 text-sm mt-2">{lottery.description}</p>}
            {isDrawn && (
              <div className="mt-3 inline-flex items-center gap-1 px-3 py-1 rounded-full bg-white/20 text-sm">
                <Trophy className="size-4" /> 已开奖
              </div>
            )}
          </div>

          <div className="p-6">
            {/* 活动信息 */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="p-3 rounded-lg bg-purple-50 text-center">
                <div className="text-2xl font-bold text-purple-600">{lottery.participant_count}</div>
                <div className="text-xs text-muted-foreground flex items-center justify-center gap-1">
                  <Users className="size-3" /> 参与人数
                </div>
              </div>
              <div className="p-3 rounded-lg bg-pink-50 text-center">
                <div className="text-2xl font-bold text-pink-600">{totalPrizes}</div>
                <div className="text-xs text-muted-foreground flex items-center justify-center gap-1">
                  <Trophy className="size-3" /> 奖品数量
                </div>
              </div>
            </div>

            {/* 开奖信息 */}
            {!isDrawn && (
              <div className="mb-6 p-3 rounded-lg bg-yellow-50 text-yellow-700 text-sm flex items-center gap-2">
                <Clock className="size-4 shrink-0" />
                {lottery.draw_type === 'time' && lottery.draw_time ? (
                  <span>开奖时间：{formatTime(lottery.draw_time)}（{getTimeRemaining(lottery.draw_time)}）</span>
                ) : lottery.draw_type === 'count' ? (
                  <span>满 {lottery.draw_count} 人自动开奖（还差 {Math.max(0, (lottery.draw_count || 0) - lottery.participant_count)} 人）</span>
                ) : (
                  <span>主办方手动开奖</span>
                )}
              </div>
            )}

            {/* 奖品列表 */}
            <div className="mb-6">
              <h3 className="text-sm font-medium mb-3 flex items-center gap-1">
                <Trophy className="size-4 text-yellow-500" /> 奖品列表
              </h3>
              <div className="space-y-2">
                {lottery.prizes.map((prize, index) => (
                  <div key={prize.id} className="flex items-center justify-between p-3 rounded-lg bg-gradient-to-r from-yellow-50 to-orange-50">
                    <div className="flex items-center gap-2">
                      <span className="size-6 rounded-full bg-yellow-400 text-white text-xs flex items-center justify-center font-bold">
                        {index + 1}
                      </span>
                      <span className="font-medium">{prize.name}</span>
                    </div>
                    <span className="text-sm text-muted-foreground">
                      {isDrawn ? `${prize.won_count}/${prize.winner_count} 人` : `${prize.winner_count} 名`}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* 用户状态和操作 */}
            {lottery.user_won ? (
              <div className="p-4 rounded-lg bg-green-50 border border-green-200 text-center">
                <div className="size-12 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-2">
                  <Trophy className="size-6 text-green-600" />
                </div>
                <h3 className="font-semibold text-green-700 mb-1">恭喜中奖！</h3>
                {lottery.user_prize && (
                  <div className="mt-2 p-3 rounded bg-white font-mono text-sm break-all">{lottery.user_prize}</div>
                )}
              </div>
            ) : lottery.user_joined ? (
              <div className="p-4 rounded-lg bg-blue-50 border border-blue-200 text-center">
                <div className="size-12 rounded-full bg-blue-100 flex items-center justify-center mx-auto mb-2">
                  <Check className="size-6 text-blue-600" />
                </div>
                <h3 className="font-semibold text-blue-700">已参与</h3>
                <p className="text-sm text-blue-600 mt-1">
                  {isDrawn ? '很遗憾，未中奖' : '等待开奖中...'}
                </p>
              </div>
            ) : isDrawn ? (
              <div className="p-4 rounded-lg bg-gray-50 text-center">
                <p className="text-muted-foreground">活动已结束</p>
              </div>
            ) : (
              <div>
                {lottery.join_type === 'paid' && (
                  <p className="text-center text-sm text-muted-foreground mb-3">
                    参与费用：<span className="font-semibold text-purple-600">{lottery.join_price} 积分</span>
                  </p>
                )}
                {isLoggedIn ? (
                  <Button className="w-full" size="lg" onClick={handleJoin} disabled={joining}>
                    {joining ? <Loader2 className="size-5 animate-spin mr-2" /> : <Gift className="size-5 mr-2" />}
                    {lottery.join_type === 'paid' ? `支付 ${lottery.join_price} 积分参与` : '立即参与'}
                  </Button>
                ) : (
                  <Button className="w-full" size="lg" onClick={handleJoin}>
                    <LogIn className="size-5 mr-2" /> 登录后参与
                  </Button>
                )}
              </div>
            )}

            {/* 参与者列表 */}
            {lottery.participants.length > 0 && (
              <div className="mt-6 pt-6 border-t">
                <h3 className="text-sm font-medium mb-3 flex items-center gap-1">
                  <Users className="size-4" /> 参与者 ({lottery.participants.length})
                </h3>
                <div className="flex flex-wrap gap-2">
                  {lottery.participants.slice(0, 20).map((p) => (
                    <span
                      key={p.id}
                      className={`px-2 py-1 rounded text-xs ${p.is_winner ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-600'}`}
                    >
                      {p.username} {p.is_winner && '🎉'}
                    </span>
                  ))}
                  {lottery.participants.length > 20 && (
                    <span className="px-2 py-1 rounded text-xs bg-gray-100 text-gray-600">
                      +{lottery.participants.length - 20} 人
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        <p className="text-center text-xs text-muted-foreground mt-4">
          <Link to="/" className="hover:underline">LinuxDo Credit Hub</Link>
        </p>
      </div>
    </div>
  )
}
