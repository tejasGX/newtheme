import { NavLink, Outlet } from 'react-router-dom'
import { Search, LayoutGrid, TrendingUp, BarChart2, BookOpen } from 'lucide-react'
import clsx from 'clsx'

const navItems = [
  { to: '/', icon: Search, label: 'Discovery', end: true },
  { to: '/basket', icon: LayoutGrid, label: 'Basket' },
  { to: '/backtest', icon: TrendingUp, label: 'Backtest' },
  { to: '/results', icon: BarChart2, label: 'Results' },
  { to: '/reports', icon: BookOpen, label: 'Reports' },
]

export default function Layout() {
  return (
    <div className="flex h-screen bg-gx-slate overflow-hidden">
      <aside className="w-60 flex-shrink-0 flex flex-col" style={{ background: '#00263E' }}>
        {/* Logo */}
        <div className="px-5 py-5 border-b border-white/10">
          <div className="flex items-center gap-2.5 mb-0.5">
            <div className="w-8 h-8 rounded flex items-center justify-center flex-shrink-0" style={{ background: '#0074D9' }}>
              <span className="text-white font-black text-xs tracking-tight">GX</span>
            </div>
            <div>
              <div className="text-white font-bold text-sm leading-tight tracking-tight">ETF Lab</div>
              <div className="text-white/40 text-[10px] font-medium tracking-wider uppercase">Product Development</div>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-3 space-y-0.5">
          {navItems.map(({ to, icon: Icon, label, end }) => (
            <NavLink key={to} to={to} end={end}
              className={({ isActive }) => clsx(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all',
                isActive
                  ? 'text-white shadow-sm'
                  : 'text-white/55 hover:text-white/90 hover:bg-white/8'
              )}
              style={({ isActive }) => isActive ? { background: '#0074D9' } : {}}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="px-5 py-4 border-t border-white/10">
          <div className="text-white/30 text-[10px] font-medium tracking-wide">Powered by GPT-4o-mini</div>
        </div>
      </aside>

      <main className="flex-1 overflow-auto bg-gx-slate">
        <Outlet />
      </main>
    </div>
  )
}
