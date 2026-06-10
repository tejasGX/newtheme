import { useNavigate } from 'react-router-dom'
import {
  LineChart, Line, AreaChart, Area,
  PieChart, Pie, Cell,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, ReferenceLine,
} from 'recharts'
import { TrendingUp, TrendingDown, Download, RotateCcw, ArrowUpRight } from 'lucide-react'
import useStore from '../store/useStore'
import clsx from 'clsx'

const PIE_COLORS = ['#3b82f6','#8b5cf6','#10b981','#f59e0b','#ef4444','#06b6d4','#84cc16','#f97316','#ec4899','#6366f1']

const pct = (v, decimals = 1) => `${v >= 0 ? '+' : ''}${(v * 100).toFixed(decimals)}%`
const fmtDate = (d) => {
  if (!d) return ''
  const parts = d.split('-')
  return `${parts[1]}/${parts[2]}/${parts[0].slice(2)}`
}

function MetricCard({ label, value, sub, positive }) {
  const isGood = positive === undefined ? value >= 0 : positive
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
      <div className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">{label}</div>
      <div className={clsx('text-2xl font-bold', isGood ? 'text-emerald-600' : 'text-red-500')}>
        {value}
      </div>
      {sub && <div className="text-xs text-slate-400 mt-0.5">{sub}</div>}
    </div>
  )
}

function SectionHeader({ children }) {
  return <h2 className="text-base font-semibold text-slate-900 mb-3">{children}</h2>
}

const CustomTooltipLine = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white border border-slate-200 rounded-lg shadow-lg p-3 text-xs">
      <div className="font-medium text-slate-600 mb-2">{fmtDate(label)}</div>
      {payload.map(p => (
        <div key={p.dataKey} className="flex items-center gap-2">
          <span style={{ color: p.color }}>●</span>
          <span className="text-slate-600 capitalize">{p.dataKey}:</span>
          <span className="font-semibold text-slate-900">{p.value?.toFixed(2)}</span>
        </div>
      ))}
    </div>
  )
}

const CustomTooltipArea = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white border border-slate-200 rounded-lg shadow-lg p-3 text-xs">
      <div className="font-medium text-slate-600 mb-1">{fmtDate(label)}</div>
      <div className="text-red-500 font-semibold">{payload[0]?.value?.toFixed(2)}%</div>
    </div>
  )
}

function thinSeries(series, maxPoints = 300) {
  if (series.length <= maxPoints) return series
  const step = Math.ceil(series.length / maxPoints)
  return series.filter((_, i) => i === 0 || i === series.length - 1 || i % step === 0)
}

