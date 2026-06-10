import { kv } from '@vercel/kv';
import { v4 as uuidv4 } from 'uuid';

const KV_AVAILABLE = !!(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN);

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (!KV_AVAILABLE) {
    if (req.method === 'GET') return res.status(200).json({ reports: [], kvConfigured: false });
    return res.status(503).json({ error: 'Report storage not configured. Add Vercel KV to your project.' });
  }

  if (req.method === 'GET') {
    try {
      const ids = await kv.zrange('etflab:reports', 0, -1, { rev: true, limit: { offset: 0, count: 50 } });
      if (!ids || ids.length === 0) return res.status(200).json({ reports: [], kvConfigured: true });

      const reports = await Promise.all(
        ids.map(id => kv.hgetall(`etflab:report:${id}`))
      );
      const valid = reports.filter(Boolean).map(r => ({
        id: r.id,
        theme: r.theme,
        createdAt: r.createdAt,
        companiesCount: Number(r.companiesCount || 0),
        thesis: r.thesis,
        marketSizeBn: r.marketSizeBn ? Number(r.marketSizeBn) : null,
      }));
      return res.status(200).json({ reports: valid, kvConfigured: true });
    } catch (err) {
      console.error('reports GET error:', err);
      return res.status(500).json({ error: err.message });
    }
  }

  if (req.method === 'POST') {
    const report = req.body;
    if (!report?.theme) return res.status(400).json({ error: 'report.theme required' });

    try {
      const id = uuidv4();
      const flat = {
        id,
        theme: report.theme,
        createdAt: Date.now().toString(),
        companiesCount: (report.companies?.length || 0).toString(),
        thesis: report.thesis || '',
        marketSizeBn: report.marketSizeBn?.toString() || '',
        marketSizeCagr: report.marketSizeCagr || '',
        whyNow: report.whyNow || '',
        supplyDynamics: report.supplyDynamics || '',
        competitorProducts: report.competitorProducts || '',
        constructionNote: report.constructionNote || '',
        drivers: JSON.stringify(report.drivers || []),
        keyRisks: JSON.stringify(report.keyRisks || []),
        companies: JSON.stringify(report.companies || []),
        params: JSON.stringify(report.params || {}),
      };

      await kv.hset(`etflab:report:${id}`, flat);
      await kv.zadd('etflab:reports', { score: Date.now(), member: id });

      return res.status(201).json({ id, success: true });
    } catch (err) {
      console.error('reports POST error:', err);
      return res.status(500).json({ error: err.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
