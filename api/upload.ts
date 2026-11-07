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
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-filename, x-content-type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const rawFilename = decodeURIComponent((req.headers['x-filename'] as string) || `media_${Date.now()}.mp4`);
    const requestedContentType = (req.headers['x-content-type'] as string) || '';
    
    // Determine extension and proper MIME type
    let ext = rawFilename.split('.').pop()?.toLowerCase() || '';
    let mime = requestedContentType;

    if (!mime) {
      if (['mp4', 'mov', 'webm', 'mkv', 'avi'].includes(ext)) {
        mime = ext === 'webm' ? 'video/webm' : ext === 'mov' ? 'video/quicktime' : 'video/mp4';
      } else if (['mp3', 'wav', 'ogg', 'm4a', 'aac'].includes(ext)) {
        mime = ext === 'mp3' ? 'audio/mpeg' : ext === 'wav' ? 'audio/wav' : ext === 'ogg' ? 'audio/ogg' : 'audio/mp4';
      } else {
        mime = 'video/mp4';
        ext = 'mp4';
      }
    }

    // Ensure safe clean filename that ALWAYS ends with extension so video players decode properly
    const baseName = rawFilename.replace(/[^a-zA-Z0-9_\u0600-\u06FF.-]/g, '_');
    const safeFilename = baseName.includes('.') ? baseName : `${baseName}.${ext || 'mp4'}`;
    const cleanFilename = `dr-abdelaziz/media/${Date.now()}_${safeFilename}`;

    const blob = await put(cleanFilename, req, {
      access: 'public',
      allowOverwrite: true,
      contentType: mime,
    });

    return res.status(200).json({ success: true, url: blob.url, contentType: mime });
  } catch (error: any) {
    console.error('API Upload Error:', error);
    return res.status(500).json({ error: error.message || 'Upload failed' });
  }
}
