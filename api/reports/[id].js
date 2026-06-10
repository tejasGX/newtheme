import { kv } from '@vercel/kv';

const KV_AVAILABLE = !!(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN);

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const { id } = req.query;
  if (!id) return res.status(400).json({ error: 'id required' });

  if (!KV_AVAILABLE) return res.status(503).json({ error: 'KV not configured' });

  try {
    const flat = await kv.hgetall(`etflab:report:${id}`);
    if (!flat) return res.status(404).json({ error: 'Report not found' });

    const report = {
      ...flat,
      companiesCount: Number(flat.companiesCount),
      marketSizeBn: flat.marketSizeBn ? Number(flat.marketSizeBn) : null,
      createdAt: Number(flat.createdAt),
      drivers: JSON.parse(flat.drivers || '[]'),
      keyRisks: JSON.parse(flat.keyRisks || '[]'),
      companies: JSON.parse(flat.companies || '[]'),
      params: JSON.parse(flat.params || '{}'),
    };
    return res.status(200).json(report);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
