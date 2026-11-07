const CACHE_NAME = 'dr-abdelaziz-pwa-v7';

const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.svg',
  '/icon.svg',
  '/pwa-192x192.png',
  '/pwa-512x512.png',
  '/apple-touch-icon.png',
  '/audio/makkah.mp3',
  '/audio/abdulbasit.mp3',
  '/audio/mishary.mp3',
  '/audio/takbeerat.mp3',
  '/audio/dr_abdelaziz_call.mp3',
  '/audio/dr_abdelaziz_welcome.mp3',
  '/audio/dr_abdelaziz_task_alert.mp3',
  '/audio/dr_abdelaziz_clinic_alert.mp3',
  '/audio/dr_abdelaziz_pre_azan.mp3'
];

// Install: Cache critical shell assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch((err) => {
        console.warn('PWA Pre-cache partial warning:', err);
      });
    })
  );
  self.skipWaiting();
});

// Activate: Clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch: Network first with Cache fallback for HTML/API, Cache first for assets
self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // Bypass SW completely for APIs, storage blobs, range video streams
  if (
    url.pathname.startsWith('/api/') || 
    url.hostname.includes('blob.vercel-storage.com') || 
    url.protocol === 'blob:' || 
    request.headers.has('range')
  ) {
    return;
  }

  // Static assets (js, css, png, svg, mp3, fonts) -> Cache first, then network & update cache
  if (
    url.pathname.endsWith('.js') ||
    url.pathname.endsWith('.css') ||
    url.pathname.endsWith('.svg') ||
    url.pathname.endsWith('.png') ||
    url.pathname.endsWith('.woff2') ||
    url.pathname.endsWith('.mp3')
  ) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request)
          .then((response) => {
            if (response.status === 200) {
              const clone = response.clone();
              caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
            }
            return response;
          })
          .catch(() => cached);
      })
    );
    return;
  }

  // Navigation (HTML pages) -> Network first, fallback to cached index.html
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.status === 200) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return response;
        })
        .catch(() => caches.match('/index.html'))
    );
    return;
  }

  // Default: Network with Cache fallback
  event.respondWith(
    fetch(request).catch(() => caches.match(request))
  );
});

// Handle Incoming Web Push Notifications (works when phone is locked or app is closed)
self.addEventListener('push', (event) => {
  let data = {
    title: 'تنبيه موعد الصلاة 🕌',
    body: 'يا دكتور عبد العزيز، حان الآن موعد الصلاة حسب توقيت القاهرة.',
    icon: '/pwa-192x192.png',
    badge: '/pwa-192x192.png',
    type: 'azan',
    url: '/?play_azan=true'
  };

  if (event.data) {
    try {
      data = Object.assign(data, event.data.json());
    } catch {
      data.body = event.data.text() || data.body;
    }
  }

  const isAzan = data.type === 'azan';
  const isTask = data.type === 'task';

  // Distinct vibration rhythms
  const vibrationPattern = isAzan
    ? [500, 200, 500, 200, 1000, 300, 500, 200, 1000]
    : [300, 150, 300, 150, 500];

  // Specific action buttons for Prayer vs Task
  const actions = isAzan
    ? [
        { action: 'play_azan', title: 'سماع الأذان الآن 🕌' },
        { action: 'open_app', title: 'فتح التطبيق 📱' }
      ]
    : [
        { action: 'play_task', title: 'سماع صوت التنبيه 🔊' },
        { action: 'open_app', title: 'فتح المهمة 📋' }
      ];

  const defaultUrl = isAzan 
    ? `/?play_azan=true&prayer=${data.prayerId || 'now'}` 
    : `/?play_task=${data.taskId || ''}`;

  const notificationOptions = {
    body: data.body,
    icon: data.icon || '/pwa-192x192.png',
    badge: data.badge || '/pwa-192x192.png',
    sound: isAzan ? '/audio/mishary.mp3' : (data.audioUrl || '/audio/dr_abdelaziz_task_alert.mp3'),
    vibrate: vibrationPattern,
    tag: data.tag || (isAzan ? 'prayer-azan-alert' : `task-${data.taskId || Date.now()}`),
    renotify: true,
    requireInteraction: true,
    silent: false,
    dir: 'rtl',
    lang: 'ar',
    data: {
      url: data.url || defaultUrl,
      type: data.type || (isAzan ? 'azan' : 'task'),
      prayerId: data.prayerId || 'now',
      taskId: data.taskId,
      audioUrl: data.audioUrl,
      voiceMessage: data.voiceMessage,
      title: data.title,
      timestamp: Date.now()
    },
    actions: actions
  };

  event.waitUntil(
    Promise.all([
      self.registration.showNotification(data.title, notificationOptions),
      clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
        for (const client of clientList) {
          if (isAzan) {
            client.postMessage({ type: 'TRIGGER_AZAN', prayerId: data.prayerId });
          } else if (isTask) {
            client.postMessage({
              type: 'TRIGGER_TASK_ALERT',
              taskId: data.taskId,
              title: data.title,
              voiceMessage: data.voiceMessage,
              audioUrl: data.audioUrl
            });
          }
        }
      })
    ])
  );
});

// Handle Push Notifications / Clicks & Actions
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const data = event.notification.data || {};
  const isPlayAzan = event.action === 'play_azan' || data.type === 'azan';
  const isPlayTask = event.action === 'play_task' || data.type === 'task';

  const defaultTargetUrl = isPlayAzan
    ? '/?play_azan=true'
    : (data.taskId ? `/?play_task=${data.taskId}` : '/#tasks');
  const targetUrl = data.url || defaultTargetUrl;

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url && 'focus' in client) {
          if (isPlayAzan) {
            client.postMessage({ type: 'TRIGGER_AZAN', prayerId: data.prayerId });
          } else if (isPlayTask) {
            client.postMessage({
              type: 'TRIGGER_TASK_ALERT',
              taskId: data.taskId,
              title: data.title,
              voiceMessage: data.voiceMessage,
              audioUrl: data.audioUrl
            });
          }
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});

