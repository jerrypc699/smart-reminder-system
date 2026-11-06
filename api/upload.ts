import type { VercelRequest, VercelResponse } from '@vercel/node';
import { put } from '@vercel/blob';

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-filename');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const rawFilename = (req.headers['x-filename'] as string) || `media_${Date.now()}`;
    const cleanFilename = `dr-abdelaziz/media/${Date.now()}_${encodeURIComponent(rawFilename)}`;

    const blob = await put(cleanFilename, req, {
      access: 'public',
    });

    return res.status(200).json({ success: true, url: blob.url });
  } catch (error: any) {
    console.error('API Upload Error:', error);
    return res.status(500).json({ error: error.message || 'Upload failed' });
  }
}

