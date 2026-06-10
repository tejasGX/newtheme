import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import { Loader2, ChevronLeft, Play, Calendar, TrendingUp, Settings } from 'lucide-react'
import useStore from '../store/useStore'
import clsx from 'clsx'

const BENCHMARKS = [
  { value: 'SPY', label: 'SPY — S&P 500' },
  { value: 'QQQ', label: 'QQQ — Nasdaq 100' },
  { value: 'IWM', label: 'IWM — Russell 2000' },
  { value: 'None', label: 'No Benchmark' },
]

const REBALANCE_OPTIONS = [
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'annual', label: 'Annual' },
]

const WEIGHTING_LABELS = { equal: 'Equal Weight', marketcap: 'Market Cap', maxcap: 'Max Cap' }

export default function Backtest() {
  const navigate = useNavigate()
  const {
    theme, selectedCompanies, weighting, maxCap,
    startDate, setStartDate,
    endDate, setEndDate,
    benchmark, setBenchmark,
    rebalanceFreq, setRebalanceFreq,
    setResults,
  } = useStore()

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const handleRun = async () => {
    setLoading(true)
    setError(null)
    try {
      const { data } = await axios.post('/api/backtest', {
        companies: selectedCompanies,
        weighting,
        maxCap,
        startDate,
        endDate,
        benchmark,
        rebalanceFreq,
      })
      setResults(data)
      navigate('/results')
    } catch (err) {
      setError(err.response?.data?.error || 'Backtest failed. Some tickers may not have data for the selected period.')
    } finally {
      setLoading(false)
    }
  }

  if (!selectedCompanies.length) {
    return (
      <div className="p-8 max-w-4xl mx-auto">
        <div className="text-center py-20 text-slate-400">
          <p className="text-lg font-medium">No basket configured</p>
          <p className="text-sm mt-1 mb-6">Go back to build your basket first.</p>
          <button onClick={() => navigate('/')} className="px-5 py-2.5 bg-blue-600 text-white rounded-xl font-medium text-sm">
            Start Over
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 mb-1">Configure Backtest</h1>
          <p className="text-slate-500 text-sm">Set parameters and run your historical simulation</p>
        </div>
        <button onClick={() => navigate('/basket')} className="flex items-center gap-1.5 px-4 py-2.5 border border-slate-200 bg-white text-slate-700 text-sm font-medium rounded-xl hover:bg-slate-50 transition-colors">
          <ChevronLeft className="w-4 h-4" /> Back
        </button>
      </div>

      <div className="bg-slate-900 rounded-2xl p-5 mb-6 text-white">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-6 h-6 bg-blue-500 rounded flex items-center justify-center">
            <TrendingUp className="w-3.5 h-3.5 text-white" />
          </div>
          <span className="font-semibold text-sm">Basket Summary</span>
        </div>
        <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
          <div>
            <span className="text-slate-400 text-xs">Theme</span>
            <div className="font-medium truncate">{theme || '—'}</div>
          </div>
          <div>
            <span className="text-slate-400 text-xs">Holdings</span>
            <div className="font-medium">{selectedCompanies.length} companies</div>
          </div>
          <div>
            <span className="text-slate-400 text-xs">Weighting</span>
            <div className="font-medium">{WEIGHTING_LABELS[weighting]}</div>
          </div>
          <div>
            <span className="text-slate-400 text-xs">Top Holdings</span>
            <div className="font-medium text-xs">{selectedCompanies.slice(0, 3).map(c => c.ticker).join(', ')}...</div>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-4">
            <Calendar className="w-4 h-4 text-slate-500" />
            <h2 className="font-semibold text-slate-900 text-sm">Date Range</h2>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">Start Date</label>
              <input
                type="date"
                value={startDate}
                max={endDate}
                onChange={e => setStartDate(e.target.value)}
                className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">End Date</label>
              <input
                type="date"
                value={endDate}
                min={startDate}
                onChange={e => setEndDate(e.target.value)}
                className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800">
          <strong>Note:</strong> Backtest uses sector-calibrated simulated price paths (GBM). Results are illustrative — real historical data integration is planned for v2.
        </div>

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-4 h-4 text-slate-500" />
            <h2 className="font-semibold text-slate-900 text-sm">Benchmark</h2>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {BENCHMARKS.map(b => (
              <button
                key={b.value}
                onClick={() => setBenchmark(b.value)}
                className={clsx(
                  'px-4 py-2.5 rounded-xl border text-sm font-medium text-left transition-all',
                  benchmark === b.value
                    ? 'bg-blue-600 border-blue-600 text-white'
                    : 'border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-50'
                )}
              >
                {b.label}
              </button>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-4">
            <Settings className="w-4 h-4 text-slate-500" />
            <h2 className="font-semibold text-slate-900 text-sm">Rebalancing Frequency</h2>
          </div>
          <div className="flex gap-2">
            {REBALANCE_OPTIONS.map(o => (
              <button
                key={o.value}
                onClick={() => setRebalanceFreq(o.value)}
                className={clsx(
                  'flex-1 py-2.5 rounded-xl border text-sm font-medium transition-all',
                  rebalanceFreq === o.value
                    ? 'bg-blue-600 border-blue-600 text-white'
                    : 'border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-50'
                )}
              >
                {o.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {error && (
        <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
          {error}
        </div>
      )}

      <button
        onClick={handleRun}
        disabled={loading}
        className="mt-6 w-full flex items-center justify-center gap-2 py-4 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed text-white font-bold text-base rounded-xl shadow-sm transition-colors"
      >
        {loading
          ? <><Loader2 className="w-5 h-5 animate-spin" /> Running Backtest...</>
          : <><Play className="w-5 h-5" /> Run Backtest</>
        }
      </button>
      {loading && (
        <p className="text-center text-slate-400 text-xs mt-2">
          Fetching market data for {selectedCompanies.length} tickers — this may take 15-30 seconds
        </p>
      )}
    </div>
  )
}
