import { Moon, Sun, LogOut, Menu } from 'lucide-react'
import { useTheme } from '@/components/theme-provider'
import { useAuth } from '@/contexts/auth-context'
import { Button } from '@/components/ui/button'

export function Header() {
  const { theme, setTheme } = useTheme()
  const { logout } = useAuth()

  return (
    <header className="sticky top-0 z-40 border-b border-border/40 bg-background/80 backdrop-blur-sm">
      <div className="flex h-16 items-center justify-between px-6">
        <Button variant="ghost" size="icon" className="lg:hidden">
          <Menu className="size-5" />
        </Button>
        <div className="flex-1" />
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
            <Sun className="size-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
            <Moon className="absolute size-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          </Button>
          <Button variant="ghost" size="icon" onClick={logout}>
            <LogOut className="size-5" />
          </Button>
        </div>
      </div>
    </header>
  )
}
