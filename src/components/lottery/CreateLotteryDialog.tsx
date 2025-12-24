import { useState } from 'react'
import { Plus, Trash2, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

interface Prize {
  name: string
  prize_type: 'card' | 'text'
  content: string
  winner_count: number
}

interface Props {
  onCreated: () => void
}

const defaultForm = {
  title: '',
  description: '',
  join_type: 'free',
  join_price: '0',
  draw_type: 'time',
  draw_time: '',
  draw_count: '10',
  max_participants: '0',
  per_user_limit: '1',
  min_trust_level: '0',
}

export function CreateLotteryDialog({ onCreated }: Props) {
  const [open, setOpen] = useState(false)
  const [creating, setCreating] = useState(false)
  const [form, setForm] = useState(defaultForm)
  const [prizes, setPrizes] = useState<Prize[]>([{ name: '一等奖', prize_type: 'card', content: '', winner_count: 1 }])

  const addPrize = () => setPrizes([...prizes, { name: `${prizes.length + 1}等奖`, prize_type: 'card', content: '', winner_count: 1 }])
  const removePrize = (i: number) => prizes.length > 1 && setPrizes(prizes.filter((_, idx) => idx !== i))
  const updatePrize = (i: number, field: keyof Prize, value: string | number) => {
    const newPrizes = [...prizes]
    newPrizes[i] = { ...newPrizes[i], [field]: value }
    setPrizes(newPrizes)
  }

  const handleCreate = async () => {
    if (!form.title.trim()) return toast.error('请输入活动标题')
    const validPrizes = prizes.filter((p) => p.content.trim())
    if (validPrizes.length === 0) return toast.error('请至少添加一个奖品')
    if (form.draw_type === 'time' && !form.draw_time) return toast.error('请设置开奖时间')
    if (form.draw_type === 'count' && parseInt(form.draw_count) <= 0) return toast.error('请设置开奖人数')

    setCreating(true)
    try {
      const res = await fetch('/api/lottery', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          join_price: parseFloat(form.join_price) || 0,
          draw_time: form.draw_type === 'time' ? new Date(form.draw_time).getTime() / 1000 : undefined,
          draw_count: form.draw_type === 'count' ? parseInt(form.draw_count) : undefined,
          max_participants: parseInt(form.max_participants) || 0,
          per_user_limit: parseInt(form.per_user_limit) || 1,
          min_trust_level: parseInt(form.min_trust_level) || 0,
          prizes: validPrizes,
        }),
      })
      const data = (await res.json()) as { success: boolean; error?: string }
      if (data.success) {
        toast.success('创建成功')
        setOpen(false)
        setForm(defaultForm)
        setPrizes([{ name: '一等奖', prize_type: 'card', content: '', winner_count: 1 }])
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
        <Button size="sm" className="h-8 text-xs"><Plus className="size-3 mr-1" />创建抽奖</Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader><DialogTitle>创建抽奖活动</DialogTitle></DialogHeader>
        <div className="space-y-4 pt-4">
          <div>
            <label className="text-sm font-medium mb-2 block">活动标题</label>
            <Input placeholder="如：新年福利大抽奖" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          </div>
          <div>
            <label className="text-sm font-medium mb-2 block">活动描述（可选）</label>
            <Textarea placeholder="介绍一下活动规则..." rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">参与方式</label>
              <Select value={form.join_type} onValueChange={(v: string) => setForm({ ...form, join_type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="free">免费参与</SelectItem>
                  <SelectItem value="paid">付费参与</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {form.join_type === 'paid' && (
              <div>
                <label className="text-sm font-medium mb-2 block">参与费用（积分）</label>
                <Input type="number" placeholder="10" value={form.join_price} onChange={(e) => setForm({ ...form, join_price: e.target.value })} />
              </div>
            )}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">开奖方式</label>
              <Select value={form.draw_type} onValueChange={(v: string) => setForm({ ...form, draw_type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="time">定时开奖</SelectItem>
                  <SelectItem value="count">人满开奖</SelectItem>
                  <SelectItem value="manual">手动开奖</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {form.draw_type === 'time' && (
              <div>
                <label className="text-sm font-medium mb-2 block">开奖时间</label>
                <Input type="datetime-local" value={form.draw_time} onChange={(e) => setForm({ ...form, draw_time: e.target.value })} />
              </div>
            )}
            {form.draw_type === 'count' && (
              <div>
                <label className="text-sm font-medium mb-2 block">开奖人数</label>
                <Input type="number" placeholder="10" value={form.draw_count} onChange={(e) => setForm({ ...form, draw_count: e.target.value })} />
              </div>
            )}
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">最大人数（0=不限）</label>
              <Input type="number" placeholder="0" value={form.max_participants} onChange={(e) => setForm({ ...form, max_participants: e.target.value })} />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">每人次数</label>
              <Input type="number" placeholder="1" value={form.per_user_limit} onChange={(e) => setForm({ ...form, per_user_limit: e.target.value })} />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">最低信任等级</label>
              <Input type="number" placeholder="0" value={form.min_trust_level} onChange={(e) => setForm({ ...form, min_trust_level: e.target.value })} />
            </div>
          </div>
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium">奖品设置</label>
              <Button type="button" variant="outline" size="sm" onClick={addPrize}><Plus className="size-3 mr-1" />添加</Button>
            </div>
            <div className="space-y-3">
              {prizes.map((prize, i) => (
                <div key={i} className="p-3 rounded-lg border bg-muted/30">
                  <div className="flex items-center gap-2 mb-2">
                    <Input placeholder="奖品名称" className="flex-1" value={prize.name} onChange={(e) => updatePrize(i, 'name', e.target.value)} />
                    <Select value={prize.prize_type} onValueChange={(v: string) => updatePrize(i, 'prize_type', v as 'card' | 'text')}>
                      <SelectTrigger className="w-24"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="card">卡密</SelectItem>
                        <SelectItem value="text">文本</SelectItem>
                      </SelectContent>
                    </Select>
                    <Input type="number" placeholder="人数" className="w-20" value={prize.winner_count} onChange={(e) => updatePrize(i, 'winner_count', parseInt(e.target.value) || 1)} />
                    {prizes.length > 1 && <Button type="button" variant="ghost" size="icon" onClick={() => removePrize(i)}><Trash2 className="size-4 text-destructive" /></Button>}
                  </div>
                  <Textarea placeholder={prize.prize_type === 'card' ? '卡密（多个换行分隔）' : '奖品描述'} rows={2} value={prize.content} onChange={(e) => updatePrize(i, 'content', e.target.value)} />
                </div>
              ))}
            </div>
          </div>
          <Button className="w-full" onClick={handleCreate} disabled={creating}>
            {creating && <Loader2 className="size-4 animate-spin mr-2" />}创建抽奖
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
