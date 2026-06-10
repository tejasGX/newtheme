import { create } from 'zustand'

const useStore = create((set) => ({
  theme: '',
  companies: [],
  selectedCompanies: [],
  weighting: 'equal',
  maxCap: 0.15,
  startDate: '2021-01-01',
  endDate: '2024-12-31',
  benchmark: 'SPY',
  rebalanceFreq: 'monthly',
  results: null,
  setTheme: (theme) => set({ theme }),
  setCompanies: (companies) => set({ companies }),
  setSelectedCompanies: (selectedCompanies) => set({ selectedCompanies }),
  setWeighting: (weighting) => set({ weighting }),
  setMaxCap: (maxCap) => set({ maxCap }),
  setStartDate: (startDate) => set({ startDate }),
  setEndDate: (endDate) => set({ endDate }),
  setBenchmark: (benchmark) => set({ benchmark }),
  setRebalanceFreq: (rebalanceFreq) => set({ rebalanceFreq }),
  setResults: (results) => set({ results }),
}))

export default useStore
