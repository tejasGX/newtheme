function stddev(arr) {
  if (arr.length < 2) return 0;
  const mean = arr.reduce((a, b) => a + b, 0) / arr.length;
  const variance = arr.reduce((s, v) => s + (v - mean) ** 2, 0) / (arr.length - 1);
  return Math.sqrt(variance);
}

function makePrng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6D2B79F5) >>> 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function strToSeed(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 0x9e3779b9);
    h ^= h >>> 16;
  }
  return (h >>> 0) || 1;
}

function normalRand(rng, mean = 0, sd = 1) {
  const u1 = Math.max(rng(), 1e-10);
  const u2 = rng();
  return mean + sd * Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
}

function genBusinessDays(start, end) {
  const dates = [];
  const d = new Date(start);
  const e = new Date(end);
  while (d <= e) {
    const dow = d.getDay();
    if (dow !== 0 && dow !== 6) dates.push(d.toISOString().split('T')[0]);
    d.setDate(d.getDate() + 1);
  }
  return dates;
}

const SECTOR_PROFILES = {
  'information technology': { drift: 0.18, vol: 0.35, beta: 1.3 },
  'technology': { drift: 0.18, vol: 0.35, beta: 1.3 },
  'health care': { drift: 0.10, vol: 0.28, beta: 0.9 },
  'healthcare': { drift: 0.10, vol: 0.28, beta: 0.9 },
  'energy': { drift: 0.08, vol: 0.38, beta: 1.1 },
  'utilities': { drift: 0.06, vol: 0.18, beta: 0.6 },
  'industrials': { drift: 0.10, vol: 0.25, beta: 1.0 },
  'materials': { drift: 0.09, vol: 0.28, beta: 1.1 },
  'financials': { drift: 0.11, vol: 0.26, beta: 1.1 },
  'consumer discretionary': { drift: 0.12, vol: 0.32, beta: 1.2 },
  'communication services': { drift: 0.14, vol: 0.30, beta: 1.1 },
  'real estate': { drift: 0.07, vol: 0.22, beta: 0.8 },
  'consumer staples': { drift: 0.07, vol: 0.16, beta: 0.6 },
};

const BENCHMARK_PROFILES = {
  SPY: { drift: 0.13, vol: 0.18 },
  QQQ: { drift: 0.18, vol: 0.22 },
  IWM: { drift: 0.08, vol: 0.22 },
};

function getTickerProfile(company) {
  const base = SECTOR_PROFILES[(company.sector || '').toLowerCase()] || { drift: 0.10, vol: 0.30, beta: 1.0 };
  const isCore = company.exposure === 'core';
  return {
    drift: base.drift + (isCore ? 0.04 : 0),
    vol: base.vol + (isCore ? 0.05 : 0),
    beta: base.beta,
  };
}

function genPrices(ticker, dates, drift, vol, beta, mktReturns) {
  const rng = makePrng(strToSeed(ticker));
  const dd = drift / 252;
  const dv = vol / Math.sqrt(252);
  const idioVol = dv * Math.sqrt(Math.max(0, 1 - beta * beta * 0.25));
  const prices = [100];
  for (let i = 1; i < dates.length; i++) {
    const mkt = mktReturns ? mktReturns[i] : 0;
    const r = beta * mkt + normalRand(rng, dd, idioVol);
    prices.push(prices[prices.length - 1] * (1 + r));
  }
  return prices;
}

function genBenchmarkPrices(ticker, dates) {
  const p = BENCHMARK_PROFILES[ticker] || { drift: 0.10, vol: 0.18 };
  const rng = makePrng(strToSeed(ticker + '_bench'));
  const dd = p.drift / 252;
  const dv = p.vol / Math.sqrt(252);
  const prices = [100];
  const returns = [0];
  for (let i = 1; i < dates.length; i++) {
    const r = normalRand(rng, dd, dv);
    prices.push(prices[prices.length - 1] * (1 + r));
    returns.push(r);
  }
  return { prices, returns };
}

