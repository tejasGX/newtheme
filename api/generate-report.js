import OpenAI from 'openai';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { theme, companies, params } = req.body || {};
  if (!theme || !companies?.length) return res.status(400).json({ error: 'theme and companies required' });

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'OPENAI_API_KEY not configured' });

  const openai = new OpenAI({ apiKey });

  const companyList = companies.slice(0, 15).map(c =>
    `- ${c.ticker} (${c.name}) | ${c.sector} | Exposure Score: ${c.exposureScore}/10 | ${c.rationale}`
  ).join('\n');

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      temperature: 0.3,
      max_tokens: 3000,
      messages: [
        {
          role: 'system',
          content: `You are a senior thematic ETF product analyst. Write a concise internal product study for an investment theme. Be analytical, not promotional. Use precise language. Output ONLY valid JSON.`
        },
        {
          role: 'user',
          content: `Write a product study for this ETF theme: "${theme}"

Companies identified:
${companyList}

Return ONLY this JSON structure (no markdown):
{
  "thesis": "2-3 sentence investment thesis. What is the theme, why does it create investable equity opportunity, and what is the key insight?",
  "marketSizeBn": <estimated global addressable market in billions USD, integer>,
  "marketSizeCagr": "<estimated CAGR % range, e.g. '15-20%'>",
  "drivers": [
    { "title": "Short title", "description": "2-3 sentence explanation of this demand driver and its investable impact." },
    { "title": "...", "description": "..." },
    { "title": "...", "description": "..." },
    { "title": "...", "description": "..." }
  ],
  "whyNow": "2-3 sentences on why this is the right timing to launch this ETF now — catalysts, recent developments, competitive window.",
  "supplyDynamics": "1-2 sentences on supply concentration, barriers to entry, or oligopoly characteristics if relevant.",
  "keyRisks": [
    { "title": "Risk name", "description": "1-2 sentences on the specific risk and mitigation." },
    { "title": "...", "description": "..." },
    { "title": "...", "description": "..." }
  ],
  "competitorProducts": "1-2 sentences on existing ETFs that overlap with this theme, if any. If no direct competitor exists, state that explicitly — this is a key selling point.",
  "constructionNote": "1-2 sentences on any notable considerations for index/basket construction (concentration, liquidity, foreign listings, etc.)."
}`
        }
      ],
    });

    const raw = completion.choices[0].message.content.trim();
    const cleaned = raw.replace(/^```json\s*/m, '').replace(/^```\s*/m, '').replace(/```\s*$/m, '').trim();
    const reportContent = JSON.parse(cleaned);

    return res.status(200).json({
      ...reportContent,
      theme,
      companies,
      params: params || {},
      generatedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error('generate-report error:', err);
    return res.status(500).json({ error: err.message || 'Report generation failed' });
  }
}
