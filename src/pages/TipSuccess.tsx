import { Link, useSearchParams } from 'react-router-dom'
import { CheckCircle, Zap } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

export default function TipSuccess() {
  const [searchParams] = useSearchParams()
  const code = searchParams.get('code')

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20 flex items-center justify-center py-12 px-4">
      <Card className="w-full max-w-md">
        <CardContent className="pt-8 text-center">
          <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="size-8 text-green-500" />
          </div>
          <h1 className="text-2xl font-bold mb-2">打赏成功</h1>
          <p className="text-muted-foreground mb-8">感谢您的支持</p>

          <div className="flex flex-col gap-3">
            {code && (
              <Link to={`/t/${code}`}>
                <Button variant="outline" className="w-full rounded-full">返回打赏页</Button>
              </Link>
            )}
            <Link to="/">
              <Button variant="ghost" className="w-full rounded-full">返回首页</Button>
            </Link>
          </div>
        </CardContent>
      </Card>

      <div className="fixed bottom-8 text-center text-sm text-muted-foreground">
        <a href="/" className="inline-flex items-center gap-1 hover:text-primary">
          <Zap className="size-4" />Credit Hub
        </a>
      </div>
    </div>
  )
}
