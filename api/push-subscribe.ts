import type { VercelRequest, VercelResponse } from '@vercel/node';
import { put, list } from '@vercel/blob';

const BLOB_FILENAME = 'dr-abdelaziz/push-subscriptions.json';
const PUBLIC_VAPID_KEY = process.env.VAPID_PUBLIC_KEY || 'BOw1BHKZUA1YRgFIf13ZVhMXk-P8OBZvOR2xrlL2Ft7XqE1IrK8zI85Jtf8H-mcuda3WBi8g20RlT60QgAK_Lmo';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // GET: Return Public VAPID Key
  if (req.method === 'GET') {
    return res.status(200).json({
      publicKey: PUBLIC_VAPID_KEY,
    });
  }

  // POST: Save or Update Push Subscription
  if (req.method === 'POST') {
    try {
      const subscription = req.body;
      if (!subscription || !subscription.endpoint) {
        return res.status(400).json({ error: 'Invalid subscription object' });
      }

      // Read existing subscriptions
      let subscriptions: any[] = [];
      try {
        const { blobs } = await list({ prefix: BLOB_FILENAME });
        const existingBlob = blobs.find((b) => b.pathname === BLOB_FILENAME);
        if (existingBlob) {
          const resp = await fetch(`${existingBlob.url}?t=${Date.now()}`);
          if (resp.ok) {
            subscriptions = await resp.json();
          }
        }
      } catch (err) {
        console.warn('Could not read existing subscriptions:', err);
      }

      // Add or update subscription
      const existsIndex = subscriptions.findIndex((s) => s.endpoint === subscription.endpoint);
      if (existsIndex >= 0) {
        subscriptions[existsIndex] = {
          ...subscription,
          updatedAt: new Date().toISOString(),
        };
      } else {
        subscriptions.push({
          ...subscription,
          createdAt: new Date().toISOString(),
        });
      }

      // Keep maximum 50 most recent subscriptions
      if (subscriptions.length > 50) {
        subscriptions = subscriptions.slice(-50);
      }

      // Save back to Vercel Blob
      await put(BLOB_FILENAME, JSON.stringify(subscriptions), {
        access: 'public',
        contentType: 'application/json',
        addRandomSuffix: false,
        allowOverwrite: true,
      });

      return res.status(200).json({
        success: true,
        message: 'تم تسجيل اشتراك الإشعارات بنجاح',
        count: subscriptions.length,
      });
    } catch (err: any) {
      console.error('Error saving push subscription:', err);
      return res.status(500).json({ error: err.message || 'Internal server error' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

