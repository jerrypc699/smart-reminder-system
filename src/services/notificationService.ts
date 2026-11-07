// Cross-Platform Notification Service (Desktop & Mobile PWA)

class NotificationService {
  private permission: NotificationPermission = 'default';

  constructor() {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      this.permission = Notification.permission;
    }
  }

  public async requestPermission(): Promise<boolean> {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      return false;
    }

    try {
      const res = await Notification.requestPermission();
      this.permission = res;
      return res === 'granted';
    } catch {
      return false;
    }
  }

  public hasPermission(): boolean {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      return false;
    }
    return Notification.permission === 'granted';
  }

  public async showNotification(
    title: string,
    options: {
      body?: string;
      tag?: string;
      icon?: string;
      badge?: string;
      vibrate?: number[];
      requireInteraction?: boolean;
      data?: any;
    } = {}
  ): Promise<boolean> {
    if (!this.hasPermission()) {
      return false;
    }

    const vibratePattern = options.vibrate || [300, 150, 300, 150, 500];
    const iconUrl = options.icon || '/pwa-192x192.png';
    const badgeUrl = options.badge || '/pwa-192x192.png';

    // 1. Try Service Worker showNotification (Mandatory on Android / Mobile)
    if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
      try {
        const reg = await navigator.serviceWorker.ready;
        if (reg && 'showNotification' in reg) {
          await (reg as any).showNotification(title, {
            body: options.body,
            tag: options.tag || 'smart-reminder',
            icon: iconUrl,
            badge: badgeUrl,
            vibrate: vibratePattern,
            requireInteraction: options.requireInteraction ?? true,
            dir: 'rtl',
            lang: 'ar',
            data: options.data || { url: '/' },
          });
          return true;
        }
      } catch (swErr) {
        console.warn('ServiceWorker notification error, trying window Notification:', swErr);
      }
    }

    // 2. Fallback to desktop window.Notification constructor
    try {
      const notif = new Notification(title, {
        body: options.body,
        tag: options.tag || 'smart-reminder',
        icon: iconUrl,
        requireInteraction: options.requireInteraction ?? true,
        dir: 'rtl',
        lang: 'ar',
      });

      notif.onclick = () => {
        window.focus();
        notif.close();
      };

      return true;
    } catch (e) {
      console.warn('Could not display notification:', e);
      return false;
    }
  }
}

export const notificationService = new NotificationService();
