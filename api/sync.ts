import type { VercelRequest, VercelResponse } from '@vercel/node';
import { put, head } from '@vercel/blob';

const STATE_PATH = 'dr-abdelaziz/state.json';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    if (req.method === 'GET') {
      try {
        const meta = await head(STATE_PATH);
        if (meta && meta.url) {
          const cloudRes = await fetch(meta.url, { cache: 'no-store' });
          if (cloudRes.ok) {
            const data = await cloudRes.json();
            return res.status(200).json(data);
          }
        }
      } catch (e: any) {
        // Blob not found yet, return empty structure
      }
      return res.status(200).json({ tasks: [], scheduledMedia: [], updatedAt: new Date().toISOString() });
    }

    if (req.method === 'POST') {
      const body = req.body || {};
      const payload = {
        ...body,
        updatedAt: new Date().toISOString(),
      };

      const blob = await put(STATE_PATH, JSON.stringify(payload), {
        access: 'public',
        addRandomSuffix: false,
      });

      return res.status(200).json({ success: true, url: blob.url, updatedAt: payload.updatedAt });
    }

    return res.status(405).json({ error: 'Method Not Allowed' });
  } catch (error: any) {
    console.error('API Sync Error:', error);
    return res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
}

