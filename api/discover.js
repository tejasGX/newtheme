import OpenAI from 'openai';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { theme } = req.body || {};
  if (!theme || typeof theme !== 'string' || !theme.trim()) {
    return res.status(400).json({ error: 'theme is required' });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'OPENAI_API_KEY is not configured on the server.' });
  }

  const openai = new OpenAI({ apiKey });

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      temperature: 0.2,
      max_tokens: 3000,
      messages: [
        {
          role: 'system',
          content: `You are a senior equity analyst specializing in thematic ETF construction at a major asset manager.

Given an investment theme, identify 10–15 publicly traded companies with meaningful exposure to that theme.

Return ONLY a valid JSON array — no markdown, no code fences, no extra text. Each element:
{
  "ticker": "NVDA",
  "name": "NVIDIA Corporation",
  "exchange": "NASDAQ",
  "sector": "Information Technology",
  "industry": "Semiconductors",
  "exposure": "core",
  "rationale": "1-2 sentence explanation of direct revenue exposure to the theme",
  "marketCapBn": 2500
}

Strict rules:
- Only US-listed equities (NYSE, NASDAQ, NYSE American, NYSE Arca)
- "exposure": "core" means the theme is central to their business model; "secondary" means meaningful but not primary
- marketCapBn: realistic approximate market cap in billions USD
- Mix large-cap leaders with mid/small-cap pure-plays — don't just pick mega caps
- Prioritize companies with direct, quantifiable revenue from the theme
- Verify tickers are correct for the primary US listing`
        },
        {
          role: 'user',
          content: `Investment theme: "${theme.trim()}"\n\nFind 10–15 publicly traded US companies with meaningful exposure to this theme.`
        }
      ],
    });

    const raw = completion.choices[0].message.content.trim();
    // Strip any accidental markdown fences
    const cleaned = raw.replace(/^```json\s*/m, '').replace(/^```\s*/m, '').replace(/```\s*$/m, '').trim();

    let companies;
    const parsed = JSON.parse(cleaned);
    if (Array.isArray(parsed)) {
      companies = parsed;
    } else if (parsed.companies && Array.isArray(parsed.companies)) {
      companies = parsed.companies;
    } else {
      const arr = Object.values(parsed).find(v => Array.isArray(v));
      companies = arr || [];
    }

    if (!companies.length) {
      return res.status(500).json({ error: 'AI returned no companies. Try a more specific theme.' });
    }

    return res.status(200).json({ companies, theme: theme.trim() });
  } catch (err) {
    console.error('discover error:', err);
    return res.status(500).json({ error: err.message || 'AI discovery failed' });
  }
}
