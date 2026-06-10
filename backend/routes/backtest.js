import express from 'express';

const router = express.Router();

// Compute std dev of array
function stddev(arr) {
  if (arr.length < 2) return 0;
  const mean = arr.reduce((a, b) => a + b, 0) / arr.length;
  const variance = arr.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / (arr.length - 1);
  return Math.sqrt(variance);
}

// Seeded pseudo-random number generator (mulberry32)
function makePrng(seed) {
  let s = seed;
  return function () {
    s |= 0; s = s + 0x6D2B79F5 | 0;
    let t = Math.imul(s ^ s >>> 15, 1 | s);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

// Hash a string to a seed integer
function strToSeed(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 0x9e3779b9);
    h ^= h >>> 16;
  }
  return (h >>> 0) || 1;
}

// Box-Muller normal distribution using seeded RNG
function normalRand(rng, mean = 0, sd = 1) {
  const u1 = rng();
  const u2 = rng();
  const z = Math.sqrt(-2 * Math.log(Math.max(u1, 1e-10))) * Math.cos(2 * Math.PI * u2);
  return mean + z * sd;
}

// Generate synthetic daily returns for a ticker over a date array
// Uses known sector characteristics + ticker-specific noise
function genSyntheticPrices(ticker, dates, options = {}) {
  const {
    annualDrift = 0.10,    // annual expected return
    annualVol = 0.30,      // annual volatility
    beta = 1.0,            // market beta
    marketReturns = null,  // array of market daily returns (same length as dates)
  } = options;

  const seed = strToSeed(ticker);
  const rng = makePrng(seed);

  const dailyDrift = annualDrift / 252;
  const dailyVol = annualVol / Math.sqrt(252);
  const dailyIdioVol = dailyVol * Math.sqrt(1 - Math.min(beta * beta * 0.25, 0.95)); // idiosyncratic portion

  const prices = [100];
  for (let i = 1; i < dates.length; i++) {
    const mktRet = marketReturns ? marketReturns[i] : 0;
    const idioRet = normalRand(rng, dailyDrift, dailyIdioVol);
    const dailyRet = beta * mktRet + idioRet;
    prices.push(prices[prices.length - 1] * (1 + dailyRet));
  }
  return prices;
}

// Generate market (benchmark) returns — seeded by benchmark ticker
function genMarketPrices(ticker, dates, presetCagr = null) {
  const seed = strToSeed(ticker + '_market_2024');
  const rng = makePrng(seed);

  // Known approximate annual returns for benchmarks
  const benchmarkProfiles = {
    SPY: { annualDrift: 0.13, annualVol: 0.18 },
    QQQ: { annualDrift: 0.18, annualVol: 0.22 },
    IWM: { annualDrift: 0.08, annualVol: 0.22 },
  };
  const profile = benchmarkProfiles[ticker] || { annualDrift: presetCagr || 0.10, annualVol: 0.18 };

  const dailyDrift = profile.annualDrift / 252;
  const dailyVol = profile.annualVol / Math.sqrt(252);

  const prices = [100];
  const returns = [0];
  for (let i = 1; i < dates.length; i++) {
    const r = normalRand(rng, dailyDrift, dailyVol);
    prices.push(prices[prices.length - 1] * (1 + r));
    returns.push(r);
  }
  return { prices, returns };
}

// Generate business days between two dates
function genBusinessDays(startDate, endDate) {
  const dates = [];
  const d = new Date(startDate);
  const end = new Date(endDate);
  while (d <= end) {
    const dow = d.getDay();
    if (dow !== 0 && dow !== 6) {
      dates.push(d.toISOString().split('T')[0]);
    }
    d.setDate(d.getDate() + 1);
  }
  return dates;
}

// Apply ticker characteristic modifiers based on sector/exposure/ticker
function getTickerProfile(company) {
  const sector = (company.sector || '').toLowerCase();
  const ticker = company.ticker.toUpperCase();
  const exposure = company.exposure || 'secondary';

  // Base sector profiles
  const sectorProfiles = {
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
    'defense': { drift: 0.14, vol: 0.25, beta: 0.85 },
  };

  let profile = sectorProfiles[sector] || { drift: 0.10, vol: 0.30, beta: 1.0 };

  // Core exposure gets a boost
  if (exposure === 'core') {
    profile = { ...profile, drift: profile.drift + 0.04, vol: profile.vol + 0.05 };
  }

  // Small cap modifier (rough heuristic from ticker hash)
  const seed = strToSeed(ticker);
  const isSmallCap = seed % 3 === 0;
  if (isSmallCap && !company.marketCapBn) {
    profile = { ...profile, vol: profile.vol + 0.08, drift: profile.drift - 0.02 };
  }

  return profile;
}

