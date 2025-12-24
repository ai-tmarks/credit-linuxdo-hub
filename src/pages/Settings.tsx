import { useState, useEffect } from 'react'
import { Save, Loader2, Copy, ExternalLink, Check, X, Package, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useAuth } from '@/contexts/auth-context'

interface UserSettings {
  epay_pid: string
  epay_key: string
}

interface PendingOrder {
  id: string
  out_trade_no: string
  buyer_username: string
  amount: number
  created_at: number
  link_title: string
  status: string
}

export default function Settings() {
  useAuth()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [form, setForm] = useState<UserSettings>({ epay_pid: '', epay_key: '' })
  const [orders, setOrders] = useState<PendingOrder[]>([])
  const [showAll, setShowAll] = useState(false)
  const [processingId, setProcessingId] = useState<string | null>(null)

  const origin = window.location.origin
  const notifyUrl = `${origin}/api/callback`

  const fetchOrders = async (all = false) => {
    setRefreshing(true)
    try {
      const res = await fetch(`/api/admin/pending-orders${all ? '?all=1' : ''}`)
      const data = (await res.json()) as { success: boolean; data?: { orders: PendingOrder[] } }
      if (data.success && data.data) setOrders(data.data.orders || [])
    } finally {
      setRefreshing(false)
    }
  }

  useEffect(() => {
    Promise.all([
      fetch('/api/settings').then(r => r.json()),
      fetch('/api/admin/pending-orders').then(r => r.json()),
    ]).then(([settings, ordersData]) => {
      if (settings.success && settings.data) setForm(settings.data)
      if (ordersData.success && ordersData.data) setOrders(ordersData.data.orders || [])
    }).finally(() => setLoading(false))
  }, [])

  const handleSave = async () => {
    if (!form.epay_pid.trim() || !form.epay_key.trim()) {
      toast.error('请填写商户ID和密钥')
      return
    }
    setSaving(true)
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = (await res.json()) as { success: boolean; error?: string }
      toast[data.success ? 'success' : 'error'](data.success ? '保存成功' : data.error || '保存失败')
    } finally {
      setSaving(false)
    }
  }

  const handleProcess = async (orderId: string) => {
    setProcessingId(orderId)
    try {
      const res = await fetch('/api/admin/pending-orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order_id: orderId }),
      })
      const data = (await res.json()) as { success: boolean; error?: string }
      if (data.success) {
        toast.success('订单已处理')
        setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: 'paid' } : o))
      } else {
        toast.error(data.error || '处理失败')
      }
    } finally {
      setProcessingId(null)
    }
  }

  const handleDelete = async (orderId: string) => {
    if (!confirm('确定删除此订单？')) return
    try {
      const res = await fetch(`/api/admin/pending-orders?id=${orderId}`, { method: 'DELETE' })
      const data = (await res.json()) as { success: boolean }
      if (data.success) {
        toast.success('已删除')
        setOrders(prev => prev.filter(o => o.id !== orderId))
      }
    } catch {
      toast.error('删除失败')
    }
  }

  const handleToggleShowAll = () => {
    const newShowAll = !showAll
    setShowAll(newShowAll)
    fetchOrders(newShowAll)
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    toast.success('已复制')
  }

  const formatTime = (ts: number) => new Date(ts * 1000).toLocaleString('zh-CN')

  if (loading) {
    return <div className="flex justify-center py-12"><Loader2 className="size-8 animate-spin text-muted-foreground" /></div>
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">设置</h1>
        <p className="text-muted-foreground">配置易支付参数</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <span className="size-6 rounded-full bg-primary text-primary-foreground text-sm flex items-center justify-center">1</span>
            在 Credit 平台创建应用
          </CardTitle>
          <CardDescription>
            前往 <a href="https://credit.linux.do" target="_blank" className="text-primary hover:underline inline-flex items-center gap-1">credit.linux.do <ExternalLink className="size-3" /></a> 创建应用
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
            <div>
              <p className="text-sm font-medium">应用主页</p>
              <code className="text-xs text-muted-foreground">{origin}</code>
            </div>
            <Button variant="outline" size="sm" onClick={() => copyToClipboard(origin)}><Copy className="size-4" /></Button>
          </div>
          <div className="flex items-center justify-between p-3 rounded-lg bg-yellow-50 border border-yellow-200">
            <div>
              <p className="text-sm font-medium text-yellow-800">通知 URL（重要！）</p>
              <code className="text-xs text-yellow-700">{notifyUrl}</code>
            </div>
            <Button variant="outline" size="sm" onClick={() => copyToClipboard(notifyUrl)}><Copy className="size-4" /></Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <span className="size-6 rounded-full bg-primary text-primary-foreground text-sm flex items-center justify-center">2</span>
            填写密钥
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-2 block">Client ID</label>
            <Input value={form.epay_pid} onChange={e => setForm({ ...form, epay_pid: e.target.value })} placeholder="您的 Client ID" />
          </div>
          <div>
            <label className="text-sm font-medium mb-2 block">Client Secret</label>
            <Input type="password" value={form.epay_key} onChange={e => setForm({ ...form, epay_key: e.target.value })} placeholder="您的 Client Secret" />
          </div>
          <Button onClick={handleSave} disabled={saving} className="w-full">
            {saving ? <Loader2 className="size-4 animate-spin mr-2" /> : <Save className="size-4 mr-2" />}
            保存设置
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>订单管理</CardTitle>
            <CardDescription>查看和处理发卡订单</CardDescription>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => fetchOrders(showAll)} disabled={refreshing}>
              {refreshing ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
            </Button>
            <Button variant={showAll ? 'default' : 'outline'} size="sm" onClick={handleToggleShowAll}>
              {showAll ? '仅待处理' : '显示全部'}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {orders.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Package className="size-10 mx-auto mb-2 opacity-50" />
              <p>没有订单</p>
            </div>
          ) : (
            <div className="space-y-3">
              {orders.map(order => (
                <div key={order.id} className="flex items-center justify-between p-3 rounded-lg border">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium truncate">{order.link_title}</p>
                      <span className={`text-xs px-1.5 py-0.5 rounded ${order.status === 'paid' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                        {order.status === 'paid' ? '已发货' : '待处理'}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {order.buyer_username || '未登录'} · {order.amount} 积分 · {formatTime(order.created_at)}
                    </p>
                  </div>
                  {order.status === 'pending' && (
                    <div className="flex gap-2 ml-2">
                      <Button size="sm" variant="outline" onClick={() => handleProcess(order.id)} disabled={processingId === order.id}>
                        {processingId === order.id ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => handleDelete(order.id)}>
                        <X className="size-4" />
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
