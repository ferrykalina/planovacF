// api/ping.ts
import type { VercelRequest, VercelResponse } from '@vercel/node';

export default function handler(req: VercelRequest, res: VercelResponse) {
  res.status(200).json({
    ok: true,
    now: new Date().toISOString(),
    msg: "Ping funguje 🚀"
  });
}
