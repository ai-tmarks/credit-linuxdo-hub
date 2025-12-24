import { useState, useEffect } from 'react'
import { Gift, Plus, Send, Loader2, Users, Coins, Clock, Check, X } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
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
  created_at: number
  is_expired?: boolean
  is_full?: boolean
}

interface Claim {
  id: string
  user_id: string
  username: string
  amount: number
  status: string
  created_at: number
}

export default function RedPackets() {
  useAuth()
  const [packets, setPackets] = useState<RedPacket[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [selectedPacket, setSelectedPacket] = useState<RedPacket | null>(null)
  const [claims, setClaims] = useState<Claim[]>([])
  const [sending, setSending] = useState(false)

  const [form, setForm] = useState({
    total_amount: '',
    total_count: '',
    type: 'random',
    message: '',
    expires_hours: '24',
  })

  const origin = typeof window !== 'undefined' ? window.location.origin : ''

  useEffect(() => {
    fetchPackets()
  }, [])

  const fetchPackets = async () => {
    try {
      const res = await fetch('/api/red-packet')
      const data = await res.json() as { success: boolean; data?: { packets: RedPacket[] }; error?: string }
      if (data.success) {
        setPackets(data.data?.packets || [])
      }
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = async () => {
    const amount = parseFloat(form.total_amount)
    const count = parseInt(form.total_count)

    if (!amount || amount <= 0) {
      toast.error('请输入有效金额')
      return
    }
    if (!count || count <= 0 || count > 100) {
      toast.error('人数需在1-100之间')
      return
    }

    setCreating(true)
    try {
      const res = await fetch('/api/red-packet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          total_amount: amount,
          total_count: count,
          type: form.type,
          message: form.message || undefined,
          expires_hours: parseInt(form.expires_hours),
        }),
      })
      const data = await res.json() as { success: boolean; data?: RedPacket; error?: string }
      if (data.success) {
        toast.success('创建成功')
        setDialogOpen(false)
        setForm({ total_amount: '', total_count: '', type: 'random', message: '', expires_hours: '24' })
        fetchPackets()
      } else {
        toast.error(data.error || '创建失败')
      }
    } catch {
      toast.error('网络错误')
    } finally {
      setCreating(false)
    }
  }

  const fetchPacketDetail = async (code: string) => {
    const res = await fetch(`/api/red-packet/${code}`)
    const data = await res.json() as { success: boolean; data?: { packet: RedPacket; claims: Claim[] } }
    if (data.success && data.data) {
      setSelectedPacket(data.data.packet)
      setClaims(data.data.claims)
    }
  }

  const handleSend = async (code: string) => {
    if (!confirm('确定发放红包？将向所有已登记的用户转账。')) return

    setSending(true)
    try {
      const res = await fetch(`/api/red-packet/${code}/send`, { method: 'POST' })
      const data = await res.json() as { success: boolean; data?: { success_count: number; fail_count: number }; error?: string }
      if (data.success) {
        toast.success(`发放完成：成功 ${data.data?.success_count} 人，失败 ${data.data?.fail_count} 人`)
        fetchPacketDetail(code)
        fetchPackets()
      } else {
        toast.error(data.error || '发放失败')
      }
    } catch {
      toast.error('网络错误')
    } finally {
      setSending(false)
    }
  }

  const getStatusBadge = (packet: RedPacket) => {
    if (packet.status === 'finished') return <span className="text-xs px-2 py-0.5 rounded bg-green-100 text-green-700">已完成</span>
    if (packet.status === 'sending') return <span className="text-xs px-2 py-0.5 rounded bg-yellow-100 text-yellow-700">发放中</span>
    if (packet.is_expired) return <span className="text-xs px-2 py-0.5 rounded bg-gray-100 text-gray-600">已过期</span>
    if (packet.is_full || packet.remaining_count === 0) return <span className="text-xs px-2 py-0.5 rounded bg-blue-100 text-blue-700">已领完</span>
    return <span className="text-xs px-2 py-0.5 rounded bg-orange-100 text-orange-700">进行中</span>
  }

  return (
    <div className="space-y-6">
      {/* 页头 */}
      <div className="flex items-center justify-between border-b pb-4">
        <div>
          <h1 className="text-2xl font-semibold">红包管理</h1>
          <p className="text-sm text-muted-foreground mt-1">创建红包，分享链接，等人齐后发放</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="h-8 text-xs">
              <Plus className="size-3 mr-1" />创建红包
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>创建红包</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">总金额</label>
                  <Input
                    type="number"
                    placeholder="100"
                    value={form.total_amount}
                    onChange={(e) => setForm({ ...form, total_amount: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">红包个数</label>
                  <Input
                    type="number"
                    placeholder="10"
                    value={form.total_count}
                    onChange={(e) => setForm({ ...form, total_count: e.target.value })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">类型</label>
                  <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="random">拼手气红包</SelectItem>
                      <SelectItem value="fixed">固定金额</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">有效期</label>
                  <Select value={form.expires_hours} onValueChange={(v) => setForm({ ...form, expires_hours: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1小时</SelectItem>
                      <SelectItem value="6">6小时</SelectItem>
                      <SelectItem value="24">24小时</SelectItem>
                      <SelectItem value="72">3天</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">祝福语（可选）</label>
                <Input
                  placeholder="恭喜发财，大吉大利"
                  value={form.message}
                  onChange={(e) => setForm({ ...form, message: e.target.value })}
                />
              </div>
              <Button className="w-full" onClick={handleCreate} disabled={creating}>
                {creating && <Loader2 className="size-4 animate-spin mr-2" />}
                创建红包
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* 红包列表 */}
      {loading ? (
        <div className="flex items-center justify-center min-h-[40vh]">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      ) : packets.length === 0 ? (
        <div className="flex items-center justify-center min-h-[40vh]">
          <div className="text-center">
            <div className="rounded-lg p-3 bg-muted/50 w-fit mx-auto mb-4">
              <Gift className="size-8 text-muted-foreground" />
            </div>
            <h3 className="font-medium mb-1">暂无红包</h3>
            <p className="text-sm text-muted-foreground mb-4">创建您的第一个红包</p>
            <Button size="sm" onClick={() => setDialogOpen(true)}>
              <Plus className="size-3 mr-1" />创建红包
            </Button>
          </div>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {packets.map((packet) => (
            <div
              key={packet.id}
              className="rounded-xl border bg-card p-4 cursor-pointer hover:border-primary/50 transition-colors"
              onClick={() => fetchPacketDetail(packet.short_code)}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="size-10 rounded-lg bg-red-500/10 flex items-center justify-center">
                    <Gift className="size-5 text-red-500" />
                  </div>
                  <div>
                    <div className="font-semibold">{packet.total_amount} 积分</div>
                    <div className="text-xs text-muted-foreground">
                      {packet.type === 'random' ? '拼手气' : '固定金额'}
                    </div>
                  </div>
                </div>
                {getStatusBadge(packet)}
              </div>

              <div className="grid grid-cols-3 gap-2 text-sm mb-3">
                <div className="flex items-center gap-1 text-muted-foreground">
                  <Users className="size-3" />
                  <span>{packet.total_count - packet.remaining_count}/{packet.total_count}</span>
                </div>
                <div className="flex items-center gap-1 text-muted-foreground">
                  <Coins className="size-3" />
                  <span>{packet.remaining_amount.toFixed(2)}</span>
                </div>
                <div className="flex items-center gap-1 text-muted-foreground">
                  <Clock className="size-3" />
                  <span>{Math.max(0, Math.floor((packet.expires_at - Date.now() / 1000) / 3600))}h</span>
                </div>
              </div>

              <div className="text-xs text-muted-foreground truncate">
                链接：{origin}/r/{packet.short_code}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 红包详情弹窗 */}
      <Dialog open={!!selectedPacket} onOpenChange={(open) => !open && setSelectedPacket(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>红包详情</DialogTitle>
          </DialogHeader>
          {selectedPacket && (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 rounded-lg bg-red-50">
                <div>
                  <div className="text-2xl font-bold text-red-600">{selectedPacket.total_amount}</div>
                  <div className="text-sm text-red-600/70">总金额</div>
                </div>
                <div className="text-right">
                  <div className="text-lg font-semibold">
                    {selectedPacket.total_count - selectedPacket.remaining_count}/{selectedPacket.total_count}
                  </div>
                  <div className="text-sm text-muted-foreground">已领取</div>
                </div>
              </div>

              {selectedPacket.message && (
                <div className="text-center text-sm text-muted-foreground italic">
                  "{selectedPacket.message}"
                </div>
              )}

              <div className="p-3 rounded-lg bg-muted/50">
                <div className="text-xs text-muted-foreground mb-1">领取链接</div>
                <code className="text-sm break-all">{origin}/r/{selectedPacket.short_code}</code>
              </div>

              {/* 领取记录 */}
              <div>
                <div className="text-sm font-medium mb-2">领取记录</div>
                {claims.length === 0 ? (
                  <div className="text-sm text-muted-foreground text-center py-4">暂无人领取</div>
                ) : (
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {claims.map((claim) => (
                      <div key={claim.id} className="flex items-center justify-between p-2 rounded bg-muted/30">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{claim.username}</span>
                          <span className="text-sm text-muted-foreground">{claim.amount} 积分</span>
                        </div>
                        <div>
                          {claim.status === 'sent' && <Check className="size-4 text-green-600" />}
                          {claim.status === 'failed' && <X className="size-4 text-red-600" />}
                          {claim.status === 'pending' && <Clock className="size-4 text-yellow-600" />}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* 发放按钮 */}
              {selectedPacket.status !== 'finished' && claims.some(c => c.status === 'pending') && (
                <Button
                  className="w-full"
                  onClick={() => handleSend(selectedPacket.short_code)}
                  disabled={sending}
                >
                  {sending ? (
                    <Loader2 className="size-4 animate-spin mr-2" />
                  ) : (
                    <Send className="size-4 mr-2" />
                  )}
                  发放红包
                </Button>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
