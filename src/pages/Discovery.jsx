import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import { Search, Loader2, ChevronRight, CheckCircle2, Circle, Sparkles, SlidersHorizontal, ChevronDown, X } from 'lucide-react'
import useStore from '../store/useStore'
import clsx from 'clsx'

const EXAMPLES = [
  'Small Modular Reactors', 'AI Data Centers', 'Grid-Scale Battery Storage',
  'Defense & Counter-Drone', 'Longevity & Aging', 'Quantum Computing',
  'Space Infrastructure', 'Water Security', 'Agricultural Technology',
  'Cybersecurity', 'MLCC & Passive Components', 'Nuclear Fusion',
]

const GEOGRAPHY_OPTIONS = [
  { value: 'all', label: 'Global (all exchanges)' },
  { value: 'us-only', label: 'US-listed only' },
  { value: 'exclude-china', label: 'Exclude China' },
  { value: 'developed-only', label: 'Developed markets only' },
]

const SECTOR_COLORS = [
  'bg-violet-100 text-violet-700', 'bg-emerald-100 text-emerald-700',
  'bg-amber-100 text-amber-700', 'bg-rose-100 text-rose-700',
  'bg-cyan-100 text-cyan-700', 'bg-orange-100 text-orange-700',
]
const sectorColor = (s) => SECTOR_COLORS[Math.abs([...s].reduce((a,c) => a+c.charCodeAt(0),0)) % SECTOR_COLORS.length]

function ExposureBar({ score }) {
  const pct = (score / 10) * 100
  const color = score >= 8 ? '#22c55e' : score >= 6 ? '#0074D9' : score >= 4 ? '#f59e0b' : '#ef4444'
  const label = score >= 8 ? 'High' : score >= 6 ? 'Good' : score >= 4 ? 'Moderate' : 'Low'
  return (
    <div className="mt-3 pt-3 border-t border-slate-100">
      <div className="flex items-center justify-between mb-1">
        <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">Exposure Score</span>
        <span className="text-xs font-bold" style={{ color }}>{score}/10 · {label}</span>
      </div>
      <div className="w-full bg-slate-100 rounded-full h-1.5">
        <div className="h-1.5 rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
  )
}

