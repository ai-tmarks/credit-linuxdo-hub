import { Link } from 'react-router-dom'
import { motion } from 'motion/react'
import { ArrowRight, Zap, Shield, Globe, Link2, Gift } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      <header className="border-b border-border/40 bg-background/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Zap className="size-6 text-primary" />
            <span className="font-bold text-xl">Credit Hub</span>
          </div>
          <nav className="flex items-center gap-4">
            <a href="https://credit.linux.do" target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground transition-colors">Credit 系统</a>
            <Link to="/login"><Button>登录</Button></Link>
          </nav>
        </div>
      </header>

      <section className="container mx-auto px-4 py-24 text-center">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm mb-8">
            <Zap className="size-4" />Linux Do 积分打赏工具
          </div>
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-6">
            创建<span className="text-primary">打赏链接</span>
            <br />分享到社区
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-12">
            基于 LINUX DO Credit 系统，创建专属打赏链接，分享到 Linux Do 社区，接收佬友打赏
          </p>
          <div className="flex items-center justify-center gap-4">
            <Link to="/login"><Button size="lg" className="gap-2 rounded-full">创建打赏链接 <ArrowRight className="size-4" /></Button></Link>
            <a href="https://credit.linux.do" target="_blank" rel="noopener noreferrer"><Button size="lg" variant="outline" className="rounded-full">了解 Credit 系统</Button></a>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.8, delay: 0.3 }} className="mt-16 flex flex-wrap justify-center gap-8 text-sm font-medium text-muted-foreground border-t border-border/50 pt-8">
          <div className="flex items-center gap-2"><Zap className="size-5 text-yellow-500" /><span>极速到账</span></div>
          <div className="flex items-center gap-2"><Globe className="size-5 text-blue-500" /><span>全球覆盖</span></div>
          <div className="flex items-center gap-2"><Shield className="size-5 text-green-500" /><span>安全加密</span></div>
        </motion.div>
      </section>

      <section className="container mx-auto px-4 py-16">
        <h2 className="text-2xl font-bold text-center mb-12">使用流程</h2>
        <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
          <div className="p-6 rounded-2xl border border-border/40 bg-card text-center">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <span className="text-xl font-bold text-primary">1</span>
            </div>
            <h3 className="font-semibold mb-2">登录创建链接</h3>
            <p className="text-sm text-muted-foreground">使用 Linux Do 账号登录，创建您的专属打赏链接</p>
          </div>
          <div className="p-6 rounded-2xl border border-border/40 bg-card text-center">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <Link2 className="size-6 text-primary" />
            </div>
            <h3 className="font-semibold mb-2">分享到社区</h3>
            <p className="text-sm text-muted-foreground">将链接分享到 Linux Do 帖子、签名或个人主页</p>
          </div>
          <div className="p-6 rounded-2xl border border-border/40 bg-card text-center">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <Gift className="size-6 text-primary" />
            </div>
            <h3 className="font-semibold mb-2">接收打赏</h3>
            <p className="text-sm text-muted-foreground">粉丝点击链接，通过 Credit 系统完成打赏</p>
          </div>
        </div>
      </section>

      <footer className="border-t border-border/40 mt-24">
        <div className="container mx-auto px-4 py-8 text-center text-muted-foreground">
          <p>基于 <a href="https://credit.linux.do" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">LINUX DO Credit</a> 系统</p>
        </div>
      </footer>
    </div>
  )
}
