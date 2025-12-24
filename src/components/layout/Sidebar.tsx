import { Link, useLocation } from 'react-router-dom'
import { LayoutDashboard, Link2, ExternalLink, Zap, Settings, Gift, CreditCard, Ticket, ShoppingBag } from 'lucide-react'
import { cn } from '@/lib/utils'

const navigation = [
  { name: '仪表盘', href: '/dashboard', icon: LayoutDashboard },
  { name: '打赏链接', href: '/links', icon: Link2 },
  { name: '发卡商城', href: '/cards', icon: CreditCard },
  { name: '抽奖活动', href: '/lotteries', icon: Ticket },
  { name: '我的记录', href: '/my-orders', icon: ShoppingBag },
  { name: '红包（开发中）', href: '/red-packets', icon: Gift },
  { name: '设置', href: '/settings', icon: Settings },
]

export function Sidebar() {
  const location = useLocation()

  return (
    <aside className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-64 lg:flex-col">
      <div className="flex flex-col flex-grow border-r border-border/40 bg-card px-4 py-6">
        <Link to="/" className="flex items-center gap-2 px-2 mb-8">
          <Zap className="size-6 text-primary" />
          <span className="font-bold text-xl">Credit Hub</span>
        </Link>

        <nav className="flex-1 space-y-1">
          {navigation.map((item) => {
            const isActive = location.pathname === item.href
            return (
              <Link
                key={item.name}
                to={item.href}
                className={cn(
                  'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                  isActive ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                )}
              >
                <item.icon className="size-5" />
                {item.name}
              </Link>
            )
          })}

          <div className="pt-4 mt-4 border-t border-border/40">
            <p className="px-3 py-2 text-xs text-muted-foreground">外部链接</p>
            <a href="https://credit.linux.do" target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors">
              <ExternalLink className="size-5" />
              Credit 系统
            </a>
            <a href="https://linux.do" target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors">
              <ExternalLink className="size-5" />
              Linux Do
            </a>
          </div>
        </nav>

        <div className="pt-4 border-t border-border/40">
          <p className="text-xs text-muted-foreground text-center">Credit Hub</p>
        </div>
      </div>
    </aside>
  )
}
