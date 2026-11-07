import type { VercelRequest, VercelResponse } from '@vercel/node';
import { put, head } from '@vercel/blob';

const STATE_PATH = 'dr-abdelaziz/state.json';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    if (req.method === 'GET') {
      try {
        const meta = await head(STATE_PATH);
        if (meta && meta.url) {
          // Add timestamp cache buster because Vercel Blob public CDN caches fixed URLs
          const fetchUrl = `${meta.url}?t=${Date.now()}`;
          const cloudRes = await fetch(fetchUrl, { 
            cache: 'no-store',
            headers: { 'Cache-Control': 'no-cache' }
          });
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
      const rawBody = req.body;
      const body = typeof rawBody === 'string' ? JSON.parse(rawBody) : (rawBody || {});
      const payload = {
        ...body,
        updatedAt: new Date().toISOString(),
      };

      const blob = await put(STATE_PATH, JSON.stringify(payload), {
        access: 'public',
        addRandomSuffix: false,
        allowOverwrite: true,
      });

      return res.status(200).json({ success: true, url: blob.url, updatedAt: payload.updatedAt });
    }

    return res.status(405).json({ error: 'Method Not Allowed' });
  } catch (error: any) {
    console.error('API Sync Error:', error);
    return res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
}

