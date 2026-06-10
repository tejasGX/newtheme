import express from 'express';

const router = express.Router();

// Fallback quote data when Yahoo Finance is unavailable
const FALLBACK_DATA = {
  AAPL: { marketCap: 3e12, sector: 'Technology', industry: 'Consumer Electronics' },
  MSFT: { marketCap: 3.2e12, sector: 'Technology', industry: 'Software' },
  NVDA: { marketCap: 2.5e12, sector: 'Technology', industry: 'Semiconductors' },
  GOOGL: { marketCap: 2e12, sector: 'Communication Services', industry: 'Internet Services' },
  AMZN: { marketCap: 1.8e12, sector: 'Consumer Discretionary', industry: 'E-Commerce' },
  META: { marketCap: 1.4e12, sector: 'Communication Services', industry: 'Social Media' },
  TSLA: { marketCap: 800e9, sector: 'Consumer Discretionary', industry: 'Electric Vehicles' },
  SPY: { marketCap: null, sector: 'ETF', industry: 'S&P 500 ETF' },
  QQQ: { marketCap: null, sector: 'ETF', industry: 'Nasdaq 100 ETF' },
  IWM: { marketCap: null, sector: 'ETF', industry: 'Russell 2000 ETF' },
};

router.get('/:ticker', async (req, res) => {
  const { ticker } = req.params;
  if (!ticker) {
    return res.status(400).json({ error: 'Ticker is required' });
  }

  const t = ticker.toUpperCase();
  const fallback = FALLBACK_DATA[t] || {
    marketCap: 10e9,
    sector: 'Unknown',
    industry: 'Unknown',
  };

  // Try Yahoo Finance first, fall back to static data
  try {
    // Attempt a lightweight fetch from Yahoo Finance chart API
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(t)}?interval=1d&range=5d`;
    const resp = await fetch(url, {
      signal: controller.signal,
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible)' },
    });
    clearTimeout(timeout);

    if (resp.ok) {
      const json = await resp.json();
      const meta = json?.chart?.result?.[0]?.meta;
      if (meta) {
        return res.json({
          summaryDetail: { marketCap: meta.marketCap || fallback.marketCap },
          assetProfile: { sector: fallback.sector, industry: fallback.industry },
          regularMarketPrice: meta.regularMarketPrice,
          symbol: t,
        });
      }
    }
  } catch (_) {
    // Network blocked or timed out — use fallback
  }

  return res.json({
    summaryDetail: { marketCap: fallback.marketCap },
    assetProfile: { sector: fallback.sector, industry: fallback.industry },
    symbol: t,
    note: 'Using cached/fallback data',
  });
});

export default router;
