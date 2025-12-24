import { useState, useEffect, useRef } from 'react'
import { useParams } from 'react-router-dom'
import { Package, Loader2, ShoppingCart, AlertCircle, Minus, Plus, Check, Copy } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'

interface CardLink {
  id: string
  short_code: string
  title: string
  description: string | null
  price: number
  total_stock: number
  sold_count: number
  remaining_stock: number
  per_user_limit: number
  card_mode: string
  cards_per_order: number
  is_active: number
}

interface ApiResponse {
  success: boolean
  data?: {
    link: CardLink
    can_buy: boolean
    cant_buy_reason: string
    user_purchase_count: number
  }
  error?: string
}

type PageState = 'browse' | 'paying' | 'success'

export default function CardBuy() {
  const { code } = useParams<{ code: string }>()
  const [loading, setLoading] = useState(true)
  const [link, setLink] = useState<CardLink | null>(null)
  const [canBuy, setCanBuy] = useState(true)
  const [cantBuyReason, setCantBuyReason] = useState('')
  const [userPurchaseCount, setUserPurchaseCount] = useState(0)
  const [quantity, setQuantity] = useState(1)
  const [pageState, setPageState] = useState<PageState>('browse')
  const [orderNo, setOrderNo] = useState('')
  const [cards, setCards] = useState<string[]>([])
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null)
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (code) fetchLink()
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current)
    }
  }, [code])

  const fetchLink = async () => {
    try {
      const res = await fetch(`/api/card-link/${code}`)
      const data = (await res.json()) as ApiResponse
      if (data.success && data.data) {
        setLink(data.data.link)
        setCanBuy(data.data.can_buy)
        setCantBuyReason(data.data.cant_buy_reason)
        setUserPurchaseCount(data.data.user_purchase_count || 0)
      }
    } finally {
      setLoading(false)
    }
  }

  const getMaxQuantity = () => {
    if (!link) return 1
    const isOneToMany = link.card_mode === 'one_to_many'
    const hasUnlimitedStock = isOneToMany && link.total_stock <= 0
    const maxByStock = hasUnlimitedStock ? 99 : link.remaining_stock
    let maxByLimit = 99
    if (link.per_user_limit > 0) {
      maxByLimit = link.per_user_limit - userPurchaseCount
    }
    return Math.max(1, Math.min(maxByStock, maxByLimit, 10))
  }

  const maxQuantity = getMaxQuantity()
  const handleQuantityChange = (delta: number) => {
    setQuantity((prev) => Math.max(1, Math.min(maxQuantity, prev + delta)))
  }

  const handleBuy = async () => {
    try {
      const res = await fetch('/api/card/pay', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, quantity }),
      })
      const data = (await res.json()) as {
        success: boolean
        data?: { order_no: string; pay_url: string }
        error?: string
      }
      if (!data.success || !data.data) {
        toast.error(data.error || '创建订单失败')
        return
      }
      const { order_no, pay_url } = data.data
      setOrderNo(order_no)
      setPageState('paying')
      window.open(pay_url, '_blank')
      startPolling(order_no)
    } catch {
      toast.error('网络错误')
    }
  }

  const startPolling = (order: string) => {
    if (pollingRef.current) clearInterval(pollingRef.current)
    const checkStatus = async () => {
      try {
        const res = await fetch(`/api/card/status?order=${order}`)
        const data = (await res.json()) as {
          success: boolean
          data?: { status: string; cards?: string[] }
        }
        if (data.success && data.data?.status === 'paid') {
          if (pollingRef.current) clearInterval(pollingRef.current)
          setCards(data.data.cards || [])
          setPageState('success')
        }
      } catch {
        // ignore
      }
    }
    checkStatus()
    pollingRef.current = setInterval(checkStatus, 2000)
  }

  const handleCopy = (content: string, index: number) => {
    navigator.clipboard.writeText(content)
    setCopiedIndex(index)
    toast.success('已复制')
    setTimeout(() => setCopiedIndex(null), 2000)
  }

  const handleCopyAll = () => {
    navigator.clipboard.writeText(cards.join('\n'))
    setCopiedIndex(-1)
    toast.success('已复制全部')
    setTimeout(() => setCopiedIndex(null), 2000)
  }

  const totalPrice = link ? link.price * quantity : 0
  const getCardsCount = () => {
    if (!link) return quantity
    if (link.card_mode === 'multi') return quantity * (link.cards_per_order || 1)
    return quantity
  }
  const cardsCount = getCardsCount()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-blue-50 to-white">
        <Loader2 className="size-8 animate-spin text-blue-500" />
      </div>
    )
  }

  if (!link) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-gray-50 to-white">
        <div className="text-center">
          <Package className="size-16 text-gray-300 mx-auto mb-4" />
          <h1 className="text-xl font-semibold text-gray-600">商品不存在</h1>
        </div>
      </div>
    )
  }

  const isOneToMany = link.card_mode === 'one_to_many'
  const hasUnlimitedStock = isOneToMany && link.total_stock <= 0
  const remainingStock = hasUnlimitedStock ? -1 : link.total_stock - link.sold_count

  if (pageState === 'success') {
    const isMultiple = cards.length > 1
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-green-50 to-white p-4">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
            <div className="bg-gradient-to-r from-green-500 to-green-600 p-6 text-center text-white">
              <div className="size-16 rounded-full bg-white/20 flex items-center justify-center mx-auto mb-3">
                <Check className="size-8" />
              </div>
              <h1 className="text-xl font-bold">购买成功</h1>
              <p className="text-green-100 text-sm mt-1">{link.title}</p>
            </div>
            <div className="p-6">
              <label className="text-sm font-medium text-muted-foreground block mb-2">
                您的卡密 {isMultiple && `(${cards.length}个)`}
              </label>
              <div className={`space-y-2 mb-4 ${cards.length > 5 ? 'max-h-64 overflow-y-auto' : ''}`}>
                {cards.map((content, index) => (
                  <div key={index} className="relative group">
                    <div className="p-3 rounded-lg bg-gray-50 border-2 border-dashed border-gray-200 font-mono text-sm break-all select-all pr-10">
                      {isMultiple && <span className="text-muted-foreground mr-2">#{index + 1}</span>}
                      {content}
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100"
                      onClick={() => handleCopy(content, index)}
                    >
                      {copiedIndex === index ? <Check className="size-4" /> : <Copy className="size-4" />}
                    </Button>
                  </div>
                ))}
              </div>
              <Button className="w-full" size="lg" onClick={handleCopyAll}>
                {copiedIndex === -1 ? <Check className="size-5 mr-2" /> : <Copy className="size-5 mr-2" />}
                {isMultiple ? '复制全部卡密' : '复制卡密'}
              </Button>
              <p className="text-xs text-center mt-4">
                <a href="/my-orders" className="text-primary hover:underline">登录后可在「我的记录」中查看</a>
              </p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (pageState === 'paying') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-yellow-50 to-white p-4">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
            <div className="bg-gradient-to-r from-yellow-500 to-orange-500 p-6 text-center text-white">
              <Loader2 className="size-12 animate-spin mx-auto mb-3" />
              <h1 className="text-xl font-bold">等待支付</h1>
              <p className="text-yellow-100 text-sm mt-1">{link.title}</p>
            </div>
            <div className="p-6 text-center">
              <p className="text-muted-foreground mb-4">
                请在新打开的页面完成支付<br />支付完成后此页面将自动显示卡密
              </p>
              <div className="p-4 rounded-lg bg-gray-50 mb-4">
                <div className="text-sm text-muted-foreground">订单金额</div>
                <div className="text-2xl font-bold text-orange-600">{totalPrice} 积分</div>
              </div>
              <p className="text-xs text-muted-foreground mb-4">订单号：{orderNo}</p>
              <Button variant="outline" className="w-full" onClick={() => {
                if (pollingRef.current) clearInterval(pollingRef.current)
                setPageState('browse')
                setOrderNo('')
              }}>
                取消支付
              </Button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          <div className="bg-gradient-to-r from-blue-500 to-blue-600 p-6 text-white">
            <div className="size-16 rounded-2xl bg-white/20 flex items-center justify-center mx-auto mb-4">
              <Package className="size-8" />
            </div>
            <h1 className="text-xl font-bold text-center">{link.title}</h1>
            {link.description && <p className="text-blue-100 text-sm text-center mt-2">{link.description}</p>}
          </div>
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <div className="text-3xl font-bold text-blue-600">{link.price}</div>
                <div className="text-sm text-muted-foreground">积分/件</div>
              </div>
              <div className="text-right">
                <div className="text-lg font-semibold">
                  {hasUnlimitedStock ? (
                    <span className="text-green-600">库存充足</span>
                  ) : remainingStock > 0 ? (
                    <span className="text-green-600">剩余 {remainingStock} 件</span>
                  ) : (
                    <span className="text-red-500">已售罄</span>
                  )}
                </div>
                <div className="text-sm text-muted-foreground">已售 {link.sold_count} 件</div>
              </div>
            </div>

            {link.card_mode === 'one_to_many' && (
              <div className="mb-4 p-3 rounded-lg bg-blue-50 text-blue-700 text-sm">📦 同一卡密可多次购买</div>
            )}
            {link.card_mode === 'multi' && (
              <div className="mb-4 p-3 rounded-lg bg-purple-50 text-purple-700 text-sm">
                📦 每次购买获得 {link.cards_per_order} 个卡密
              </div>
            )}
            {link.per_user_limit > 0 && (
              <div className="mb-4 p-3 rounded-lg bg-yellow-50 text-yellow-700 text-sm flex items-center gap-2">
                <AlertCircle className="size-4 shrink-0" />
                <span>每人限购 {link.per_user_limit} 件{userPurchaseCount > 0 && `（已购 ${userPurchaseCount} 件）`}</span>
              </div>
            )}

            {canBuy && maxQuantity > 1 && (
              <div className="mb-6">
                <label className="text-sm font-medium mb-2 block">购买数量</label>
                <div className="flex items-center gap-4">
                  <div className="flex items-center border rounded-lg">
                    <Button variant="ghost" size="icon" className="h-10 w-10 rounded-r-none" onClick={() => handleQuantityChange(-1)} disabled={quantity <= 1}>
                      <Minus className="size-4" />
                    </Button>
                    <div className="w-12 text-center font-semibold">{quantity}</div>
                    <Button variant="ghost" size="icon" className="h-10 w-10 rounded-l-none" onClick={() => handleQuantityChange(1)} disabled={quantity >= maxQuantity}>
                      <Plus className="size-4" />
                    </Button>
                  </div>
                  <div className="text-sm text-muted-foreground">最多 {maxQuantity} 件</div>
                </div>
              </div>
            )}

            {canBuy && (
              <div className="mb-6 p-4 rounded-lg bg-gray-50">
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-muted-foreground">单价</span>
                  <span>{link.price} 积分</span>
                </div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-muted-foreground">数量</span>
                  <span>× {quantity}</span>
                </div>
                {link.card_mode === 'multi' && (
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-muted-foreground">获得卡密</span>
                    <span>{cardsCount} 个</span>
                  </div>
                )}
                <div className="border-t pt-2 mt-2 flex justify-between font-semibold">
                  <span>合计</span>
                  <span className="text-blue-600">{totalPrice} 积分</span>
                </div>
              </div>
            )}

            {canBuy ? (
              <Button className="w-full" size="lg" onClick={handleBuy}>
                <ShoppingCart className="size-5 mr-2" />
                立即购买 · {totalPrice} 积分
              </Button>
            ) : (
              <Button className="w-full" size="lg" disabled>{cantBuyReason || '无法购买'}</Button>
            )}
            <p className="text-xs text-muted-foreground text-center mt-4">
              支付成功后将自动发放{cardsCount > 1 ? ` ${cardsCount} 个` : ''}卡密
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
