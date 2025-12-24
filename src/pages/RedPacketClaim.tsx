import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { Gift, Loader2, Check, Clock, Users, LogIn } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/contexts/auth-context'

interface RedPacket {
  id: string
  short_code: string
  total_amount: number
  remaining_amount: number
  total_count: number
  remaining_count: number
  type: string
  message: string | null
  status: string
  expires_at: number
  is_expired: boolean
  is_full: boolean
}

interface Claim {
  id: string
  user_id: string
  username: string
  amount: number
  status: string
}

interface CurrentUser {
  id: string
  username: string
}

export default function RedPacketClaim() {
  const { code } = useParams<{ code: string }>()
  useAuth()

  const [loading, setLoading] = useState(true)
  const [claiming, setClaiming] = useState(false)
  const [packet, setPacket] = useState<RedPacket | null>(null)
  const [claims, setClaims] = useState<Claim[]>([])
  const [userClaim, setUserClaim] = useState<Claim | null>(null)
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null)

  useEffect(() => {
    if (code) {
      fetchPacket()
    }
  }, [code])

  const fetchPacket = async () => {
    try {
      const res = await fetch(`/api/red-packet/${code}`)
      const data = await res.json() as {
        success: boolean
        data?: {
          packet: RedPacket
          claims: Claim[]
          user_claim: Claim | null
          current_user: CurrentUser | null
        }
        error?: string
      }

      if (data.success && data.data) {
        setPacket(data.data.packet)
        setClaims(data.data.claims)
        setUserClaim(data.data.user_claim)
        setCurrentUser(data.data.current_user)
      } else {
        toast.error(data.error || '红包不存在')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleClaim = async () => {
    if (!currentUser) {
      // 跳转登录，登录后返回
      window.location.href = `/api/auth/login?redirect=/r/${code}`
      return
    }

    setClaiming(true)
    try {
      const res = await fetch(`/api/red-packet/${code}/claim`, { method: 'POST' })
      const data = await res.json() as { success: boolean; data?: { amount: number; auto_sent?: boolean }; error?: string }

      if (data.success) {
        if (data.data?.auto_sent) {
          toast.success(`🎉 恭喜获得 ${data.data?.amount} 积分，已自动到账！`)
        } else {
          toast.success(`登记成功！您将获得 ${data.data?.amount} 积分`)
        }
        fetchPacket()
      } else {
        toast.error(data.error || '领取失败')
      }
    } catch {
      toast.error('网络错误')
    } finally {
      setClaiming(false)
    }
  }

  const handleLogin = () => {
    window.location.href = `/api/auth/login?redirect=/r/${code}`
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-red-50 to-white">
        <Loader2 className="size-8 animate-spin text-red-500" />
      </div>
    )
  }

  if (!packet) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-red-50 to-white">
        <div className="text-center">
          <Gift className="size-16 text-gray-300 mx-auto mb-4" />
          <h1 className="text-xl font-semibold text-gray-600">红包不存在</h1>
          <p className="text-gray-400 mt-2">该红包可能已被删除</p>
        </div>
      </div>
    )
  }

  const claimedCount = packet.total_count - packet.remaining_count
  const canClaim = !packet.is_expired && !packet.is_full && packet.status !== 'finished' && !userClaim

  return (
    <div className="min-h-screen bg-gradient-to-b from-red-500 to-red-600 flex flex-col items-center justify-center p-4">
      {/* 红包卡片 */}
      <div className="w-full max-w-sm bg-gradient-to-b from-red-600 to-red-700 rounded-3xl shadow-2xl overflow-hidden">
        {/* 顶部装饰 */}
        <div className="h-2 bg-gradient-to-r from-yellow-400 via-yellow-300 to-yellow-400" />

        {/* 红包内容 */}
        <div className="p-6 text-center text-white">
          {/* 祝福语 */}
          <div className="text-lg mb-4 opacity-90">
            {packet.message || '恭喜发财，大吉大利'}
          </div>

          {/* 金额 */}
          <div className="py-8">
            {userClaim ? (
              <>
                <div className="text-5xl font-bold text-yellow-300 mb-2">
                  {userClaim.amount}
                </div>
                <div className="text-sm opacity-80">
                  {userClaim.status === 'sent' ? '已到账' : '等待发放中'}
                </div>
              </>
            ) : packet.is_expired ? (
              <div className="text-xl opacity-80">红包已过期</div>
            ) : packet.is_full || packet.status === 'finished' ? (
              <div className="text-xl opacity-80">红包已被领完</div>
            ) : (
              <>
                <div className="text-4xl font-bold text-yellow-300 mb-2">
                  {packet.type === 'random' ? '拼手气红包' : `${(packet.total_amount / packet.total_count).toFixed(2)} 积分`}
                </div>
                <div className="text-sm opacity-80">
                  共 {packet.total_amount} 积分，{packet.total_count} 个
                </div>
              </>
            )}
          </div>

          {/* 领取按钮 */}
          {!currentUser ? (
            <Button
              size="lg"
              className="w-full bg-yellow-400 hover:bg-yellow-500 text-red-700 font-bold rounded-full"
              onClick={handleLogin}
            >
              <LogIn className="size-5 mr-2" />
              登录领取
            </Button>
          ) : canClaim ? (
            <Button
              size="lg"
              className="w-full bg-yellow-400 hover:bg-yellow-500 text-red-700 font-bold rounded-full"
              onClick={handleClaim}
              disabled={claiming}
            >
              {claiming ? (
                <Loader2 className="size-5 animate-spin mr-2" />
              ) : (
                <Gift className="size-5 mr-2" />
              )}
              开红包
            </Button>
          ) : userClaim ? (
            <div className="flex items-center justify-center gap-2 text-yellow-300">
              {userClaim.status === 'sent' ? (
                <Check className="size-5" />
              ) : (
                <Clock className="size-5" />
              )}
              <span>{userClaim.status === 'sent' ? '已领取' : '等待发放'}</span>
            </div>
          ) : null}

          {/* 当前用户 */}
          {currentUser && (
            <div className="mt-4 text-sm opacity-70">
              当前账号：{currentUser.username}
            </div>
          )}
        </div>

        {/* 底部装饰 */}
        <div className="h-2 bg-gradient-to-r from-yellow-400 via-yellow-300 to-yellow-400" />
      </div>

      {/* 领取记录 */}
      <div className="w-full max-w-sm mt-6 bg-white rounded-2xl shadow-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <span className="font-medium">领取记录</span>
          <span className="text-sm text-muted-foreground flex items-center gap-1">
            <Users className="size-4" />
            {claimedCount}/{packet.total_count}
          </span>
        </div>

        {claims.length === 0 ? (
          <div className="text-center text-muted-foreground py-4">
            还没有人领取，快来抢红包！
          </div>
        ) : (
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {claims.map((claim, index) => (
              <div
                key={claim.id}
                className="flex items-center justify-between py-2 border-b last:border-0"
              >
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{claim.username}</span>
                  {index === 0 && packet.type === 'random' && (
                    <span className="text-xs px-1.5 py-0.5 rounded bg-yellow-100 text-yellow-700">
                      手气最佳
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-red-600">
                    {claim.amount} 积分
                  </span>
                  {claim.status === 'sent' && <Check className="size-4 text-green-500" />}
                  {claim.status === 'pending' && <Clock className="size-4 text-yellow-500" />}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
