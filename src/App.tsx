import { Routes, Route } from 'react-router-dom'
import { Toaster } from 'sonner'
import { ThemeProvider } from '@/components/theme-provider'
import { AuthProvider } from '@/contexts/auth-context'
import Home from '@/pages/Home'
import Login from '@/pages/Login'
import Dashboard from '@/pages/Dashboard'
import TipLinks from '@/pages/TipLinks'
import TipSuccess from '@/pages/TipSuccess'
import Settings from '@/pages/Settings'
import RedPackets from '@/pages/RedPackets'
import RedPacketClaim from '@/pages/RedPacketClaim'
import CardLinks from '@/pages/CardLinks'
import CardBuy from '@/pages/CardBuy'
import CardSuccess from '@/pages/CardSuccess'
import Lotteries from '@/pages/Lotteries'
import LotteryJoin from '@/pages/LotteryJoin'
import MyOrders from '@/pages/MyOrders'
import DashboardLayout from '@/components/layout/DashboardLayout'

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/tip/success" element={<TipSuccess />} />
          <Route path="/r/:code" element={<RedPacketClaim />} />
          <Route path="/c/:code" element={<CardBuy />} />
          <Route path="/card/success" element={<CardSuccess />} />
          <Route path="/l/:code" element={<LotteryJoin />} />
          <Route element={<DashboardLayout />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/links" element={<TipLinks />} />
            <Route path="/cards" element={<CardLinks />} />
            <Route path="/lotteries" element={<Lotteries />} />
            <Route path="/my-orders" element={<MyOrders />} />
            <Route path="/red-packets" element={<RedPackets />} />
            <Route path="/settings" element={<Settings />} />
          </Route>
        </Routes>
        <Toaster position="top-center" />
      </AuthProvider>
    </ThemeProvider>
  )
}
