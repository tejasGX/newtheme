import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { ChevronRight, ChevronLeft, X, Plus } from 'lucide-react'
import useStore from '../store/useStore'
import clsx from 'clsx'

const WEIGHTING_OPTIONS = [
  { value: 'equal', label: 'Equal Weight' },
  { value: 'marketcap', label: 'Market Cap' },
  { value: 'maxcap', label: 'Max Cap' },
]

const PIE_COLORS = [
  '#3b82f6','#8b5cf6','#10b981','#f59e0b','#ef4444',
  '#06b6d4','#84cc16','#f97316','#ec4899','#6366f1',
  '#14b8a6','#a855f7','#eab308','#22c55e','#64748b',
]

function calcEqualWeights(tickers) {
  const w = 1 / tickers.length
  return Object.fromEntries(tickers.map(t => [t, w]))
}

function calcMarketCapWeights(companies, maxCap, mode) {
  const total = companies.reduce((s, c) => s + (c.marketCapBn || 1), 0)
  let weights = Object.fromEntries(companies.map(c => [c.ticker, (c.marketCapBn || 1) / total]))

  if (mode === 'maxcap') {
    let iters = 0
    while (iters < 50) {
      const capped = Object.keys(weights).filter(t => weights[t] > maxCap)
      if (!capped.length) break
      const uncapped = Object.keys(weights).filter(t => weights[t] <= maxCap)
      let excess = 0
      capped.forEach(t => { excess += weights[t] - maxCap; weights[t] = maxCap })
      const uncappedSum = uncapped.reduce((s, t) => s + weights[t], 0)
      if (!uncappedSum || !uncapped.length) break
      uncapped.forEach(t => { weights[t] += excess * (weights[t] / uncappedSum) })
      iters++
      if (!uncapped.some(t => weights[t] > maxCap + 1e-9)) break
    }
    const sum = Object.values(weights).reduce((a, b) => a + b, 0)
    Object.keys(weights).forEach(t => weights[t] /= sum)
  }
  return weights
}

const fmt = (v) => `${(v * 100).toFixed(1)}%`

