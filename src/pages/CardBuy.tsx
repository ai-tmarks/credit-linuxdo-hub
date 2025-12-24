import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { Package, Loader2, ShoppingCart, AlertCircle, Minus, Plus } from 'lucide-react'
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

export default function CardBuy() {
  const { code } = useParams<{ code: string }>()
  const [loading, setLoading] = useState(true)
  const [link, setLink] = useState<CardLink | null>(null)
  const [canBuy, setCanBuy] = useState(true)
  const [cantBuyReason, setCantBuyReason] = useState('')
  const [userPurchaseCount, setUserPurchaseCount] = useState(0)
  const [quantity, setQuantity] = useState(1)

  const origin = typeof window !== 'undefined' ? window.location.origin : ''

  useEffect(() => {
    if (code) {
      fetchLink()
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

  // 计算最大可购买数量
  const getMaxQuantity = () => {
    if (!link) return 1

    const isOneToMany = link.card_mode === 'one_to_many'
    const hasUnlimitedStock = isOneToMany && link.total_stock <= 0

    // 库存限制
    let maxByStock = hasUnlimitedStock ? 99 : link.remaining_stock

    // 每人限购限制
    let maxByLimit = 99
    if (link.per_user_limit > 0) {
      maxByLimit = link.per_user_limit - userPurchaseCount
    }

    return Math.max(1, Math.min(maxByStock, maxByLimit, 10)) // 最多一次买10个
  }

  const maxQuantity = getMaxQuantity()

  const handleQuantityChange = (delta: number) => {
    setQuantity((prev) => Math.max(1, Math.min(maxQuantity, prev + delta)))
  }

  const handleBuy = () => {
    // 跳转到支付，带上数量参数
    window.location.href = `${origin}/api/c/${code}?qty=${quantity}`
  }

  // 计算总价
  const totalPrice = link ? link.price * quantity : 0

  // 计算将获得的卡密数量（多对多模式）
  const getCardsCount = () => {
    if (!link) return quantity
    if (link.card_mode === 'multi') {
      return quantity * (link.cards_per_order || 1)
    }
    return quantity
  }

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
          <p className="text-gray-400 mt-2">该商品可能已被删除或下架</p>
        </div>
      </div>
    )
  }

  const isOneToMany = link.card_mode === 'one_to_many'
  const hasUnlimitedStock = isOneToMany && link.total_stock <= 0
  const remainingStock = hasUnlimitedStock ? -1 : link.total_stock - link.sold_count
  const cardsCount = getCardsCount()

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* 商品卡片 */}
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          {/* 顶部 */}
          <div className="bg-gradient-to-r from-blue-500 to-blue-600 p-6 text-white">
            <div className="size-16 rounded-2xl bg-white/20 flex items-center justify-center mx-auto mb-4">
              <Package className="size-8" />
            </div>
            <h1 className="text-xl font-bold text-center">{link.title}</h1>
            {link.description && (
              <p className="text-blue-100 text-sm text-center mt-2">{link.description}</p>
            )}
          </div>

          {/* 价格和库存 */}
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

            {/* 模式说明 */}
            {link.card_mode === 'one_to_many' && (
              <div className="mb-4 p-3 rounded-lg bg-blue-50 text-blue-700 text-sm">
                📦 同一卡密可多次购买
              </div>
            )}
            {link.card_mode === 'multi' && (
              <div className="mb-4 p-3 rounded-lg bg-purple-50 text-purple-700 text-sm">
                📦 每次购买获得 {link.cards_per_order} 个卡密
              </div>
            )}

            {/* 限购提示 */}
            {link.per_user_limit > 0 && (
              <div className="mb-4 p-3 rounded-lg bg-yellow-50 text-yellow-700 text-sm flex items-center gap-2">
                <AlertCircle className="size-4 shrink-0" />
                <span>
                  每人限购 {link.per_user_limit} 件
                  {userPurchaseCount > 0 && `（已购 ${userPurchaseCount} 件）`}
                </span>
              </div>
            )}

            {/* 购买数量选择 */}
            {canBuy && maxQuantity > 1 && (
              <div className="mb-6">
                <label className="text-sm font-medium mb-2 block">购买数量</label>
                <div className="flex items-center gap-4">
                  <div className="flex items-center border rounded-lg">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-10 w-10 rounded-r-none"
                      onClick={() => handleQuantityChange(-1)}
                      disabled={quantity <= 1}
                    >
                      <Minus className="size-4" />
                    </Button>
                    <div className="w-12 text-center font-semibold">{quantity}</div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-10 w-10 rounded-l-none"
                      onClick={() => handleQuantityChange(1)}
                      disabled={quantity >= maxQuantity}
                    >
                      <Plus className="size-4" />
                    </Button>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    最多可购买 {maxQuantity} 件
                  </div>
                </div>
              </div>
            )}

            {/* 订单摘要 */}
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

            {/* 购买按钮 */}
            {canBuy ? (
              <Button className="w-full" size="lg" onClick={handleBuy}>
                <ShoppingCart className="size-5 mr-2" />
                立即购买 · {totalPrice} 积分
              </Button>
            ) : (
              <Button className="w-full" size="lg" disabled>
                {cantBuyReason || '无法购买'}
              </Button>
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
