import { create } from 'zustand'

const useStore = create((set) => ({
  // Discovery
  theme: '',
  companies: [],
  selectedCompanies: [],
  discoveryParams: {
    maxHoldings: 12,
    geography: 'all',        // 'all' | 'us-only' | 'exclude-china' | 'developed-only'
    weightingApproach: 'equal',
    rebalancingFreq: 'quarterly',
  },

  // Basket
  weighting: 'equal',
  maxCap: 0.15,

  // Backtest
  startDate: '2021-01-01',
  endDate: '2024-12-31',
  benchmark: 'SPY',
  rebalanceFreq: 'monthly',
  results: null,

  // Report
  currentReport: null,

  // Setters
  setTheme: (theme) => set({ theme }),
  setCompanies: (companies) => set({ companies }),
  setSelectedCompanies: (selectedCompanies) => set({ selectedCompanies }),
  setDiscoveryParams: (p) => set((s) => ({ discoveryParams: { ...s.discoveryParams, ...p } })),
  setWeighting: (weighting) => set({ weighting }),
  setMaxCap: (maxCap) => set({ maxCap }),
  setStartDate: (startDate) => set({ startDate }),
  setEndDate: (endDate) => set({ endDate }),
  setBenchmark: (benchmark) => set({ benchmark }),
  setRebalanceFreq: (rebalanceFreq) => set({ rebalanceFreq }),
  setResults: (results) => set({ results }),
  setCurrentReport: (currentReport) => set({ currentReport }),
}))

export default useStore
