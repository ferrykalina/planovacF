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

async function safeGetDoc(key: string, id: string): Promise<Doc> {
  try { await head(key); } catch { return DEFAULT_DOC(id); }
  const blob = await get(key);
  const text = await blob.text();
  try { return JSON.parse(text) as Doc; } catch { return DEFAULT_DOC(id); }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const id = String(req.query.id || 'public-demo');
    const key = `planovac/${encodeURIComponent(id)}.json`;

    if (req.method === 'GET') {
      const current = await safeGetDoc(key, id);
      return res.status(200).json(current);
    }

    if (req.method === 'POST') {
      const incoming = (typeof req.body === 'string' ? JSON.parse(req.body) : req.body) as Partial<Doc>;
      // Načti současný stav
      const current = await safeGetDoc(key, id);

      // Merge countries (sjednocení, zachovej pořadí: current + nové které tam ještě nejsou)
      let countries = current.countries || DEFAULT_DOC(id).countries;
      if (Array.isArray(incoming.countries)) {
        const next: string[] = [...countries];
        for (const c of incoming.countries) if (!next.includes(c)) next.push(c);
        countries = next;
      }

      // Merge bubbles podle id (příchozí přepisují stejné id; ostatní zůstanou)
      let bubbles = current.bubbles || [];
      if (Array.isArray(incoming.bubbles)) {
        const map = new Map<string, BubbleT>();
        for (const b of bubbles) map.set(b.id, b);
        for (const b of incoming.bubbles as BubbleT[]) map.set(b.id, b);
        bubbles = Array.from(map.values());
      }

      const toSave: Doc = {
        id,
        countries,
        bubbles,
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
