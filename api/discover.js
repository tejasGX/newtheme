import OpenAI from 'openai';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { theme, params = {} } = req.body || {};
  if (!theme?.trim()) return res.status(400).json({ error: 'theme is required' });

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'OPENAI_API_KEY not configured' });

  const {
    maxHoldings = 12,
    geography = 'all',
    weightingApproach = 'equal',
    rebalancingFreq = 'quarterly',
  } = params;

  const geoInstruction = {
    'all': 'Include companies from any exchange globally.',
    'us-only': 'Include ONLY US-listed companies (NYSE, NASDAQ, NYSE American, NYSE Arca). No ADRs.',
    'exclude-china': 'Exclude any company primarily listed on Chinese exchanges (Shanghai, Shenzhen, HKEX). US-listed ADRs of Chinese companies are also excluded.',
    'developed-only': 'Include only companies listed on developed-market exchanges: US, Canada, UK, Europe, Japan, South Korea, Australia. No emerging markets.',
  }[geography] || 'Include companies from any exchange globally.';

  const openai = new OpenAI({ apiKey });

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      temperature: 0.2,
      max_tokens: 4000,
      messages: [
        {
          role: 'system',
          content: `You are a senior equity analyst at a thematic ETF asset manager.

Given an investment theme, identify exactly ${maxHoldings} publicly traded companies with meaningful exposure.

${geoInstruction}

Return ONLY a valid JSON array — no markdown, no code fences. Each element:
{
  "ticker": "NVDA",
  "name": "NVIDIA Corporation",
  "exchange": "NASDAQ",
  "sector": "Information Technology",
  "industry": "Semiconductors",
  "exposure": "core",
  "exposureScore": 9,
  "rationale": "2-3 sentence explanation of the company's direct thematic exposure and revenue contribution",
  "marketCapBn": 2500,
  "revenueFromThemePct": 80
}

exposureScore (1–10):
- 10: Pure-play — essentially all revenue is from the theme
- 8–9: Core — majority of revenue or strategic focus on the theme
- 6–7: Significant — meaningful revenue exposure but diversified
- 4–5: Secondary — indirect or partial exposure
- 1–3: Peripheral — loosely related

exposure field: "core" if exposureScore ≥ 6, else "secondary"
revenueFromThemePct: estimated % of revenue from the theme (your best estimate)

Prioritize: high exposureScore names first. Mix large-cap anchors with mid/small-cap pure-plays.
Verify all tickers are correct for the primary listing.`
        },
        {
          role: 'user',
          content: `Investment theme: "${theme.trim()}"\n\nFind exactly ${maxHoldings} companies. Geography rule: ${geoInstruction}`
        }
      ],
    });

    const raw = completion.choices[0].message.content.trim();
    const cleaned = raw.replace(/^```json\s*/m, '').replace(/^```\s*/m, '').replace(/```\s*$/m, '').trim();

    let companies = JSON.parse(cleaned);
    if (!Array.isArray(companies)) {
      const arr = Object.values(companies).find(v => Array.isArray(v));
      companies = arr || [];
    }

    // Ensure exposureScore exists
    companies = companies.map(c => ({
      ...c,
      exposureScore: c.exposureScore ?? (c.exposure === 'core' ? 7 : 5),
      revenueFromThemePct: c.revenueFromThemePct ?? null,
    }));

    return res.status(200).json({ companies, theme: theme.trim() });
  } catch (err) {
    console.error('discover error:', err);
    return res.status(500).json({ error: err.message || 'AI discovery failed' });
  }
}
