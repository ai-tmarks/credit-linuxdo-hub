import { useState, useEffect } from 'react'
import { Link2, Plus, Copy, Trash2, Loader2, Check, Coins, Hash } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { useAuth } from '@/contexts/auth-context'

interface TipLink {
  id: string
  short_code: string
  title: string
  description?: string
  preset_amounts: number[]
  total_received: number
  tip_count: number
  is_active: boolean
}

export default function TipLinks() {
  useAuth()
  const [links, setLinks] = useState<TipLink[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [form, setForm] = useState({ title: '', description: '', preset_amounts: '5,10,20,50' })
  const [copiedLink, setCopiedLink] = useState<string | null>(null)

  const origin = window.location.origin

  useEffect(() => {
    fetch('/api/tip-link')
      .then(res => res.json())
      .then((data: { success: boolean; data: { links: TipLink[] } }) => {
        if (data.success) setLinks(data.data.links)
      })
      .finally(() => setLoading(false))
  }, [])

  const handleCreate = async () => {
    if (!form.title.trim()) {
      toast.error('请输入链接标题')
      return
    }
    setCreating(true)
    try {
      const res = await fetch('/api/tip-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: form.title.trim(),
          description: form.description.trim() || undefined,
          preset_amounts: form.preset_amounts.split(',').map(s => parseFloat(s.trim())).filter(n => n > 0),
        }),
      })
      const data = await res.json() as { success: boolean; data: TipLink; error?: string }
      if (data.success) {
        setLinks([data.data, ...links])
        setDialogOpen(false)
        setForm({ title: '', description: '', preset_amounts: '5,10,20,50' })
        toast.success('创建成功')
      } else {
        toast.error(data.error || '创建失败')
      }
    } catch {
      toast.error('网络错误')
    } finally {
      setCreating(false)
    }
  }

  const handleDelete = async (code: string) => {
    if (!confirm('确定删除此链接？删除后无法恢复。')) return
    try {
      await fetch(`/api/tip-link/${code}`, { method: 'DELETE' })
      setLinks(links.filter(l => l.short_code !== code))
      toast.success('删除成功')
    } catch {
      toast.error('删除失败')
    }
  }

  const copyLink = (link: string) => {
    navigator.clipboard.writeText(link)
    setCopiedLink(link)
    toast.success('链接已复制')
    setTimeout(() => setCopiedLink(null), 2000)
  }

  const generateLink = (code: string, amount: number) => {
    return `${origin}/api/t/${code}?amount=${amount}`
  }

  return (
    <div className="space-y-6">
      {/* 页头 */}
      <div className="flex items-center justify-between border-b pb-4">
        <div>
          <h1 className="text-2xl font-semibold">打赏链接</h1>
          <p className="text-sm text-muted-foreground mt-1">创建链接分享到 Linux Do 社区</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="h-8 text-xs">
              <Plus className="size-3 mr-1" />创建链接
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>创建打赏链接</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div>
                <label className="text-sm font-medium mb-2 block">链接标题</label>
                <Input placeholder="如：支持我的创作" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">描述（可选）</label>
                <Input placeholder="简单介绍一下" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">预设金额</label>
                <Input placeholder="用逗号分隔，如 5,10,20,50" value={form.preset_amounts} onChange={(e) => setForm({ ...form, preset_amounts: e.target.value })} />
                <p className="text-xs text-muted-foreground mt-1">每个金额会生成一个独立的打赏链接</p>
              </div>
              <Button className="w-full" onClick={handleCreate} disabled={creating || !form.title.trim()}>
                {creating && <Loader2 className="size-4 animate-spin mr-2" />}
                创建链接
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* 内容区 */}
      {loading ? (
        <div className="flex items-center justify-center min-h-[40vh]">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      ) : links.length === 0 ? (
        <div className="flex items-center justify-center min-h-[40vh]">
          <div className="text-center">
            <div className="rounded-lg p-3 bg-muted/50 w-fit mx-auto mb-4">
              <Link2 className="size-8 text-muted-foreground" />
            </div>
            <h3 className="font-medium mb-1">暂未创建链接</h3>
            <p className="text-sm text-muted-foreground mb-4">创建您的第一个打赏链接</p>
            <Button size="sm" onClick={() => setDialogOpen(true)}>
              <Plus className="size-3 mr-1" />创建链接
            </Button>
          </div>
        </div>
      ) : (
        <div className="max-w-2xl space-y-6">
          {links.map((link) => (
            <div key={link.id} className="rounded-xl border bg-card">
              {/* 卡片头部 */}
              <div className="flex items-center justify-between p-4 border-b">
                <div className="flex items-center gap-3">
                  <div className="size-10 rounded-lg bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                    <Link2 className="size-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold">{link.title}</h3>
                    {link.description && (
                      <p className="text-xs text-muted-foreground">{link.description}</p>
                    )}
                  </div>
                </div>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="size-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10" 
                  onClick={() => handleDelete(link.short_code)}
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>

              {/* 统计区 */}
              <div className="grid grid-cols-2 divide-x border-b">
                <div className="p-4 flex items-center gap-3">
                  <div className="size-8 rounded-lg bg-green-500/10 flex items-center justify-center">
                    <Coins className="size-4 text-green-600" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">总收款</p>
                    <p className="text-lg font-semibold tabular-nums">{link.total_received}</p>
                  </div>
                </div>
                <div className="p-4 flex items-center gap-3">
                  <div className="size-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
                    <Hash className="size-4 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">收款次数</p>
                    <p className="text-lg font-semibold tabular-nums">{link.tip_count}</p>
                  </div>
                </div>
              </div>

              {/* 链接列表 */}
              <div className="p-4">
                <p className="text-xs font-medium text-muted-foreground mb-3">打赏链接</p>
                <div className="space-y-2">
                  {link.preset_amounts.map((amount) => {
                    const fullLink = generateLink(link.short_code, amount)
                    const isCopied = copiedLink === fullLink
                    return (
                      <div
                        key={amount}
                        className="flex items-center gap-3 p-3 rounded-lg bg-muted/40 hover:bg-muted/60 transition-colors group"
                      >
                        <div className="w-16 shrink-0">
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-primary/10 text-primary text-sm font-semibold">
                            {amount}
                          </span>
                        </div>
                        <code className="flex-1 text-xs text-muted-foreground truncate font-mono select-all">
                          {fullLink}
                        </code>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-8 shrink-0"
                          onClick={() => copyLink(fullLink)}
                        >
                          {isCopied ? (
                            <Check className="size-4 text-green-600" />
                          ) : (
                            <Copy className="size-4 text-muted-foreground group-hover:text-foreground" />
                          )}
                        </Button>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
