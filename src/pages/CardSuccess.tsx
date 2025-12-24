import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Check, Copy, Loader2, Package } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'

interface SuccessData {
  status: 'pending' | 'success'
  title: string
  description?: string
  card_content?: string
  card_contents?: string[]
  message?: string
}

export default function CardSuccess() {
  const [searchParams] = useSearchParams()
  const code = searchParams.get('code')
  const order = searchParams.get('order')

  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<SuccessData | null>(null)
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null)

  useEffect(() => {
    if (code && order) {
      fetchResult()
    }
  }, [code, order])

  const fetchResult = async () => {
    try {
      const res = await fetch(`/api/card/success?code=${code}&order=${order}`)
      const result = await res.json() as { success: boolean; data?: SuccessData }
      if (result.success && result.data) {
        setData(result.data)
        // 如果还在处理中，3秒后重试
        if (result.data.status === 'pending') {
          setTimeout(fetchResult, 3000)
        }
      }
    } finally {
      setLoading(false)
    }
  }

  const handleCopy = (content: string, index: number) => {
    navigator.clipboard.writeText(content)
    setCopiedIndex(index)
    toast.success('已复制到剪贴板')
    setTimeout(() => setCopiedIndex(null), 2000)
  }

  const handleCopyAll = () => {
    const contents = data?.card_contents || (data?.card_content ? [data.card_content] : [])
    navigator.clipboard.writeText(contents.join('\n'))
    setCopiedIndex(-1)
    toast.success('已复制全部卡密')
    setTimeout(() => setCopiedIndex(null), 2000)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-green-50 to-white">
        <Loader2 className="size-8 animate-spin text-green-500" />
      </div>
    )
  }

  if (!data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-gray-50 to-white">
        <div className="text-center">
          <Package className="size-16 text-gray-300 mx-auto mb-4" />
          <h1 className="text-xl font-semibold text-gray-600">订单不存在</h1>
        </div>
      </div>
    )
  }

  if (data.status === 'pending') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-yellow-50 to-white">
        <div className="text-center max-w-sm mx-auto p-6">
          <Loader2 className="size-12 animate-spin text-yellow-500 mx-auto mb-4" />
          <h1 className="text-xl font-semibold mb-2">订单处理中</h1>
          <p className="text-muted-foreground">{data.message || '请稍候，正在为您发放卡密...'}</p>
        </div>
      </div>
    )
  }

  // 获取所有卡密
  const cardContents = data.card_contents || (data.card_content ? [data.card_content] : [])
  const isMultiple = cardContents.length > 1

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-green-50 to-white p-4">
      <div className="w-full max-w-md">
        {/* 成功卡片 */}
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          {/* 顶部成功标识 */}
          <div className="bg-gradient-to-r from-green-500 to-green-600 p-6 text-center text-white">
            <div className="size-16 rounded-full bg-white/20 flex items-center justify-center mx-auto mb-3">
              <Check className="size-8" />
            </div>
            <h1 className="text-xl font-bold">购买成功</h1>
            <p className="text-green-100 text-sm mt-1">{data.title}</p>
          </div>

          {/* 卡密内容 */}
          <div className="p-6">
            {data.description && (
              <p className="text-sm text-muted-foreground mb-4 text-center">{data.description}</p>
            )}

            <div className="mb-4">
              <label className="text-sm font-medium text-muted-foreground block mb-2">
                您的卡密 {isMultiple && `(${cardContents.length}个)`}
              </label>

              <div className={`space-y-2 ${cardContents.length > 5 ? 'max-h-64 overflow-y-auto pr-2' : ''}`}>
                {cardContents.map((content, index) => (
                  <div key={index} className="relative group">
                    <div className="p-3 rounded-lg bg-gray-50 border-2 border-dashed border-gray-200 font-mono text-sm break-all select-all pr-10">
                      {isMultiple && <span className="text-muted-foreground mr-2">#{index + 1}</span>}
                      {content}
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => handleCopy(content, index)}
                    >
                      {copiedIndex === index ? <Check className="size-4" /> : <Copy className="size-4" />}
                    </Button>
                  </div>
                ))}
              </div>
            </div>

            <Button className="w-full" size="lg" onClick={handleCopyAll}>
              {copiedIndex === -1 ? (
                <>
                  <Check className="size-5 mr-2" />
                  已复制
                </>
              ) : (
                <>
                  <Copy className="size-5 mr-2" />
                  {isMultiple ? '复制全部卡密' : '复制卡密'}
                </>
              )}
            </Button>

            <p className="text-xs text-muted-foreground text-center mt-4">
              请妥善保管您的卡密，关闭页面后可能无法再次查看
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
