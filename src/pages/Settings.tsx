import { useState, useEffect } from 'react'
import { Save, Loader2, Copy, ExternalLink } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useAuth } from '@/contexts/auth-context'

interface UserSettings {
  epay_pid: string
  epay_key: string
}

export default function Settings() {
  useAuth()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState<UserSettings>({
    epay_pid: '',
    epay_key: '',
  })

  const origin = window.location.origin

  // 生成的链接
  const generatedUrls = {
    homepage: origin,
    notify: `${origin}/api/callback`,
  }

  useEffect(() => {
    fetch('/api/settings')
      .then(res => res.json())
      .then((data: { success: boolean; data: UserSettings }) => {
        if (data.success && data.data) {
          setForm(prev => ({ ...prev, ...data.data }))
        }
      })
      .finally(() => setLoading(false))
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
      const data = await res.json() as { success: boolean; error?: string }
      if (data.success) {
        toast.success('保存成功')
      } else {
        toast.error(data.error || '保存失败')
      }
    } catch {
      toast.error('网络错误')
    } finally {
      setSaving(false)
    }
  }

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text)
    toast.success(`${label} 已复制`)
  }

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">设置</h1>
        <p className="text-muted-foreground">配置易支付参数，用于接收打赏</p>
      </div>

      {/* 第一步：生成链接 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <span className="flex items-center justify-center size-6 rounded-full bg-primary text-primary-foreground text-sm">1</span>
            在 Credit 平台创建应用
          </CardTitle>
          <CardDescription>
            前往 <a href="https://credit.linux.do" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline inline-flex items-center gap-1">credit.linux.do <ExternalLink className="size-3" /></a> 集市中心创建应用，填写以下信息
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3">
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
              <div>
                <p className="text-sm font-medium">应用主页 URL</p>
                <code className="text-xs text-muted-foreground">{generatedUrls.homepage}</code>
              </div>
              <Button variant="outline" size="sm" onClick={() => copyToClipboard(generatedUrls.homepage, '应用主页 URL')}>
                <Copy className="size-4" />
              </Button>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg bg-yellow-50 border border-yellow-200">
              <div>
                <p className="text-sm font-medium text-yellow-800">通知 URL（重要！）</p>
                <code className="text-xs text-yellow-700">{generatedUrls.notify}</code>
                <p className="text-xs text-yellow-600 mt-1">支付成功后会回调此地址，请务必正确配置</p>
              </div>
              <Button variant="outline" size="sm" onClick={() => copyToClipboard(generatedUrls.notify, '通知 URL')}>
                <Copy className="size-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 第二步：填写密钥 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <span className="flex items-center justify-center size-6 rounded-full bg-primary text-primary-foreground text-sm">2</span>
            填写应用密钥
          </CardTitle>
          <CardDescription>
            创建应用后，将获取到的 Client ID 和 Client Secret 填写到下方
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-2 block">易支付商户ID (Client ID)</label>
            <Input 
              value={form.epay_pid} 
              onChange={(e) => setForm({ ...form, epay_pid: e.target.value })}
              placeholder="您的 Client ID"
            />
          </div>
          <div>
            <label className="text-sm font-medium mb-2 block">易支付商户密钥 (Client Secret)</label>
            <Input 
              type="password"
              value={form.epay_key} 
              onChange={(e) => setForm({ ...form, epay_key: e.target.value })}
              placeholder="您的 Client Secret"
            />
          </div>
          <Button onClick={handleSave} disabled={saving} className="w-full">
            {saving && <Loader2 className="size-4 animate-spin mr-2" />}
            <Save className="size-4 mr-2" />
            保存设置
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
