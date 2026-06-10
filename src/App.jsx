import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Layout from './components/Layout.jsx'
import Discovery from './pages/Discovery.jsx'
import Basket from './pages/Basket.jsx'
import Backtest from './pages/Backtest.jsx'
import Results from './pages/Results.jsx'
import Reports from './pages/Reports.jsx'
import ReportView from './pages/ReportView.jsx'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Discovery />} />
          <Route path="/basket" element={<Basket />} />
          <Route path="/backtest" element={<Backtest />} />
          <Route path="/results" element={<Results />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/reports/:id" element={<ReportView />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