// Calculate market-cap weights
function calcMarketCapWeights(companies) {
  const caps = companies.map(c => ({ ticker: c.ticker, cap: c.marketCapBn || 10 }));
  const total = caps.reduce((s, c) => s + c.cap, 0);
  return Object.fromEntries(caps.map(c => [c.ticker, c.cap / total]));
}

// Apply max-cap capping iteratively
function calcMaxCapWeights(baseWeights, maxCap) {
  let weights = { ...baseWeights };
  let iterations = 0;
  const MAX_ITER = 50;

  while (iterations < MAX_ITER) {
    const cappedTickers = Object.keys(weights).filter(t => weights[t] >= maxCap);
    const uncappedTickers = Object.keys(weights).filter(t => weights[t] < maxCap);

    if (cappedTickers.length === 0) break;

    let excessSum = 0;
    for (const t of cappedTickers) {
      excessSum += weights[t] - maxCap;
      weights[t] = maxCap;
    }

    const uncappedSum = uncappedTickers.reduce((s, t) => s + weights[t], 0);
    if (uncappedSum <= 0 || uncappedTickers.length === 0) break;

    for (const t of uncappedTickers) {
      weights[t] += excessSum * (weights[t] / uncappedSum);
    }

    iterations++;
    if (!uncappedTickers.some(t => weights[t] > maxCap + 1e-9)) break;
  }

  // Renormalize
  const total = Object.values(weights).reduce((a, b) => a + b, 0);
  for (const t of Object.keys(weights)) weights[t] /= total;

  return weights;
}