export default function Discovery() {
  const navigate = useNavigate()
  const { theme, setTheme, companies, setCompanies, setSelectedCompanies, discoveryParams, setDiscoveryParams } = useStore()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [toggled, setToggled] = useState(new Set())
  const [showParams, setShowParams] = useState(false)

  const handleDiscover = async () => {
    if (!theme.trim()) return
    setLoading(true); setError(null); setCompanies([]); setToggled(new Set())
    try {
      const { data } = await axios.post('/api/discover', { theme: theme.trim(), params: discoveryParams })
      setCompanies(data.companies)
      setSelectedCompanies(data.companies)
    } catch (err) {
      setError(err.response?.data?.error || 'Discovery failed. Check that OPENAI_API_KEY is configured.')
    } finally {
      setLoading(false)
    }
  }

  const toggleCompany = (ticker) => {
    const next = new Set(toggled)
    next.has(ticker) ? next.delete(ticker) : next.add(ticker)
    setToggled(next)
    setSelectedCompanies(companies.filter(c => !next.has(c.ticker)))
  }

  const selectedCount = companies.length - toggled.size
  const avgExposure = companies.length ? (companies.reduce((s,c) => s + (c.exposureScore||5), 0) / companies.length).toFixed(1) : null

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900 mb-1">Theme Discovery</h1>
        <p className="text-slate-500 text-sm">Enter an investment theme — AI finds exposed companies with purity scores</p>
      </div>

      {/* Search */}
      <div className="flex gap-3 mb-3">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text" value={theme}
            onChange={e => setTheme(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !loading && handleDiscover()}
            placeholder="e.g. Small Modular Reactors, MLCC & Passive Components..."
            className="w-full pl-11 pr-4 py-3 rounded-xl border border-slate-200 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-gx-blue focus:border-transparent bg-white shadow-sm text-sm"
          />
        </div>
        <button onClick={() => setShowParams(p => !p)}
          className={clsx('px-3.5 py-3 rounded-xl border text-sm font-medium transition-all flex items-center gap-1.5',
            showParams ? 'bg-gx-blue-light border-gx-blue text-gx-blue' : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
          )}>
          <SlidersHorizontal className="w-4 h-4" />
          <ChevronDown className={clsx('w-3.5 h-3.5 transition-transform', showParams && 'rotate-180')} />
        </button>
        <button onClick={handleDiscover} disabled={loading || !theme.trim()}
          className="px-5 py-3 text-white font-semibold rounded-xl shadow-sm transition-colors flex items-center gap-2 min-w-[160px] justify-center disabled:opacity-50 disabled:cursor-not-allowed"
          style={{ background: loading || !theme.trim() ? '#94a3b8' : '#0074D9' }}>
          {loading ? <><Loader2 className="w-4 h-4 animate-spin" />Researching...</> : <><Sparkles className="w-4 h-4" />Find Companies</>}
        </button>
      </div>

      {/* Parameters panel */}
      {showParams && (
        <div className="bg-white border border-slate-200 rounded-xl p-4 mb-4 shadow-sm">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Max Holdings</label>
              <div className="flex items-center gap-3">
                <input type="range" min={5} max={25} step={1} value={discoveryParams.maxHoldings}
                  onChange={e => setDiscoveryParams({ maxHoldings: +e.target.value })}
                  className="flex-1 accent-gx-blue" />
                <span className="text-sm font-bold text-slate-900 w-6 text-right">{discoveryParams.maxHoldings}</span>
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Geography</label>
              <select value={discoveryParams.geography}
                onChange={e => setDiscoveryParams({ geography: e.target.value })}
                className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-gx-blue bg-white">
                {GEOGRAPHY_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Default Weighting</label>
              <select value={discoveryParams.weightingApproach}
                onChange={e => setDiscoveryParams({ weightingApproach: e.target.value })}
                className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-gx-blue bg-white">
                <option value="equal">Equal Weight</option>
                <option value="marketcap">Market Cap</option>
                <option value="maxcap">Max Cap (15%)</option>
                <option value="revenue">Revenue-Based</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Rebalancing</label>
              <select value={discoveryParams.rebalancingFreq}
                onChange={e => setDiscoveryParams({ rebalancingFreq: e.target.value })}
                className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-gx-blue bg-white">
                <option value="monthly">Monthly</option>
                <option value="quarterly">Quarterly</option>
                <option value="semi-annual">Semi-Annual</option>
                <option value="annual">Annual</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Examples */}
      <div className="flex flex-wrap gap-1.5 mb-6">
        {EXAMPLES.map(ex => (
          <button key={ex} onClick={() => setTheme(ex)}
            className={clsx('px-3 py-1 rounded-full text-xs font-medium border transition-colors',
              theme === ex ? 'border-gx-blue text-gx-blue bg-gx-blue-light' : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300 hover:text-slate-800'
            )}>
            {ex}
          </button>
        ))}
      </div>

      {error && <div className="mb-5 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">{error}</div>}

      {loading && (
        <div className="flex flex-col items-center py-16 text-slate-400">
          <Loader2 className="w-7 h-7 animate-spin mb-3" style={{ color: '#0074D9' }} />
          <p className="text-sm font-medium text-slate-600">Researching "{theme}" with GPT-4o-mini...</p>
          <p className="text-xs mt-1">Finding {discoveryParams.maxHoldings} companies · scoring exposure purity</p>
        </div>
      )}

      {!loading && companies.length > 0 && (
        <>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <div>
                <span className="text-base font-bold text-slate-900">{companies.length} companies</span>
                <span className="text-slate-400 text-sm ml-2">· {selectedCount} selected</span>
              </div>
              {avgExposure && (
                <div className="px-3 py-1 rounded-full text-xs font-semibold bg-gx-blue-light text-gx-blue">
                  Avg exposure score: {avgExposure}/10
                </div>
              )}
            </div>
            <button onClick={() => navigate('/basket')}
              className="flex items-center gap-2 px-4 py-2.5 text-white text-sm font-semibold rounded-xl transition-colors shadow-sm"
              style={{ background: '#0074D9' }}>
              Continue to Basket <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {companies.map(c => {
              const selected = !toggled.has(c.ticker)
              return (
                <div key={c.ticker} onClick={() => toggleCompany(c.ticker)}
                  className={clsx('relative p-4 rounded-xl border cursor-pointer transition-all duration-150',
                    selected ? 'bg-white border-slate-200 shadow-sm hover:border-gx-blue/40 hover:shadow-md' : 'bg-slate-50 border-slate-100 opacity-40'
                  )}>
                  <div className="absolute top-3 right-3">
                    {selected
                      ? <CheckCircle2 className="w-4.5 h-4.5" style={{ color: '#0074D9' }} />
                      : <Circle className="w-4.5 h-4.5 text-slate-300" />
                    }
                  </div>
                  <div className="flex items-start gap-3 pr-6">
                    <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: '#00263E' }}>
                      <span className="text-white text-[10px] font-bold">{c.ticker.slice(0,4)}</span>
                    </div>
                    <div className="min-w-0">
                      <div className="font-semibold text-slate-900 text-sm truncate">{c.name}</div>
                      <div className="text-slate-400 text-xs font-mono">{c.ticker} · {c.exchange}</div>
                    </div>
                  </div>
                  <div className="mt-2.5 flex flex-wrap gap-1.5">
                    <span className={clsx('px-2 py-0.5 rounded-full text-[10px] font-semibold', sectorColor(c.sector))}>{c.sector}</span>
                    <span className={clsx('px-2 py-0.5 rounded-full text-[10px] font-semibold capitalize',
                      c.exposure === 'core' ? 'bg-gx-blue-light text-gx-blue' : 'bg-slate-100 text-slate-500'
                    )}>{c.exposure}</span>
                    {c.revenueFromThemePct && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700">
                        ~{c.revenueFromThemePct}% revenue
                      </span>
                    )}
                  </div>
                  <p className="mt-2 text-slate-500 text-xs leading-relaxed line-clamp-2">{c.rationale}</p>
                  <ExposureBar score={c.exposureScore || 5} />
                </div>
              )
            })}
          </div>

          <div className="mt-5 flex justify-end gap-3">
            <button onClick={() => navigate('/basket')}
              className="flex items-center gap-2 px-5 py-2.5 text-white font-semibold rounded-xl transition-colors shadow-sm text-sm"
              style={{ background: '#0074D9' }}>
              Basket & Backtest <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </>
      )}
    </div>
  )
}
