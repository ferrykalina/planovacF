// api/planovac/[id].ts
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { put, head, get } from '@vercel/blob';

type DayLabel = '' | 'Po' | 'Út' | 'St' | 'Čt' | 'Pá' | 'So' | 'Ne';
type BubbleT = { id: string; label: string; type: 'spz'; column: string; day: DayLabel; note?: string; };
type Doc = { id: string; countries: string[]; bubbles: BubbleT[]; updated_at?: string; };

const DEFAULT_DOC = (id: string): Doc => ({
  id,
  countries: ['CZ', 'DE', 'FR', 'IT', 'ES', 'NL', 'BE'],
  bubbles: [],
  updated_at: new Date().toISOString(),
});

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const id = String(req.query.id || 'public-demo');
    const key = `planovac/${encodeURIComponent(id)}.json`;

    if (req.method === 'GET') {
      try { await head(key); } catch { return res.status(200).json(DEFAULT_DOC(id)); }
      const blob = await get(key);
      const text = await blob.text();
      let json: Doc;
      try { json = JSON.parse(text); } catch { json = DEFAULT_DOC(id); }
      return res.status(200).json(json);
    }

    if (req.method === 'POST') {
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
      const doc = (body || {}) as Partial<Doc>;
      const toSave: Doc = {
        id,
        countries: Array.isArray(doc.countries) ? doc.countries : DEFAULT_DOC(id).countries,
        bubbles: Array.isArray(doc.bubbles) ? (doc.bubbles as BubbleT[]) : [],
        updated_at: new Date().toISOString(),
      };
      await put(key, JSON.stringify(toSave), { contentType: 'application/json' });
      return res.status(200).json({ ok: true });
    }

    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ error: 'Method Not Allowed' });
  } catch (e: any) {
    console.error(e);
    return res.status(500).json({ error: e?.message || 'Server error' });
  }
}