function exportCsv(attribution, theme) {
  const rows = [
    ['Ticker', 'Company', 'Sector', 'Weight', 'Stock Return', 'Contribution'],
    ...attribution.map(a => [
      a.ticker, a.name, a.sector,
      (a.weight * 100).toFixed(2) + '%',
      (a.stockReturn * 100).toFixed(2) + '%',
      (a.contribution * 100).toFixed(2) + '%',
    ])
  ]
  const csv = rows.map(r => r.map(c => `"${c}"`).join(',')).join('\n')
  const blob = new Blob([csv], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${(theme || 'basket').replace(/\s+/g, '_')}_attribution.csv`
  a.click()
  URL.revokeObjectURL(url)
}

export default function Results() {
  const navigate = useNavigate()
  const { results, theme, benchmark, setResults } = useStore()

  if (!results) {
    return (
      <div className="p-8 max-w-4xl mx-auto">
        <div className="text-center py-20 text-slate-400">
          <p className="text-lg font-medium">No results yet</p>
          <p className="text-sm mt-1 mb-6">Run a backtest to see results.</p>
          <button onClick={() => navigate('/backtest')} className="px-5 py-2.5 bg-blue-600 text-white rounded-xl font-medium text-sm">
            Configure Backtest
          </button>
        </div>
      </div>
    )
  }

  const { timeseries, drawdown, metrics, attribution, sectors } = results
  const thinTs = thinSeries(timeseries)
  const thinDd = thinSeries(drawdown)
  const hasBenchmark = benchmark !== 'None' && timeseries[0]?.benchmark !== 100 || timeseries[timeseries.length - 1]?.benchmark !== 100

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 mb-1">Backtest Results</h1>
          <p className="text-slate-500 text-sm">
            {theme && <span className="font-medium text-slate-700">"{theme}"</span>}
            {' · '}{metrics.startDate} → {metrics.endDate}
            {' · '}{metrics.numHoldings} holdings
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => { setResults(null); navigate('/backtest') }}
            className="flex items-center gap-1.5 px-4 py-2.5 border border-slate-200 bg-white text-slate-700 text-sm font-medium rounded-xl hover:bg-slate-50 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" /> Re-run
          </button>
          <button
            onClick={() => exportCsv(attribution, theme)}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-sm font-semibold rounded-xl transition-colors"
          >
            <Download className="w-3.5 h-3.5" /> Export CSV
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <MetricCard label="Total Return" value={pct(metrics.totalReturn)} positive={metrics.totalReturn >= 0}
          sub={`Benchmark: ${pct(metrics.benchmarkTotalReturn)}`} />
        <MetricCard label="CAGR" value={pct(metrics.cagr)} positive={metrics.cagr >= 0}
          sub={`Benchmark: ${pct(metrics.benchmarkCagr)}`} />
        <MetricCard label="Sharpe Ratio" value={metrics.sharpe.toFixed(2)} positive={metrics.sharpe >= 1}
          sub={`Benchmark: ${metrics.benchmarkSharpe.toFixed(2)}`} />
        <MetricCard label="Max Drawdown" value={pct(metrics.maxDrawdown)} positive={false}
          sub="Peak to trough" />
        <MetricCard label="Ann. Volatility" value={pct(metrics.vol)} positive={metrics.vol < 0.25}
          sub={`Benchmark: ${pct(metrics.benchmarkVol)}`} />
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
        <SectionHeader>Cumulative Return (Indexed to 100)</SectionHeader>
        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={thinTs} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis dataKey="date" tickFormatter={fmtDate} tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} axisLine={false} minTickGap={60} />
            <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} axisLine={false} width={42} />
            <Tooltip content={<CustomTooltipLine />} />
            <Legend wrapperStyle={{ fontSize: '12px' }} />
            <Line dataKey="portfolio" name={theme || 'Portfolio'} stroke="#3b82f6" strokeWidth={2} dot={false} />
            {hasBenchmark && <Line dataKey="benchmark" name={benchmark} stroke="#94a3b8" strokeWidth={1.5} strokeDasharray="5 3" dot={false} />}
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        <div className="lg:col-span-3 bg-white rounded-xl border border-slate-200 shadow-sm p-5">
          <SectionHeader>Drawdown</SectionHeader>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={thinDd} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="ddGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="date" tickFormatter={fmtDate} tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} axisLine={false} minTickGap={60} />
              <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} axisLine={false} width={42} tickFormatter={v => `${v}%`} />
              <ReferenceLine y={0} stroke="#e2e8f0" />
              <Tooltip content={<CustomTooltipArea />} />
              <Area dataKey="value" name="Drawdown" stroke="#ef4444" fill="url(#ddGrad)" strokeWidth={1.5} dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-sm p-5">
          <SectionHeader>Sector Breakdown</SectionHeader>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={sectors} dataKey="weight" nameKey="sector" cx="50%" cy="50%" outerRadius={75} innerRadius={40} paddingAngle={2}>
                {sectors.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
              </Pie>
              <Tooltip formatter={v => `${(v * 100).toFixed(1)}%`} />
              <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '11px' }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <SectionHeader>Return Attribution</SectionHeader>
          <span className="text-xs text-slate-400">Buy-and-hold return contribution by holding</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Ticker</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Company</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Sector</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Weight</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Stock Return</th>
                <th className="text-right px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Contribution</th>
              </tr>
            </thead>
            <tbody>
              {attribution.map((a, i) => (
                <tr key={a.ticker} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 bg-slate-900 rounded-md flex items-center justify-center">
                        <span className="text-white text-xs font-bold">{a.ticker.slice(0, 3)}</span>
                      </div>
                      <span className="font-mono font-semibold text-slate-900 text-xs">{a.ticker}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-slate-700 max-w-[180px] truncate text-xs">{a.name}</td>
                  <td className="px-4 py-3 text-slate-500 text-xs truncate max-w-[120px]">{a.sector}</td>
                  <td className="px-4 py-3 text-right text-slate-700 font-medium text-xs">{(a.weight * 100).toFixed(1)}%</td>
                  <td className={clsx('px-4 py-3 text-right font-semibold text-xs', a.stockReturn >= 0 ? 'text-emerald-600' : 'text-red-500')}>
                    <span className="flex items-center justify-end gap-1">
                      {a.stockReturn >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                      {pct(a.stockReturn)}
                    </span>
                  </td>
                  <td className={clsx('px-5 py-3 text-right font-bold text-xs', a.contribution >= 0 ? 'text-emerald-600' : 'text-red-500')}>
                    {pct(a.contribution, 2)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-slate-200 bg-slate-50">
                <td colSpan={4} className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase">Total Portfolio</td>
                <td className="px-4 py-3 text-right">
                  <span className={clsx('font-bold text-sm', metrics.totalReturn >= 0 ? 'text-emerald-600' : 'text-red-500')}>
                    {pct(metrics.totalReturn)}
                  </span>
                </td>
                <td className="px-5 py-3 text-right">
                  <span className={clsx('font-bold text-sm', metrics.totalReturn >= 0 ? 'text-emerald-600' : 'text-red-500')}>
                    {pct(attribution.reduce((s, a) => s + a.contribution, 0), 2)}
                  </span>
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  )
}
