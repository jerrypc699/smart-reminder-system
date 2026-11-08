import { Capacitor } from '@capacitor/core';
import { SpeechRecognition } from '@capgo/capacitor-speech-recognition';

export interface SpeechRecognitionCallbacks {
  onStart?: () => void;
  onResult: (transcript: string, isFinal: boolean) => void;
  onError?: (error: string) => void;
  onEnd?: () => void;
}

class UniversalSpeechService {
  private isNative: boolean = false;
  private webRecognition: any = null;
  private isCurrentlyListening: boolean = false;
  private partialListenerHandle: any = null;
  private listeningStateHandle: any = null;

  constructor() {
    this.isNative = Capacitor.isNativePlatform();
  }

  /**
   * Request microphone & speech recognition permissions
   */
  public async requestPermissions(): Promise<boolean> {
    if (this.isNative) {
      try {
        const status = await SpeechRecognition.checkPermissions();
        if (status.speechRecognition === 'granted') {
          return true;
        }
        const requested = await SpeechRecognition.requestPermissions();
        return requested.speechRecognition === 'granted';
      } catch (err: any) {
        console.warn('Native speech permission error:', err);
        return false;
      }
    } else {
      // Web browser: request mic access via getUserMedia to trigger browser prompt
      try {
        if (typeof navigator !== 'undefined' && navigator.mediaDevices?.getUserMedia) {
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          stream.getTracks().forEach((t) => t.stop());
          return true;
        }
      } catch (e) {
        console.warn('Web mic permission error:', e);
        return false;
      }
      return true;
    }
  }

  /**
   * Start Voice Dictation
   */
  public async startListening(callbacks: SpeechRecognitionCallbacks): Promise<boolean> {
    this.stopListening();

    // 1. First ensure permissions are granted
    const hasPermission = await this.requestPermissions();
    if (!hasPermission) {
      callbacks.onError?.('لم يتم منح إذن استخدام الميكروفون. يرجى السماح للتطبيق بالوصول للميكروفون من إعدادات الهاتف.');
      return false;
    }

    this.isCurrentlyListening = true;

    // 2. Native Mode (Android / iOS)
    if (this.isNative) {
      try {
        const available = await SpeechRecognition.available().catch(() => ({ available: false }));
        if (!available.available) {
          callbacks.onError?.('خدمة التعرف الصوتي غير مفعلة على جهازك. يرجى التأكد من تفعيل تطبيق Google الصوتي.');
          this.isCurrentlyListening = false;
          return false;
        }

        // Clean any existing listeners
        await SpeechRecognition.removeAllListeners().catch(() => {});

        // Listen for partial results in real-time
        this.partialListenerHandle = await SpeechRecognition.addListener('partialResults', (event: any) => {
          if (event && event.matches && event.matches.length > 0) {
            callbacks.onResult(event.matches[0], false);
          }
        });

        this.listeningStateHandle = await SpeechRecognition.addListener('listeningState', (event: any) => {
          if (event && event.status === 'stopped' && this.isCurrentlyListening) {
            this.isCurrentlyListening = false;
            callbacks.onEnd?.();
          }
        });

        callbacks.onStart?.();

        const result = await SpeechRecognition.start({
          language: 'ar-EG',
          maxResults: 3,
          prompt: 'تفضل بالحديث يا دكتور عبد العزيز...',
          popup: false,
          partialResults: true,
          addPunctuation: true,
        });

        if (result && result.matches && result.matches.length > 0) {
          callbacks.onResult(result.matches[0], true);
        }
        
        callbacks.onEnd?.();
        this.isCurrentlyListening = false;
        return true;
      } catch (err: any) {
        console.warn('Native speech recognition start error:', err);
        this.isCurrentlyListening = false;
        callbacks.onError?.('تعذر بدء التعرف الصوتي: ' + (err.message || 'خطأ في النظام'));
        return false;
      }
    }

    // 3. Web Browser Mode (Chrome / Edge / Safari)
    const SpeechRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRec) {
      callbacks.onError?.('المتصفح الحالي لا يدعم ميزة التعرف الصوتي المباشر.');
      this.isCurrentlyListening = false;
      return false;
    }

    try {
      const rec = new SpeechRec();
      rec.lang = 'ar-EG';
      rec.continuous = false;
      rec.interimResults = true;
      rec.maxAlternatives = 1;

      rec.onstart = () => {
        callbacks.onStart?.();
      };

      rec.onresult = (event: any) => {
        let currentText = '';
        let isFinal = false;
        for (let i = event.resultIndex; i < event.results.length; i++) {
          currentText += event.results[i][0].transcript;
          if (event.results[i].isFinal) isFinal = true;
        }
        callbacks.onResult(currentText, isFinal);
      };

      rec.onerror = (e: any) => {
        console.warn('Web speech recognition error:', e.error);
        if (e.error === 'not-allowed') {
          callbacks.onError?.('تم رفض إذن الميكروفون. يرجى تفعيل إذن الميكروفون من إعدادات المتصفح.');
        } else if (e.error !== 'no-speech') {
          callbacks.onError?.(`خطأ في التعرف الصوتي: ${e.error}`);
        }
      };

      rec.onend = () => {
        this.isCurrentlyListening = false;
        callbacks.onEnd?.();
      };

      this.webRecognition = rec;
      rec.start();
      return true;
    } catch (e: any) {
      this.isCurrentlyListening = false;
      callbacks.onError?.('تعذر بدء التسجيل: ' + (e.message || 'خطأ غير معروف'));
      return false;
    }
  }

  /**
   * Stop Dictation
   */
  public async stopListening(): Promise<void> {
    this.isCurrentlyListening = false;

    if (this.isNative) {
      try {
        await SpeechRecognition.stop().catch(() => {});
        await SpeechRecognition.removeAllListeners().catch(() => {});
      } catch {}
    }

    if (this.webRecognition) {
      try {
        this.webRecognition.stop();
      } catch {}
      this.webRecognition = null;
    }
  }

  public isListening(): boolean {
    return this.isCurrentlyListening;
  }
}

export const universalSpeechService = new UniversalSpeechService();

