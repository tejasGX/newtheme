import { NavLink, Outlet } from 'react-router-dom'
import { Search, LayoutGrid, TrendingUp, BarChart2, FlaskConical } from 'lucide-react'
import clsx from 'clsx'

const navItems = [
  { to: '/', icon: Search, label: 'Discovery', end: true },
  { to: '/basket', icon: LayoutGrid, label: 'Basket' },
  { to: '/backtest', icon: TrendingUp, label: 'Backtest' },
  { to: '/results', icon: BarChart2, label: 'Results' },
]

export default function Layout() {
  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      <aside className="w-64 flex-shrink-0 bg-slate-900 flex flex-col">
        <div className="p-6 border-b border-slate-700">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-blue-600 rounded-lg flex items-center justify-center shadow-lg">
              <FlaskConical className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="text-white font-bold text-lg leading-tight">ETF Lab</div>
              <div className="text-slate-400 text-xs font-medium tracking-wide">Thematic Research</div>
            </div>
          </div>
        </div>
        <nav className="flex-1 p-4 space-y-1">
          {navItems.map(({ to, icon: Icon, label, end }) => (
            <NavLink key={to} to={to} end={end}
              className={({ isActive }) => clsx(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150',
                isActive ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:text-white hover:bg-slate-800'
              )}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="p-4 border-t border-slate-700">
          <div className="text-slate-500 text-xs text-center">Powered by GPT-4o-mini</div>
        </div>
      </aside>
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  )
}
