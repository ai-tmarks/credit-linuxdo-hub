import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Link2, Loader2, Plus, Copy, Gift } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useAuth } from '@/contexts/auth-context'

interface TipLink {
  id: string
  short_code: string
  title: string
  total_received: number
  tip_count: number
}

export default function Dashboard() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [links, setLinks] = useState<TipLink[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/tip-link')
      .then(res => res.json())
      .then((data: { success: boolean; data: { links: TipLink[] } }) => {
        if (data.success) setLinks(data.data.links)
      })
      .finally(() => setLoading(false))
  }, [])

  const copyLink = (code: string) => {
    navigator.clipboard.writeText(`${window.location.origin}/t/${code}`)
    toast.success('链接已复制')
  }

  const totalReceived = links.reduce((sum, l) => sum + (l.total_received || 0), 0)
  const totalCount = links.reduce((sum, l) => sum + (l.tip_count || 0), 0)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">欢迎，{user?.nickname || user?.username}</h1>
        <p className="text-muted-foreground">管理您的打赏链接</p>
      </div>

      {/* 统计卡片 */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-primary/10">
                <Link2 className="size-6 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{links.length}</p>
                <p className="text-sm text-muted-foreground">打赏链接</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-green-500/10">
                <Gift className="size-6 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{totalCount}</p>
                <p className="text-sm text-muted-foreground">收款次数</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-yellow-500/10">
                <span className="text-xl">💰</span>
              </div>
              <div>
                <p className="text-2xl font-bold">{totalReceived}</p>
                <p className="text-sm text-muted-foreground">总收款积分</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 打赏链接列表 */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>我的打赏链接</CardTitle>
              <CardDescription>创建链接分享到 Linux Do 社区</CardDescription>
            </div>
            <Button onClick={() => navigate('/links')}>
              <Plus className="size-4 mr-2" />创建链接
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="size-6 animate-spin text-muted-foreground" />
            </div>
          ) : links.length === 0 ? (
            <div className="text-center py-8">
              <Link2 className="size-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground mb-4">还没有打赏链接</p>
              <Button onClick={() => navigate('/links')}>
                <Plus className="size-4 mr-2" />创建第一个链接
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {links.slice(0, 5).map((link) => (
                <div key={link.id} className="flex items-center justify-between p-4 rounded-lg border border-border/40">
                  <div>
                    <p className="font-medium">{link.title}</p>
                    <p className="text-sm text-muted-foreground">
                      收到 {link.tip_count} 次，共 {link.total_received} 积分
                    </p>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => copyLink(link.short_code)}>
                    <Copy className="size-4 mr-1" />复制
                  </Button>
                </div>
              ))}
              {links.length > 5 && (
                <Button variant="ghost" className="w-full" onClick={() => navigate('/links')}>
                  查看全部 {links.length} 个链接
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
