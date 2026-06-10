import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import axios from 'axios'
import { Loader2, ChevronLeft, AlertTriangle, TrendingUp, Shield, Zap, Clock, Building2 } from 'lucide-react'
import clsx from 'clsx'

const SECTOR_COLORS = [
  'bg-violet-100 text-violet-700','bg-emerald-100 text-emerald-700',
  'bg-amber-100 text-amber-700','bg-rose-100 text-rose-700',
  'bg-cyan-100 text-cyan-700','bg-orange-100 text-orange-700',
]
const sectorColor = (s='') => SECTOR_COLORS[Math.abs([...s].reduce((a,c)=>a+c.charCodeAt(0),0))%SECTOR_COLORS.length]

function ScoreDot({ score }) {
  const color = score>=8?'#22c55e':score>=6?'#0074D9':score>=4?'#f59e0b':'#ef4444'
  return (
    <span className="inline-flex items-center gap-1 text-xs font-bold" style={{color}}>
      <span className="w-2 h-2 rounded-full inline-block" style={{background:color}}/>
      {score}/10
    </span>
  )
}

export default function ReportView() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [report, setReport] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    axios.get(`/api/reports/${id}`)
      .then(({data}) => setReport(data))
      .catch(err => setError(err.response?.data?.error || 'Failed to load report'))
      .finally(() => setLoading(false))
  }, [id])

  if (loading) return (
    <div className="flex items-center justify-center h-full text-slate-400">
      <Loader2 className="w-6 h-6 animate-spin mr-2"/>Loading report...
    </div>
  )

  if (error || !report) return (
    <div className="p-8 text-center text-slate-400">
      <p className="font-medium">{error || 'Report not found'}</p>
      <button onClick={() => navigate('/reports')} className="mt-4 text-gx-blue text-sm font-medium">← Back to library</button>
    </div>
  )

  return (
    <div className="max-w-4xl mx-auto p-6 pb-16">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate('/reports')} className="flex items-center gap-1 text-slate-400 hover:text-slate-600 text-sm transition-colors">
          <ChevronLeft className="w-4 h-4"/>Back
        </button>
      </div>

      {/* Hero */}
      <div className="rounded-2xl p-6 mb-6 text-white" style={{background:'linear-gradient(135deg, #00263E 0%, #003d61 100%)'}}>
        <div className="text-gx-blue text-xs font-bold tracking-widest uppercase mb-2">Theme Study · Global X Product Development</div>
        <h1 className="text-3xl font-black tracking-tight mb-3">{report.theme}</h1>
        <p className="text-white/80 text-sm leading-relaxed max-w-2xl">{report.thesis}</p>
        <div className="flex flex-wrap gap-4 mt-5 pt-5 border-t border-white/15">
          {report.marketSizeBn && (
            <div><div className="text-white/50 text-[10px] uppercase tracking-wide">Est. TAM</div><div className="text-lg font-bold">${report.marketSizeBn}bn</div></div>
          )}
          {report.marketSizeCagr && (
            <div><div className="text-white/50 text-[10px] uppercase tracking-wide">CAGR</div><div className="text-lg font-bold">{report.marketSizeCagr}</div></div>
          )}
          <div><div className="text-white/50 text-[10px] uppercase tracking-wide">Holdings</div><div className="text-lg font-bold">{report.companies.length}</div></div>
          <div><div className="text-white/50 text-[10px] uppercase tracking-wide">Geography</div><div className="text-lg font-bold capitalize">{report.params?.geography?.replace('-',' ') || 'Global'}</div></div>
        </div>
      </div>

      {/* Why Now */}
      {report.whyNow && (
        <div className="bg-gx-blue-light border border-gx-blue/20 rounded-xl p-4 mb-5 flex items-start gap-3">
          <Clock className="w-4 h-4 text-gx-blue flex-shrink-0 mt-0.5"/>
          <div>
            <div className="text-xs font-bold text-gx-blue uppercase tracking-wide mb-1">Why Now</div>
            <p className="text-slate-700 text-sm leading-relaxed">{report.whyNow}</p>
          </div>
        </div>
      )}

      {/* Demand Drivers */}
      {report.drivers?.length > 0 && (
        <div className="mb-5">
          <h2 className="text-base font-bold text-slate-900 mb-3 flex items-center gap-2">
            <Zap className="w-4 h-4 text-gx-blue"/>Demand Drivers
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {report.drivers.map((d, i) => (
              <div key={i} className="bg-white rounded-xl border border-slate-200 p-4">
                <div className="text-[10px] font-black text-gx-blue uppercase tracking-wider mb-1">Driver {String(i+1).padStart(2,'0')}</div>
                <div className="font-bold text-slate-900 text-sm mb-1">{d.title}</div>
                <p className="text-slate-500 text-xs leading-relaxed">{d.description}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Holdings */}
      <div className="mb-5">
        <h2 className="text-base font-bold text-slate-900 mb-3 flex items-center gap-2">
          <Building2 className="w-4 h-4 text-gx-blue"/>Holdings ({report.companies.length})
        </h2>
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                <th className="text-left px-4 py-2.5 text-[10px] font-semibold text-slate-400 uppercase tracking-wide">Company</th>
                <th className="text-left px-3 py-2.5 text-[10px] font-semibold text-slate-400 uppercase tracking-wide hidden sm:table-cell">Sector</th>
                <th className="text-center px-3 py-2.5 text-[10px] font-semibold text-slate-400 uppercase tracking-wide">Exposure</th>
                <th className="text-right px-4 py-2.5 text-[10px] font-semibold text-slate-400 uppercase tracking-wide hidden md:table-cell">Mkt Cap</th>
              </tr>
            </thead>
            <tbody>
              {report.companies.sort((a,b)=>(b.exposureScore||5)-(a.exposureScore||5)).map((c,i) => (
                <tr key={c.ticker} className="border-b border-slate-50 hover:bg-slate-50/80 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 text-white text-[10px] font-bold" style={{background:'#00263E'}}>{c.ticker.slice(0,3)}</div>
                      <div>
                        <div className="font-semibold text-slate-900 text-xs">{c.name}</div>
                        <div className="text-slate-400 text-[10px] font-mono">{c.ticker} · {c.exchange}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-3 hidden sm:table-cell">
                    <span className={clsx('px-2 py-0.5 rounded-full text-[10px] font-semibold', sectorColor(c.sector))}>{c.sector}</span>
                  </td>
                  <td className="px-3 py-3 text-center">
                    <ScoreDot score={c.exposureScore||5}/>
                  </td>
                  <td className="px-4 py-3 text-right text-xs text-slate-500 hidden md:table-cell">
                    {c.marketCapBn ? `$${c.marketCapBn}bn` : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Risks */}
      {report.keyRisks?.length > 0 && (
        <div className="mb-5">
          <h2 className="text-base font-bold text-slate-900 mb-3 flex items-center gap-2">
            <Shield className="w-4 h-4 text-red-500"/>Key Risks
          </h2>
          <div className="space-y-2">
            {report.keyRisks.map((r,i) => (
              <div key={i} className="bg-red-50 border border-red-100 rounded-xl p-4 flex items-start gap-3">
                <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5"/>
                <div>
                  <div className="font-semibold text-red-800 text-sm">{r.title}</div>
                  <p className="text-red-700/80 text-xs mt-0.5 leading-relaxed">{r.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Competitive Landscape + Construction */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {report.competitorProducts && (
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <div className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Competitive Landscape</div>
            <p className="text-slate-700 text-sm leading-relaxed">{report.competitorProducts}</p>
          </div>
        )}
        {report.constructionNote && (
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <div className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Construction Notes</div>
            <p className="text-slate-700 text-sm leading-relaxed">{report.constructionNote}</p>
          </div>
        )}
      </div>
    </div>
  )
}
