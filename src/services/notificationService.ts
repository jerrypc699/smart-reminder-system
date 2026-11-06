// Desktop Notification Service

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

  public showNotification(
    title: string,
    options: {
      body?: string;
      tag?: string;
      icon?: string;
      requireInteraction?: boolean;
    } = {}
  ): Notification | null {
    if (!this.hasPermission()) {
      return null;
    }

    try {
      const notif = new Notification(title, {
        body: options.body,
        tag: options.tag || 'smart-reminder',
        icon: options.icon || '/favicon.svg',
        requireInteraction: options.requireInteraction ?? true,
        dir: 'rtl',
        lang: 'ar',
      });

      notif.onclick = () => {
        window.focus();
        notif.close();
      };

      return notif;
    } catch (e) {
      console.warn('Could not display notification:', e);
      return null;
    }
  }
}

export const notificationService = new NotificationService();