function calcWeights(companies, weighting, maxCap) {
  const tickers = companies.map(c => c.ticker.toUpperCase());
  let weights = {};
  if (weighting === 'equal') {
    const w = 1 / tickers.length;
    tickers.forEach(t => { weights[t] = w; });
  } else {
    const caps = Object.fromEntries(companies.map(c => [c.ticker.toUpperCase(), c.marketCapBn || 10]));
    const total = Object.values(caps).reduce((a, b) => a + b, 0);
    tickers.forEach(t => { weights[t] = caps[t] / total; });
    if (weighting === 'maxcap') {
      let iter = 0;
      while (iter++ < 50) {
        const capped = tickers.filter(t => weights[t] > maxCap);
        if (!capped.length) break;
        const uncapped = tickers.filter(t => weights[t] <= maxCap);
        let excess = 0;
        capped.forEach(t => { excess += weights[t] - maxCap; weights[t] = maxCap; });
        const uSum = uncapped.reduce((s, t) => s + weights[t], 0);
        if (!uSum) break;
        uncapped.forEach(t => { weights[t] += excess * (weights[t] / uSum); });
        if (!uncapped.some(t => weights[t] > maxCap + 1e-9)) break;
      }
      const total = Object.values(weights).reduce((a, b) => a + b, 0);
      tickers.forEach(t => { weights[t] /= total; });
    }
  }
  return weights;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { companies, weighting = 'equal', maxCap = 0.15, startDate, endDate, benchmark = 'SPY' } = req.body || {};
  if (!companies?.length || !startDate || !endDate) {
    return res.status(400).json({ error: 'companies, startDate, endDate are required' });
  }

  const dates = genBusinessDays(startDate, endDate);
  if (dates.length < 10) return res.status(400).json({ error: 'Date range too short' });
  const n = dates.length;

  const hasBench = benchmark && benchmark !== 'None';
  const benchData = hasBench ? genBenchmarkPrices(benchmark, dates) : null;
  const mktReturns = benchData?.returns || new Array(n).fill(0);

  const tickers = companies.map(c => c.ticker.toUpperCase());
  const priceSeries = {};
  for (const c of companies) {
    const t = c.ticker.toUpperCase();
    const { drift, vol, beta } = getTickerProfile(c);
    priceSeries[t] = genPrices(t, dates, drift, vol, beta, mktReturns);
  }

  const weights = calcWeights(companies, weighting, maxCap);

  const portReturns = [0];
  for (let i = 1; i < n; i++) {
    let r = 0;
    for (const t of tickers) {
      const p = priceSeries[t];
      if (p[i] && p[i - 1]) r += (weights[t] || 0) * (p[i] / p[i - 1] - 1);
    }
    portReturns.push(r);
  }

  const portValues = [100];
  for (let i = 1; i < n; i++) portValues.push(portValues[i - 1] * (1 + portReturns[i]));

  const benchValues = benchData ? benchData.prices : new Array(n).fill(100);

  const ddSeries = [];
  let peak = 100;
  for (let i = 0; i < n; i++) {
    if (portValues[i] > peak) peak = portValues[i];
    ddSeries.push(((portValues[i] - peak) / peak) * 100);
  }

  // Thin to ~400 points for chart performance
  const step = Math.max(1, Math.floor(n / 400));
  const timeseries = [];
  const drawdown = [];
  for (let i = 0; i < n; i += step) {
    timeseries.push({ date: dates[i], portfolio: +portValues[i].toFixed(3), benchmark: +benchValues[i].toFixed(3) });
    drawdown.push({ date: dates[i], value: +ddSeries[i].toFixed(3) });
  }
  if (timeseries[timeseries.length - 1]?.date !== dates[n - 1]) {
    timeseries.push({ date: dates[n - 1], portfolio: +portValues[n - 1].toFixed(3), benchmark: +benchValues[n - 1].toFixed(3) });
    drawdown.push({ date: dates[n - 1], value: +ddSeries[n - 1].toFixed(3) });
  }

  const totalReturn = portValues[n - 1] / 100 - 1;
  const years = (n - 1) / 252;
  const cagr = years > 0 ? (1 + totalReturn) ** (1 / years) - 1 : 0;
  const vol = stddev(portReturns.slice(1)) * Math.sqrt(252);
  const sharpe = vol > 0 ? (cagr - 0.05) / vol : 0;
  const maxDrawdown = Math.min(...ddSeries) / 100;
  const calmar = maxDrawdown < 0 ? cagr / Math.abs(maxDrawdown) : 0;

  const benchTR = benchValues[n - 1] / 100 - 1;
  const benchCagr = years > 0 ? (1 + benchTR) ** (1 / years) - 1 : 0;
  const benchVol = benchData ? stddev(benchData.returns.slice(1)) * Math.sqrt(252) : 0;
  const benchSharpe = benchVol > 0 ? (benchCagr - 0.05) / benchVol : 0;

  const attribution = tickers.map(t => {
    const prices = priceSeries[t];
    const stockReturn = prices[0] > 0 ? prices[n - 1] / prices[0] - 1 : 0;
    const w = weights[t] || 0;
    const co = companies.find(c => c.ticker.toUpperCase() === t);
    return { ticker: t, name: co?.name || t, sector: co?.sector || 'Unknown', weight: +w.toFixed(6), stockReturn: +stockReturn.toFixed(6), contribution: +(w * stockReturn).toFixed(6) };
  }).sort((a, b) => b.contribution - a.contribution);

  const sectorMap = {};
  tickers.forEach(t => {
    const co = companies.find(c => c.ticker.toUpperCase() === t);
    const s = co?.sector || 'Unknown';
    sectorMap[s] = (sectorMap[s] || 0) + (weights[t] || 0);
  });
  const sectors = Object.entries(sectorMap).map(([sector, weight]) => ({ sector, weight: +weight.toFixed(6) })).sort((a, b) => b.weight - a.weight);

  return res.status(200).json({
    timeseries, drawdown, sectors, attribution,
    weights: Object.fromEntries(Object.entries(weights).map(([k, v]) => [k, +v.toFixed(6)])),
    metrics: {
      cagr: +cagr.toFixed(6), sharpe: +sharpe.toFixed(4), maxDrawdown: +maxDrawdown.toFixed(6),
      vol: +vol.toFixed(6), calmar: +calmar.toFixed(4), totalReturn: +totalReturn.toFixed(6),
      benchmarkCagr: +benchCagr.toFixed(6), benchmarkSharpe: +benchSharpe.toFixed(4),
      benchmarkVol: +benchVol.toFixed(6), benchmarkTotalReturn: +benchTR.toFixed(6),
      numHoldings: tickers.length, startDate: dates[0], endDate: dates[n - 1],
    },
  });
}
