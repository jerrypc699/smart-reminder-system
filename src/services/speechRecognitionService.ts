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
  private isStarting: boolean = false;
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
    // Prevent concurrent startup race conditions
    if (this.isStarting) {
      console.log('UniversalSpeechService: Speech recognition is already initializing');
      return false;
    }

    this.isStarting = true;

    try {
      // 1. Ensure any previous native or web session is cleanly stopped
      if (this.isCurrentlyListening) {
        await this.stopListening();
        await new Promise((resolve) => setTimeout(resolve, 150));
      }

      // 2. First ensure permissions are granted
      const hasPermission = await this.requestPermissions();
      if (!hasPermission) {
        callbacks.onError?.('لم يتم منح إذن استخدام الميكروفون. يرجى السماح للتطبيق بالوصول للميكروفون من إعدادات الهاتف.');
        return false;
      }

      // 3. Native Mode (Android / iOS)
      if (this.isNative) {
        try {
          const available = await SpeechRecognition.available().catch(() => ({ available: false }));
          if (!available.available) {
            callbacks.onError?.('خدمة التعرف الصوتي غير مفعلة على جهازك. يرجى التأكد من تفعيل تطبيق Google الصوتي.');
            return false;
          }

          // Clean any previous listeners
          if (this.partialListenerHandle) {
            await this.partialListenerHandle.remove().catch(() => {});
            this.partialListenerHandle = null;
          }
          if (this.listeningStateHandle) {
            await this.listeningStateHandle.remove().catch(() => {});
            this.listeningStateHandle = null;
          }

          // Force stop any lingering native session cleanly before starting and wait for IDLE
          try {
            const isLis = await SpeechRecognition.isListening().catch(() => ({ listening: false }));
            if (isLis.listening) {
              await SpeechRecognition.forceStop({ timeout: 0 }).catch(() => {});
              await new Promise((resolve) => setTimeout(resolve, 300));
            }
          } catch {}

          // Listen for partial and final results in real-time
          this.partialListenerHandle = await SpeechRecognition.addListener('partialResults', (event: any) => {
            if (event && event.matches && event.matches.length > 0) {
              callbacks.onResult(event.matches[0], false);
            }
          });

          // Listen for session stop / completion state
          this.listeningStateHandle = await SpeechRecognition.addListener('listeningState', (event: any) => {
            if (event && (event.status === 'stopped' || event.state === 'stopped')) {
              this.isCurrentlyListening = false;
              this.isStarting = false;
              callbacks.onEnd?.();
            }
          });

          let startedSuccessfully = false;
          let lastStartError: any = null;

          // Attempt starting with auto-healing backoff for Android recognizer state transitions
          for (let attempt = 0; attempt < 4; attempt++) {
            try {
              await SpeechRecognition.start({
                language: 'ar-EG',
                maxResults: 3,
                prompt: 'تفضل بالحديث يا دكتور عبد العزيز...',
                popup: false,
                partialResults: true,
                addPunctuation: true,
              });
              startedSuccessfully = true;
              break;
            } catch (startErr: any) {
              lastStartError = startErr;
              const errStr = (startErr?.message || startErr || '').toString().toLowerCase();
              if (errStr.includes('already running') || errStr.includes('busy')) {
                console.warn(`[SpeechRecognition] Recognizer busy (attempt ${attempt + 1}/4), waiting for idle state...`);
                await SpeechRecognition.forceStop({ timeout: 0 }).catch(() => {});
                await new Promise((resolve) => setTimeout(resolve, 350 * (attempt + 1)));
              } else {
                throw startErr;
              }
            }
          }

          if (startedSuccessfully) {
            this.isCurrentlyListening = true;
            callbacks.onStart?.();
            return true;
          }

          if (lastStartError) {
            throw lastStartError;
          }
          return false;
        } catch (err: any) {
          console.warn('Native speech recognition start error:', err);
          this.isCurrentlyListening = false;
          await SpeechRecognition.forceStop({ timeout: 0 }).catch(() => {});
          const rawMsg = (err?.message || err || '').toString();
          let friendlyMsg = 'تعذر بدء التعرف الصوتي';
          if (rawMsg.includes('already running') || rawMsg.includes('busy')) {
            friendlyMsg = 'تمت إعادة ضبط الميكروفون بنجاح. اضغط الآن للتحدث يا دكتور عبد العزيز.';
          } else if (rawMsg.includes('permission') || rawMsg.includes('Permission')) {
            friendlyMsg = 'يرجى تفعيل إذن الميكروفون من إعدادات الهاتف للتطبيق.';
          } else {
            friendlyMsg = `تعذر بدء التعرف الصوتي: ${rawMsg}`;
          }
          callbacks.onError?.(friendlyMsg);
          return false;
        }
      }

      // 4. Web Browser Mode (Chrome / Edge / Safari)
      const SpeechRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (!SpeechRec) {
        callbacks.onError?.('المتصفح الحالي لا يدعم ميزة التعرف الصوتي المباشر.');
        return false;
      }

      try {
        const rec = new SpeechRec();
        rec.lang = 'ar-EG';
        rec.continuous = false;
        rec.interimResults = true;
        rec.maxAlternatives = 1;

        rec.onstart = () => {
          this.isCurrentlyListening = true;
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
          this.isCurrentlyListening = false;
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
    } finally {
      this.isStarting = false;
    }
  }

  /**
   * Stop Dictation
   */
  public async stopListening(): Promise<void> {
    this.isCurrentlyListening = false;
    this.isStarting = false;

    if (this.isNative) {
      try {
        await SpeechRecognition.forceStop({ timeout: 10 }).catch(() => {});
        if (this.partialListenerHandle) {
          await this.partialListenerHandle.remove().catch(() => {});
          this.partialListenerHandle = null;
        }
        if (this.listeningStateHandle) {
          await this.listeningStateHandle.remove().catch(() => {});
          this.listeningStateHandle = null;
        }
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
