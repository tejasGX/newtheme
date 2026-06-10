import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import { Search, FileText, ChevronRight, Loader2, AlertCircle, Plus } from 'lucide-react'

function timeAgo(ts) {
  const s = Math.floor((Date.now() - ts) / 1000)
  if (s < 60) return 'just now'
  if (s < 3600) return `${Math.floor(s/60)}m ago`
  if (s < 86400) return `${Math.floor(s/3600)}h ago`
  return `${Math.floor(s/86400)}d ago`
}

export default function Reports() {
  const navigate = useNavigate()
  const [reports, setReports] = useState([])
  const [filtered, setFiltered] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [kvConfigured, setKvConfigured] = useState(true)

  useEffect(() => {
    axios.get('/api/reports')
      .then(({ data }) => {
        setReports(data.reports || [])
        setFiltered(data.reports || [])
        setKvConfigured(data.kvConfigured !== false)
      })
      .catch(() => setKvConfigured(false))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    const q = search.toLowerCase()
    setFiltered(reports.filter(r => r.theme?.toLowerCase().includes(q) || r.thesis?.toLowerCase().includes(q)))
  }, [search, reports])

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 mb-1">Theme Report Library</h1>
          <p className="text-slate-500 text-sm">Saved theme studies — searchable by the whole team</p>
        </div>
        <button onClick={() => navigate('/')}
          className="flex items-center gap-2 px-4 py-2.5 text-white text-sm font-semibold rounded-xl"
          style={{ background: '#0074D9' }}>
          <Plus className="w-4 h-4" /> New Theme
        </button>
      </div>

      {!kvConfigured && (
        <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <div className="font-semibold text-amber-800 text-sm mb-1">Vercel KV not configured</div>
            <div className="text-amber-700 text-sm">To enable shared report saving: go to your Vercel project → Storage → Create KV Database → connect to this project. Then redeploy.</div>
          </div>
        </div>
      )}

      <div className="relative mb-5">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input type="text" value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search themes, theses..."
          className="w-full pl-11 pr-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-gx-blue" />
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16 text-slate-400">
          <Loader2 className="w-6 h-6 animate-spin mr-2" /> Loading reports...
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <FileText className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="font-medium">{search ? 'No reports match your search' : 'No reports saved yet'}</p>
          <p className="text-sm mt-1">Generate a theme, then click "Save Report" from the Results page</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(r => (
            <button key={r.id} onClick={() => navigate(`/reports/${r.id}`)}
              className="w-full text-left bg-white rounded-xl border border-slate-200 p-4 shadow-sm hover:border-gx-blue/40 hover:shadow-md transition-all group">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-bold text-slate-900 text-sm">{r.theme}</span>
                    {r.companiesCount > 0 && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-gx-blue-light text-gx-blue">
                        {r.companiesCount} holdings
                      </span>
                    )}
                  </div>
                  {r.thesis && <p className="text-slate-500 text-xs leading-relaxed line-clamp-2">{r.thesis}</p>}
                  <div className="flex items-center gap-3 mt-2">
                    <span className="text-[10px] text-slate-400">{timeAgo(r.createdAt)}</span>
                    {r.marketSizeBn && (
                      <span className="text-[10px] text-slate-400">TAM ~${r.marketSizeBn}bn</span>
                    )}
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-gx-blue flex-shrink-0 mt-1 transition-colors" />
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
