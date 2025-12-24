import { useState } from 'react'
import { Plus, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

interface Props {
  onCreated: () => void
}

const defaultForm = {
  title: '',
  description: '',
  price: '',
  cards: '',
  per_user_limit: '0',
  card_mode: 'one_to_one',
  cards_per_order: '1',
  max_sales: '0',
}

export function CreateCardDialog({ onCreated }: Props) {
  const [open, setOpen] = useState(false)
  const [creating, setCreating] = useState(false)
  const [form, setForm] = useState(defaultForm)

  const handleCreate = async () => {
    if (!form.title.trim()) {
      toast.error('请输入商品标题')
      return
    }
    const price = parseFloat(form.price)
    if (!price || price <= 0) {
      toast.error('请输入有效价格')
      return
    }
    const cards = form.cards.split('\n').map((s) => s.trim()).filter(Boolean)
    if (cards.length === 0) {
      toast.error('请添加至少一个卡密')
      return
    }

    setCreating(true)
    try {
      const res = await fetch('/api/card-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: form.title.trim(),
          description: form.description.trim() || undefined,
          price,
          cards,
          per_user_limit: parseInt(form.per_user_limit) || 0,
          card_mode: form.card_mode,
          cards_per_order: parseInt(form.cards_per_order) || 1,
          max_sales: parseInt(form.max_sales) || 0,
        }),
      })
      const data = (await res.json()) as { success: boolean; error?: string }
      if (data.success) {
        toast.success('创建成功')
        setOpen(false)
        setForm(defaultForm)
        onCreated()
      } else {
        toast.error(data.error || '创建失败')
      }
    } catch {
      toast.error('网络错误')
    } finally {
      setCreating(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="h-8 text-xs">
          <Plus className="size-3 mr-1" />
          创建商品
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>创建发卡商品</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-4">
          <div>
            <label className="text-sm font-medium mb-2 block">商品标题</label>
            <Input placeholder="如：xxx 激活码" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          </div>
          <div>
            <label className="text-sm font-medium mb-2 block">商品描述（可选）</label>
            <Input placeholder="简单介绍一下" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">单价（积分）</label>
              <Input type="number" placeholder="10" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">每人限购（0=不限）</label>
              <Input type="number" placeholder="0" value={form.per_user_limit} onChange={(e) => setForm({ ...form, per_user_limit: e.target.value })} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">发卡模式</label>
              <Select value={form.card_mode} onValueChange={(v: string) => setForm({ ...form, card_mode: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="one_to_one">一对一</SelectItem>
                  <SelectItem value="one_to_many">一对多</SelectItem>
                  <SelectItem value="multi">多对多</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {form.card_mode === 'multi' && (
              <div>
                <label className="text-sm font-medium mb-2 block">每单数量</label>
                <Input type="number" placeholder="1" value={form.cards_per_order} onChange={(e) => setForm({ ...form, cards_per_order: e.target.value })} />
              </div>
            )}
            {form.card_mode === 'one_to_many' && (
              <div>
                <label className="text-sm font-medium mb-2 block">销售次数（0=不限）</label>
                <Input type="number" placeholder="0" value={form.max_sales} onChange={(e) => setForm({ ...form, max_sales: e.target.value })} />
              </div>
            )}
          </div>
          <div>
            <label className="text-sm font-medium mb-2 block">卡密列表（每行一个）</label>
            <Textarea placeholder="ABC123&#10;DEF456" rows={6} value={form.cards} onChange={(e) => setForm({ ...form, cards: e.target.value })} />
            <p className="text-xs text-muted-foreground mt-1">共 {form.cards.split('\n').filter((s) => s.trim()).length} 个</p>
          </div>
          <Button className="w-full" onClick={handleCreate} disabled={creating}>
            {creating && <Loader2 className="size-4 animate-spin mr-2" />}
            创建商品
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