export default function Basket() {
  const navigate = useNavigate()
  const {
    theme,
    selectedCompanies, setSelectedCompanies,
    weighting, setWeighting,
    maxCap, setMaxCap,
  } = useStore()

  const [newTicker, setNewTicker] = useState('')

  const weights = useMemo(() => {
    if (!selectedCompanies.length) return {}
    if (weighting === 'equal') return calcEqualWeights(selectedCompanies.map(c => c.ticker))
    return calcMarketCapWeights(selectedCompanies, maxCap, weighting)
  }, [selectedCompanies, weighting, maxCap])

  const pieData = selectedCompanies.map(c => ({
    name: c.ticker,
    value: parseFloat(((weights[c.ticker] || 0) * 100).toFixed(1)),
  }))

  const remove = (ticker) => setSelectedCompanies(selectedCompanies.filter(c => c.ticker !== ticker))

  const addTicker = () => {
    const t = newTicker.trim().toUpperCase()
    if (!t || selectedCompanies.find(c => c.ticker === t)) { setNewTicker(''); return }
    setSelectedCompanies([...selectedCompanies, {
      ticker: t, name: t, sector: 'Unknown', industry: 'Unknown',
      exposure: 'secondary', rationale: 'Manually added', marketCapBn: 1,
    }])
    setNewTicker('')
  }

  if (!selectedCompanies.length) {
    return (
      <div className="p-8 max-w-4xl mx-auto">
        <div className="text-center py-20 text-slate-400">
          <p className="text-lg font-medium">No companies selected</p>
          <p className="text-sm mt-1 mb-6">Go back to Discovery to find companies for your theme.</p>
          <button onClick={() => navigate('/')} className="px-5 py-2.5 bg-blue-600 text-white rounded-xl font-medium text-sm">
            Back to Discovery
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 mb-1">Build Your Basket</h1>
          <p className="text-slate-500 text-sm">
            {theme && <span className="font-medium text-slate-700">"{theme}"</span>} · {selectedCompanies.length} holdings
          </p>
        </div>
        <div className="flex gap-3">
          <button onClick={() => navigate('/')} className="flex items-center gap-1.5 px-4 py-2.5 border border-slate-200 bg-white text-slate-700 text-sm font-medium rounded-xl hover:bg-slate-50 transition-colors">
            <ChevronLeft className="w-4 h-4" /> Back
          </button>
          <button onClick={() => navigate('/backtest')} className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl transition-colors shadow-sm">
            Configure Backtest <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className="lg:col-span-3">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <h2 className="font-semibold text-slate-900 text-sm">Holdings</h2>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={newTicker}
                  onChange={e => setNewTicker(e.target.value.toUpperCase())}
                  onKeyDown={e => e.key === 'Enter' && addTicker()}
                  placeholder="Add ticker..."
                  className="text-sm px-3 py-1.5 border border-slate-200 rounded-lg w-32 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button onClick={addTicker} className="p-1.5 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-lg transition-colors">
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100">
                    <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Ticker</th>
                    <th className="text-left px-3 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Company</th>
                    <th className="text-left px-3 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Sector</th>
                    <th className="text-right px-3 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Weight</th>
                    <th className="px-3 py-3 w-8"></th>
                  </tr>
                </thead>
                <tbody>
                  {selectedCompanies.map((c, i) => (
                    <tr key={c.ticker} className={clsx('border-b border-slate-50 hover:bg-slate-50 transition-colors', i % 2 === 0 ? '' : 'bg-slate-50/30')}>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 bg-slate-900 rounded-md flex items-center justify-center">
                            <span className="text-white text-xs font-bold">{c.ticker.slice(0, 3)}</span>
                          </div>
                          <span className="font-mono font-semibold text-slate-900 text-xs">{c.ticker}</span>
                        </div>
                      </td>
                      <td className="px-3 py-3 text-slate-700 max-w-[180px] truncate">{c.name}</td>
                      <td className="px-3 py-3">
                        <span className="text-xs text-slate-500 truncate max-w-[120px] block">{c.sector}</span>
                      </td>
                      <td className="px-3 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <div className="w-16 bg-slate-100 rounded-full h-1.5">
                            <div
                              className="bg-blue-500 h-1.5 rounded-full"
                              style={{ width: `${(weights[c.ticker] || 0) * 100}%` }}
                            />
                          </div>
                          <span className="font-semibold text-slate-900 w-12 text-right">{fmt(weights[c.ticker] || 0)}</span>
                        </div>
                      </td>
                      <td className="px-3 py-3">
                        <button onClick={() => remove(c.ticker)} className="p-1 text-slate-300 hover:text-red-400 transition-colors rounded">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-slate-200 bg-slate-50">
                    <td colSpan={3} className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase">Total</td>
                    <td className="px-3 py-3 text-right font-bold text-slate-900">
                      {fmt(Object.values(weights).reduce((a, b) => a + b, 0))}
                    </td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>

        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
            <h2 className="font-semibold text-slate-900 text-sm mb-4">Weighting Method</h2>
            <div className="flex flex-col gap-2">
              {WEIGHTING_OPTIONS.map(o => (
                <button
                  key={o.value}
                  onClick={() => setWeighting(o.value)}
                  className={clsx(
                    'flex items-center justify-between px-4 py-3 rounded-xl border text-sm font-medium transition-all',
                    weighting === o.value
                      ? 'bg-blue-600 border-blue-600 text-white shadow-sm'
                      : 'border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-50'
                  )}
                >
                  {o.label}
                  {weighting === o.value && <span className="text-blue-200 text-xs">✓ Active</span>}
                </button>
              ))}
            </div>

            {weighting === 'maxcap' && (
              <div className="mt-4 pt-4 border-t border-slate-100">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-medium text-slate-600">Max Weight per Stock</label>
                  <span className="text-sm font-bold text-slate-900">{fmt(maxCap)}</span>
                </div>
                <input
                  type="range"
                  min={5} max={25} step={1}
                  value={Math.round(maxCap * 100)}
                  onChange={e => setMaxCap(parseInt(e.target.value) / 100)}
                  className="w-full accent-blue-600"
                />
                <div className="flex justify-between text-xs text-slate-400 mt-1">
                  <span>5%</span><span>25%</span>
                </div>
              </div>
            )}
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
            <h2 className="font-semibold text-slate-900 text-sm mb-3">Weight Distribution</h2>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={pieData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={85}
                  paddingAngle={2}
                >
                  {pieData.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v) => `${v}%`} />
                <Legend
                  iconType="circle"
                  iconSize={8}
                  wrapperStyle={{ fontSize: '11px' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  )
}
