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

    const MIME_BY_EXT: Record<string, string> = {
      mp4: 'video/mp4',
      mov: 'video/quicktime',
      webm: 'video/webm',
      mkv: 'video/x-matroska',
      avi: 'video/x-msvideo',
      mp3: 'audio/mpeg',
      wav: 'audio/wav',
      ogg: 'audio/ogg',
      m4a: 'audio/mp4',
      aac: 'audio/aac',
      pdf: 'application/pdf',
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      png: 'image/png',
      webp: 'image/webp',
      gif: 'image/gif',
      txt: 'text/plain; charset=utf-8',
      csv: 'text/csv; charset=utf-8',
      json: 'application/json',
      doc: 'application/msword',
      docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      xls: 'application/vnd.ms-excel',
      xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      ppt: 'application/vnd.ms-powerpoint',
      pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      zip: 'application/zip',
    };

    if (!mime) {
      if (ext && MIME_BY_EXT[ext]) {
        mime = MIME_BY_EXT[ext];
      } else {
        mime = 'application/octet-stream';
        ext = ext || 'bin';
      }
    }

    // Ensure safe clean filename that ALWAYS ends with extension so viewers decode properly
    const baseName = rawFilename.replace(/[^a-zA-Z0-9_\u0600-\u06FF.-]/g, '_');
    const safeFilename = baseName.includes('.') ? baseName : `${baseName}.${ext || 'bin'}`;
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
