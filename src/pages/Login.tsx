import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Zap, ArrowLeft, Globe, AlertCircle, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'

const errorMessages: Record<string, string> = {
  no_code: '授权失败，未获取到授权码',
  invalid_state: '授权状态无效，请重试',
  token_failed: '获取令牌失败，请重试',
  user_failed: '获取用户信息失败，请重试',
  auth_failed: '登录失败，请重试',
  banned: '账户已被封禁',
}

export default function Login() {
  const [searchParams] = useSearchParams()
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const errorCode = searchParams.get('error')
    if (errorCode) {
      setError(errorMessages[errorCode] || `登录失败: ${errorCode}`)
    }
  }, [searchParams])

  const handleLogin = () => {
    setLoading(true)
    setError(null)
    // 获取当前页面的 redirect 参数，传递给 login API
    const redirect = searchParams.get('redirect') || '/dashboard'
    window.location.href = `/api/auth/login?redirect=${encodeURIComponent(redirect)}`
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-background to-muted/20">
      <div className="w-full max-w-md p-8">
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-8">
            <ArrowLeft className="size-4" />返回首页
          </Link>
          <div className="flex items-center justify-center gap-2 mb-4">
            <Zap className="size-8 text-primary" />
            <span className="font-bold text-2xl">Credit Hub</span>
          </div>
          <p className="text-muted-foreground">使用 Linux Do 账号登录</p>
        </div>

        <div className="bg-card border border-border/40 rounded-2xl p-6 shadow-lg">
          {error && (
            <div className="flex items-center gap-2 p-3 mb-4 rounded-lg bg-destructive/10 text-destructive text-sm">
              <AlertCircle className="size-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <Button
            className="w-full h-12 text-base rounded-full"
            size="lg"
            onClick={handleLogin}
            disabled={loading}
          >
            {loading ? (
              <Loader2 className="size-5 mr-2 animate-spin" />
            ) : (
              <Globe className="size-5 mr-2" />
            )}
            {loading ? '正在跳转...' : '使用 Linux Do 登录'}
          </Button>

          <p className="text-xs text-muted-foreground text-center mt-4">
            登录即表示您同意我们的服务条款和隐私政策
          </p>
        </div>

        <div className="mt-8 text-center text-sm text-muted-foreground">
          <p>还没有 Linux Do 账号？</p>
          <a href="https://linux.do" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
            前往注册
          </a>
        </div>
      </div>
    </div>
  )
}