router.post('/', async (req, res) => {
  const {
    companies,
    weighting = 'equal',
    maxCap = 0.15,
    startDate,
    endDate,
    benchmark = 'SPY',
    rebalanceFreq = 'monthly',
  } = req.body;

  if (!companies || !Array.isArray(companies) || companies.length === 0) {
    return res.status(400).json({ error: 'companies array is required' });
  }
  if (!startDate || !endDate) {
    return res.status(400).json({ error: 'startDate and endDate are required' });
  }

  // Generate business day calendar
  const dates = genBusinessDays(startDate, endDate);
  if (dates.length < 10) {
    return res.status(400).json({ error: 'Date range too short; need at least 2 weeks of trading days.' });
  }

  const n = dates.length;
  const tickers = companies.map(c => c.ticker.toUpperCase());

  // Generate market returns first (used for correlation)
  const hasBenchmark = benchmark && benchmark !== 'None';
  const benchData = hasBenchmark ? genMarketPrices(benchmark, dates) : null;
  const marketDailyReturns = benchData ? benchData.returns : new Array(n).fill(0);

  // Generate synthetic prices for each ticker
  const priceSeries = {};
  for (const company of companies) {
    const t = company.ticker.toUpperCase();
    const profile = getTickerProfile(company);
    priceSeries[t] = genSyntheticPrices(t, dates, {
      annualDrift: profile.drift,
      annualVol: profile.vol,
      beta: profile.beta,
      marketReturns: marketDailyReturns,
    });
  }

  // Calculate weights
  let weights = {};
  if (weighting === 'equal') {
    const w = 1 / tickers.length;
    tickers.forEach(t => { weights[t] = w; });
  } else if (weighting === 'marketcap') {
    weights = calcMarketCapWeights(companies);
  } else if (weighting === 'maxcap') {
    const mcWeights = calcMarketCapWeights(companies);
    weights = calcMaxCapWeights(mcWeights, maxCap);
  }

  // Daily portfolio returns
  const portReturns = new Array(n).fill(0);
  for (let i = 1; i < n; i++) {
    let portRet = 0;
    for (const t of tickers) {
      const prices = priceSeries[t];
      if (prices && prices[i] != null && prices[i - 1] != null && prices[i - 1] !== 0) {
        portRet += (weights[t] || 0) * ((prices[i] / prices[i - 1]) - 1);
      }
    }
    portReturns[i] = portRet;
  }

  // Cumulative value indexed to 100
  const portValues = [100];
  for (let i = 1; i < n; i++) {
    portValues.push(portValues[i - 1] * (1 + portReturns[i]));
  }

  // Benchmark values
  const benchValues = benchData ? benchData.prices : new Array(n).fill(100);

  // Drawdown
  const drawdownSeries = [];
  let peak = portValues[0];
  for (let i = 0; i < n; i++) {
    if (portValues[i] > peak) peak = portValues[i];
    drawdownSeries.push(((portValues[i] - peak) / peak) * 100);
  }

  // Timeseries output (thin to ~500 points for performance)
  const step = Math.max(1, Math.floor(n / 500));
  const timeseriesOut = [];
  const drawdownOut = [];
  for (let i = 0; i < n; i += step) {
    timeseriesOut.push({
      date: dates[i],
      portfolio: parseFloat(portValues[i].toFixed(3)),
      benchmark: parseFloat(benchValues[i].toFixed(3)),
    });
    drawdownOut.push({
      date: dates[i],
      value: parseFloat(drawdownSeries[i].toFixed(3)),
    });
  }
  // Ensure last point included
  const lastIdx = n - 1;
  if (timeseriesOut[timeseriesOut.length - 1]?.date !== dates[lastIdx]) {
    timeseriesOut.push({
      date: dates[lastIdx],
      portfolio: parseFloat(portValues[lastIdx].toFixed(3)),
      benchmark: parseFloat(benchValues[lastIdx].toFixed(3)),
    });
    drawdownOut.push({
      date: dates[lastIdx],
      value: parseFloat(drawdownSeries[lastIdx].toFixed(3)),
    });
  }

  // Metrics
  const totalReturn = (portValues[n - 1] / 100) - 1;
  const years = (n - 1) / 252;
  const cagr = years > 0 ? Math.pow(1 + totalReturn, 1 / years) - 1 : 0;
  const dailyRets = portReturns.slice(1);
  const vol = stddev(dailyRets) * Math.sqrt(252);
  const riskFreeRate = 0.05;
  const sharpe = vol > 0 ? (cagr - riskFreeRate) / vol : 0;
  const maxDrawdown = Math.min(...drawdownSeries) / 100;
  const calmar = maxDrawdown < 0 ? cagr / Math.abs(maxDrawdown) : 0;

  const benchTotalReturn = (benchValues[n - 1] / 100) - 1;
  const benchCagr = years > 0 ? Math.pow(1 + benchTotalReturn, 1 / years) - 1 : 0;
  const benchDailyRets = benchData ? benchData.returns.slice(1) : [];
  const benchVol = benchDailyRets.length ? stddev(benchDailyRets) * Math.sqrt(252) : 0;
  const benchSharpe = benchVol > 0 ? (benchCagr - riskFreeRate) / benchVol : 0;

  const metrics = {
    cagr: parseFloat(cagr.toFixed(6)),
    sharpe: parseFloat(sharpe.toFixed(4)),
    maxDrawdown: parseFloat(maxDrawdown.toFixed(6)),
    vol: parseFloat(vol.toFixed(6)),
    calmar: parseFloat(calmar.toFixed(4)),
    totalReturn: parseFloat(totalReturn.toFixed(6)),
    benchmarkCagr: parseFloat(benchCagr.toFixed(6)),
    benchmarkSharpe: parseFloat(benchSharpe.toFixed(4)),
    benchmarkVol: parseFloat(benchVol.toFixed(6)),
    benchmarkTotalReturn: parseFloat(benchTotalReturn.toFixed(6)),
    numHoldings: tickers.length,
    startDate: dates[0],
    endDate: dates[n - 1],
  };

  // Attribution
  const attribution = tickers.map(t => {
    const prices = priceSeries[t];
    const startPrice = prices[0];
    const endPrice = prices[n - 1];
    const stockReturn = startPrice > 0 ? (endPrice / startPrice) - 1 : 0;
    const weight = weights[t] || 0;
    const contribution = weight * stockReturn;
    const company = companies.find(c => c.ticker.toUpperCase() === t);
    return {
      ticker: t,
      name: company?.name || t,
      sector: company?.sector || 'Unknown',
      weight: parseFloat(weight.toFixed(6)),
      stockReturn: parseFloat(stockReturn.toFixed(6)),
      contribution: parseFloat(contribution.toFixed(6)),
    };
  }).sort((a, b) => b.contribution - a.contribution);

  // Sector breakdown
  const sectorMap = {};
  for (const t of tickers) {
    const company = companies.find(c => c.ticker.toUpperCase() === t);
    const sector = company?.sector || 'Unknown';
    sectorMap[sector] = (sectorMap[sector] || 0) + (weights[t] || 0);
  }
  const sectors = Object.entries(sectorMap)
    .map(([sector, weight]) => ({ sector, weight: parseFloat(weight.toFixed(6)) }))
    .sort((a, b) => b.weight - a.weight);

  return res.json({
    timeseries: timeseriesOut,
    drawdown: drawdownOut,
    metrics,
    attribution,
    sectors,
    weights: Object.fromEntries(
      Object.entries(weights).map(([k, v]) => [k, parseFloat(v.toFixed(6))])
    ),
  });
});

export default router;
