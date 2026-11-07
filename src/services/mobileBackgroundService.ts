// Mobile Background & Web Push Service for Dr. Abdelaziz

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

// Minimal 1-second silent WAV audio (base64) for keeping audio session alive on Android/iOS
const SILENT_AUDIO_URI = 'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA';

class MobileBackgroundService {
  private isKeepAliveActive = true;
  private silentAudioEl: HTMLAudioElement | null = null;
  private wakeLockSentinel: any = null;
  private isPushSubscribed = false;

  constructor() {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('dr_abdelaziz_keep_alive_enabled');
      // Default to permanently enabled (true)
      this.isKeepAliveActive = saved !== 'false';

      // Always auto-start Keep-Alive session
      if (this.isKeepAliveActive) {
        this.startKeepAlive();
        const autoUnlock = () => {
          this.startKeepAlive();
        };
        window.addEventListener('click', autoUnlock, { passive: true });
        window.addEventListener('touchstart', autoUnlock, { passive: true });
      }

      // Auto-init Push if permission granted
      setTimeout(() => {
        this.autoInitPush();
      }, 1500);
    }
  }

  /**
   * Auto initialize Web Push if permission is granted
   */
  public async autoInitPush(): Promise<boolean> {
    if (typeof window === 'undefined') return false;
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return false;
    try {
      if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
        const res = await this.subscribeToPush();
        return res.success;
      }
    } catch (e) {
      console.warn('Auto push init warning:', e);
    }
    return false;
  }

  /**
   * Play Azan directly on the active background audio element
   * to bypass mobile browser autoplay blocks without pressing anything
   */
  public playAzanDirectly(reciterUrl: string, volume: number = 1.0) {
    try {
      if (!this.silentAudioEl) {
        this.silentAudioEl = new Audio();
      }
      this.silentAudioEl.loop = false;
      this.silentAudioEl.src = reciterUrl;
      this.silentAudioEl.volume = Math.max(0, Math.min(1, volume));
      this.silentAudioEl.currentTime = 0;

      const p = this.silentAudioEl.play();
      if (p !== undefined) {
        p.catch((err) => {
          console.warn('Direct audio play fallback:', err);
          const fallbackAudio = new Audio(reciterUrl);
          fallbackAudio.volume = volume;
          fallbackAudio.play().catch(() => {});
        });
      }

      this.silentAudioEl.onended = () => {
        if (this.isKeepAliveActive && this.silentAudioEl) {
          this.silentAudioEl.src = SILENT_AUDIO_URI;
          this.silentAudioEl.loop = true;
          this.silentAudioEl.volume = 0.01;
          this.silentAudioEl.play().catch(() => {});
        }
      };
    } catch (e) {
      console.warn('playAzanDirectly error:', e);
    }
  }

  /**
   * Request Notification permission and subscribe to Web Push on Service Worker
   */
  public async subscribeToPush(): Promise<{ success: boolean; message: string }> {
    if (typeof window === 'undefined') {
      return { success: false, message: 'بيئة غير مدعومة' };
    }

    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      return { 
        success: false, 
        message: 'متصفحك الحالي لا يدعم إشعارات الويب السحابية Push Notifications. يرجى استخدام متصفح Chrome أو إضافة التطبيق للشاشة الرئيسية.' 
      };
    }

    try {
      // 1. Request Notification Permission
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        return { 
          success: false, 
          message: 'تم رفض إذن الإشعارات من إعدادات المتصفح. يرجى تفعيل إذن الإشعارات أولاً.' 
        };
      }

      // 2. Wait for Service Worker
      const reg = await navigator.serviceWorker.ready;

      // 3. Fetch VAPID Public Key from server
      let publicKey = (import.meta as any).env?.VITE_VAPID_PUBLIC_KEY;
      if (!publicKey) {
        try {
          const resp = await fetch('/api/push-subscribe');
          if (resp.ok) {
            const data = await resp.json();
            publicKey = data.publicKey;
          }
        } catch (e) {
          console.warn('Could not fetch public key from API:', e);
        }
      }

      if (!publicKey) {
        publicKey = 'BOw1BHKZUA1YRgFIf13ZVhMXk-P8OBZvOR2xrlL2Ft7XqE1IrK8zI85Jtf8H-mcuda3WBi8g20RlT60QgAK_Lmo';
      }

      // 4. Subscribe to Push Manager
      const applicationServerKey = urlBase64ToUint8Array(publicKey);
      let sub = await reg.pushManager.getSubscription();

      if (!sub) {
        sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey,
        });
      }

      // 5. Send subscription to our Vercel Blob backend
      const saveResp = await fetch('/api/push-subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sub.toJSON()),
      });

      if (!saveResp.ok) {
        throw new Error('فشل حفظ اشتراك الإشعارات في السحابة');
      }

      this.isPushSubscribed = true;
      localStorage.setItem('dr_abdelaziz_push_subscribed', 'true');

      return {
        success: true,
        message: 'تم تفعيل إشعارات الهاتف بنجاح! ستصلك تنبيهات الأذان والمهام حتى لو كان الهاتف مقفلاً.',
      };
    } catch (err: any) {
      console.error('Push subscribe error:', err);
      return {
        success: false,
        message: 'حدث خطأ أثناء الاشتراك: ' + (err.message || 'خطأ غير معروف'),
      };
    }
  }

  /**
   * Check if push is currently subscribed
   */
  public async isSubscribed(): Promise<boolean> {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator) || !('PushManager' in window)) {
      return false;
    }
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      return !!sub;
    } catch {
      return false;
    }
  }

  /**
   * Test sending a Push Notification right now from the server
   */
  public async sendTestPush(): Promise<{ success: boolean; message: string }> {
    try {
      const resp = await fetch('/api/push-broadcast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'تجربة إشعار الأذان الفوري 🕌',
          body: 'يا دكتور عبد العزيز، نظام الأذان والتنبيهات يعمل بنجاح على هاتفك المحمول حتى في وضع القفل!',
          type: 'azan',
          prayerId: 'test',
        }),
      });

      const data = await resp.json();
      return {
        success: data.success ?? false,
        message: data.message || 'تم إرسال الإشعار',
      };
    } catch (err: any) {
      return {
        success: false,
        message: 'فشل إرسال الإشعار التجريبي: ' + err.message,
      };
    }
  }

  /**
   * Enable or Disable Background Audio Session (Keep-Alive Mode)
   * This allows the mobile device to keep running its timers and play the Azan loudly 
   * even when the screen is locked!
   */
  public setKeepAliveMode(enabled: boolean): boolean {
    this.isKeepAliveActive = enabled;
    localStorage.setItem('dr_abdelaziz_keep_alive_enabled', enabled ? 'true' : 'false');

    if (enabled) {
      this.startKeepAlive();
    } else {
      this.stopKeepAlive();
    }
    return enabled;
  }

  public getKeepAliveMode(): boolean {
    return this.isKeepAliveActive;
  }

  private startKeepAlive() {
    try {
      if (!this.silentAudioEl) {
        this.silentAudioEl = new Audio(SILENT_AUDIO_URI);
        this.silentAudioEl.loop = true;
        this.silentAudioEl.volume = 0.01; // inaudible
      }

      this.silentAudioEl.play().catch(() => {
        console.log('Silent audio playback requires user interaction once');
      });

      // Setup Media Session so OS recognizes it as an ongoing prayer assistant
      if ('mediaSession' in navigator) {
        navigator.mediaSession.metadata = new MediaMetadata({
          title: 'المساعد الشخصي د. عبد العزيز',
          artist: 'نظام مواقيت الصلاة والأذان الذكي',
          album: 'الأذان التلقائي (جاهز للتنبيه)',
          artwork: [
            { src: '/pwa-192x192.png', sizes: '192x192', type: 'image/png' },
            { src: '/pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          ],
        });
      }

      // Try WakeLock if available
      this.requestWakeLock();
    } catch (e) {
      console.warn('Keep-alive start error:', e);
    }
  }

  private stopKeepAlive() {
    try {
      if (this.silentAudioEl) {
        this.silentAudioEl.pause();
        this.silentAudioEl = null;
      }
      if (this.wakeLockSentinel) {
        this.wakeLockSentinel.release();
        this.wakeLockSentinel = null;
      }
    } catch (e) {
      console.warn('Keep-alive stop error:', e);
    }
  }

  private async requestWakeLock() {
    if ('wakeLock' in navigator) {
      try {
        this.wakeLockSentinel = await (navigator as any).wakeLock.request('screen');
      } catch {
        // Ignored if not permitted
      }
    }
  }
}

export const mobileBackgroundService = new MobileBackgroundService();

