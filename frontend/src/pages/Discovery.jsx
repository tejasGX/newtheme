import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import { Search, Loader2, ChevronRight, CheckCircle2, Circle } from 'lucide-react'
import useStore from '../store/useStore'
import clsx from 'clsx'

const EXAMPLES = [
  'Small Modular Reactors',
  'AI Data Centers',
  'Grid-Scale Battery Storage',
  'Defense & Counter-Drone Tech',
  'Longevity & Aging',
  'Ocean Wind Energy',
  'Space Infrastructure',
  'Water Security',
]

const EXPOSURE_COLORS = {
  core: 'bg-blue-100 text-blue-700',
  secondary: 'bg-slate-100 text-slate-600',
}

const SECTOR_COLORS = [
  'bg-violet-100 text-violet-700',
  'bg-emerald-100 text-emerald-700',
  'bg-amber-100 text-amber-700',
  'bg-rose-100 text-rose-700',
  'bg-cyan-100 text-cyan-700',
  'bg-orange-100 text-orange-700',
]
const sectorColor = (sector) => {
  const idx = Math.abs([...sector].reduce((a, c) => a + c.charCodeAt(0), 0)) % SECTOR_COLORS.length
  return SECTOR_COLORS[idx]
}

export default function Discovery() {
  const navigate = useNavigate()
  const { theme, setTheme, companies, setCompanies, setSelectedCompanies } = useStore()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [toggled, setToggled] = useState(new Set())

  const handleDiscover = async () => {
    if (!theme.trim()) return
    setLoading(true)
    setError(null)
    try {
      const { data } = await axios.post('/api/discover', { theme: theme.trim() })
      setCompanies(data.companies)
      setSelectedCompanies(data.companies)
      setToggled(new Set())
    } catch (err) {
      setError(err.response?.data?.error || 'Discovery failed. Check your API key and try again.')
    } finally {
      setLoading(false)
    }
  }

  const toggleCompany = (ticker) => {
    const next = new Set(toggled)
    next.has(ticker) ? next.delete(ticker) : next.add(ticker)
    setToggled(next)
    const selected = companies.filter(c => !next.has(c.ticker))
    setSelectedCompanies(selected)
  }

  const selectedCount = companies.length - toggled.size

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900 mb-1">Discover Your Theme</h1>
        <p className="text-slate-500">Enter a theme to find exposed public companies using AI</p>
      </div>

      {/* Search bar */}
      <div className="flex gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            type="text"
            value={theme}
            onChange={e => setTheme(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleDiscover()}
            placeholder="e.g. Small Modular Reactors, AI Data Centers..."
            className="w-full pl-12 pr-4 py-3.5 rounded-xl border border-slate-200 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white shadow-sm text-base"
          />
        </div>
        <button
          onClick={handleDiscover}
          disabled={loading || !theme.trim()}
          className="px-6 py-3.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-xl shadow-sm transition-colors flex items-center gap-2 min-w-[160px] justify-center"
        >
          {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Discovering...</> : 'Discover Companies'}
        </button>
      </div>

      {/* Example chips */}
      <div className="flex flex-wrap gap-2 mb-8">
        {EXAMPLES.map(ex => (
          <button
            key={ex}
            onClick={() => setTheme(ex)}
            className={clsx(
              'px-3 py-1.5 rounded-full text-sm font-medium border transition-colors',
              theme === ex
                ? 'bg-blue-50 border-blue-300 text-blue-700'
                : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300 hover:text-slate-900'
            )}
          >
            {ex}
          </button>
        ))}
      </div>

      {/* Error */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
          {error}
        </div>
      )}

      {/* Results */}
      {companies.length > 0 && (
        <>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">
                {companies.length} companies found
              </h2>
              <p className="text-sm text-slate-500">{selectedCount} selected for basket</p>
            </div>
            <button
              onClick={() => navigate('/basket')}
              className="flex items-center gap-2 px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-sm font-semibold rounded-xl transition-colors shadow-sm"
            >
              Continue to Basket <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {companies.map(c => {
              const selected = !toggled.has(c.ticker)
              return (
                <div
                  key={c.ticker}
                  onClick={() => toggleCompany(c.ticker)}
                  className={clsx(
                    'relative p-4 rounded-xl border cursor-pointer transition-all duration-150',
                    selected
                      ? 'bg-white border-slate-200 shadow-sm hover:border-blue-300 hover:shadow-md'
                      : 'bg-slate-50 border-slate-200 opacity-50'
                  )}
                >
                  {/* Selection indicator */}
                  <div className="absolute top-3 right-3">
                    {selected
                      ? <CheckCircle2 className="w-5 h-5 text-blue-500" />
                      : <Circle className="w-5 h-5 text-slate-300" />
                    }
                  </div>

                  <div className="flex items-start gap-3 pr-6">
                    <div className="w-10 h-10 bg-slate-900 rounded-lg flex items-center justify-center flex-shrink-0">
                      <span className="text-white text-xs font-bold">{c.ticker.slice(0, 4)}</span>
                    </div>
                    <div className="min-w-0">
                      <div className="font-semibold text-slate-900 text-sm truncate">{c.name}</div>
                      <div className="text-slate-400 text-xs font-mono mt-0.5">{c.ticker} · {c.exchange}</div>
                    </div>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-1.5">
                    <span className={clsx('px-2 py-0.5 rounded-full text-xs font-medium', sectorColor(c.sector))}>
                      {c.sector}
                    </span>
                    <span className={clsx('px-2 py-0.5 rounded-full text-xs font-semibold capitalize', EXPOSURE_COLORS[c.exposure] || EXPOSURE_COLORS.secondary)}>
                      {c.exposure}
                    </span>
                  </div>

                  <p className="mt-2 text-slate-500 text-xs leading-relaxed line-clamp-3">
                    {c.rationale}
                  </p>
                </div>
              )
            })}
          </div>

          <div className="mt-6 flex justify-end">
            <button
              onClick={() => navigate('/basket')}
              className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-colors shadow-sm"
            >
              Continue to Basket ({selectedCount} companies) <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </>
      )}
    </div>
  )
}
