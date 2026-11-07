// Audio Service: Web Audio API Synthesizer & Speech Synthesis (TTS) & Real Azan Audio

class AudioService {
  private audioCtx: AudioContext | null = null;
  private isUnlocked: boolean = false;
  private currentAzanAudio: HTMLAudioElement | null = null;
  private currentCustomAudio: HTMLAudioElement | null = null;
  private isSpeaking: boolean = false;
  private onSpeakingChangeCallbacks: Set<(isSpeaking: boolean) => void> = new Set();

  constructor() {
    if (typeof window !== 'undefined') {
      const unlockAudio = () => {
        this.initAudioContext();
        window.removeEventListener('click', unlockAudio);
        window.removeEventListener('keydown', unlockAudio);
        window.removeEventListener('touchstart', unlockAudio);
      };
      window.addEventListener('click', unlockAudio);
      window.addEventListener('keydown', unlockAudio);
      window.addEventListener('touchstart', unlockAudio);
    }
  }

  public initAudioContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.audioCtx) {
      const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioContextClass) {
        this.audioCtx = new AudioContextClass();
      }
    }
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
    this.isUnlocked = true;
    return this.audioCtx;
  }

  public subscribeSpeakingChange(callback: (isSpeaking: boolean) => void) {
    this.onSpeakingChangeCallbacks.add(callback);
    return () => {
      this.onSpeakingChangeCallbacks.delete(callback);
    };
  }

  private notifySpeaking(speaking: boolean) {
    this.isSpeaking = speaking;
    this.onSpeakingChangeCallbacks.forEach((cb) => cb(speaking));
  }

  /**
   * Synthesize harmonic chime using Web Audio API
   */
  public playChime(
    type: 'task' | 'urgent' | 'pre_azan' | 'success' | 'click',
    volume: number = 0.8
  ): void {
    try {
      const ctx = this.initAudioContext();
      if (!ctx) return;

      const masterGain = ctx.createGain();
      masterGain.gain.setValueAtTime(Math.max(0, Math.min(1, volume)), ctx.currentTime);
      masterGain.connect(ctx.destination);

      const now = ctx.currentTime;

      if (type === 'click') {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(800, now);
        osc.frequency.exponentialRampToValueAtTime(300, now + 0.05);
        gain.gain.setValueAtTime(0.3, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
        osc.connect(gain);
        gain.connect(masterGain);
        osc.start(now);
        osc.stop(now + 0.05);
        return;
      }

      if (type === 'task') {
        // Modern executive arpeggio: C5, G5, C6
        const notes = [523.25, 783.99, 1046.5];
        notes.forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          const startTime = now + idx * 0.12;
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, startTime);

          gain.gain.setValueAtTime(0, startTime);
          gain.gain.linearRampToValueAtTime(0.35, startTime + 0.02);
          gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.5);

          osc.connect(gain);
          gain.connect(masterGain);

          osc.start(startTime);
          osc.stop(startTime + 0.55);
        });
      } else if (type === 'urgent') {
        // Urgent alert: Rapid pulsing dual-tone
        const notes = [880, 1174.66, 880, 1174.66];
        notes.forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          const startTime = now + idx * 0.14;
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(freq, startTime);

          gain.gain.setValueAtTime(0, startTime);
          gain.gain.linearRampToValueAtTime(0.4, startTime + 0.02);
          gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.35);

          osc.connect(gain);
          gain.connect(masterGain);

          osc.start(startTime);
          osc.stop(startTime + 0.4);
        });
      } else if (type === 'pre_azan') {
        // Meditative gentle harmonic chime: E4, B4, E5
        const notes = [329.63, 493.88, 659.25];
        notes.forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          const startTime = now + idx * 0.22;
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, startTime);

          gain.gain.setValueAtTime(0, startTime);
          gain.gain.linearRampToValueAtTime(0.28, startTime + 0.08);
          gain.gain.exponentialRampToValueAtTime(0.001, startTime + 1.2);

          osc.connect(gain);
          gain.connect(masterGain);

          osc.start(startTime);
          osc.stop(startTime + 1.3);
        });
      } else if (type === 'success') {
        // Celebratory bright major chord
        const notes = [440, 554.37, 659.25, 880];
        notes.forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          const startTime = now + idx * 0.09;
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, startTime);

          gain.gain.setValueAtTime(0, startTime);
          gain.gain.linearRampToValueAtTime(0.3, startTime + 0.02);
          gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.6);

          osc.connect(gain);
          gain.connect(masterGain);

          osc.start(startTime);
          osc.stop(startTime + 0.65);
        });
      }
    } catch (err) {
      console.warn('Web Audio error:', err);
    }
  }

  /**
   * Available Arabic Speech Voices
   */
  public getArabicVoices(): SpeechSynthesisVoice[] {
    if (typeof window === 'undefined' || !window.speechSynthesis) return [];
    const voices = window.speechSynthesis.getVoices();
    return voices.filter(
      (v) =>
        v.lang.toLowerCase().startsWith('ar') ||
        v.name.toLowerCase().includes('arabic') ||
        v.name.toLowerCase().includes('hoda') ||
        v.name.toLowerCase().includes('naayf') ||
        v.name.toLowerCase().includes('tarik') ||
        v.name.toLowerCase().includes('maged') ||
        v.name.toLowerCase().includes('salma') ||
        v.name.toLowerCase().includes('layla')
    );
  }

  /**
   * Speak Arabic text with Text-to-Speech
   */
  public speak(
    text: string,
    options: {
      volume?: number;
      rate?: number;
      pitch?: number;
      voiceURI?: string;
      onEnd?: () => void;
    } = {}
  ): void {
    if (typeof window === 'undefined' || !window.speechSynthesis) {
      options.onEnd?.();
      return;
    }

    // Cancel current speech if any
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'ar-SA';
    utterance.volume = options.volume ?? 1;
    utterance.rate = options.rate ?? 0.95;
    utterance.pitch = options.pitch ?? 1.0;

    const voices = window.speechSynthesis.getVoices();
    if (options.voiceURI) {
      const selectedVoice = voices.find((v) => v.voiceURI === options.voiceURI);
      if (selectedVoice) utterance.voice = selectedVoice;
    }

    if (!utterance.voice) {
      const arVoices = this.getArabicVoices();
      if (arVoices.length > 0) {
        const preferred = arVoices.find(
          (v) =>
            v.name.includes('Natural') ||
            v.name.includes('Online') ||
            v.name.includes('Neural') ||
            v.name.includes('Hoda') ||
            v.name.includes('Naayf') ||
            v.name.includes('Maged')
        );
        utterance.voice = preferred || arVoices[0];
      }
    }

    utterance.onstart = () => {
      this.notifySpeaking(true);
    };

    utterance.onend = () => {
      this.notifySpeaking(false);
      options.onEnd?.();
    };

    utterance.onerror = () => {
      this.notifySpeaking(false);
      options.onEnd?.();
    };

    window.speechSynthesis.speak(utterance);
  }

  /**
   * Play crystal clear dedicated Arabic audio for "يا دكتور عبد العزيز"
   */
  public playDoctorCall(volume: number = 0.95, onEnd?: () => void): void {
    this.playAudioFile('/audio/dr_abdelaziz_call.mp3', volume, onEnd);
  }

  /**
   * Play crystal clear welcome demo for Dr. Abdelaziz
   */
  public playDoctorWelcome(volume: number = 0.95, onEnd?: () => void): void {
    this.playAudioFile('/audio/dr_abdelaziz_welcome.mp3', volume, onEnd);
  }

  /**
   * Play crystal clear task alert for Dr. Abdelaziz
   */
  public playDoctorTaskAlert(volume: number = 0.95, onEnd?: () => void): void {
    this.playAudioFile('/audio/dr_abdelaziz_task_alert.mp3', volume, onEnd);
  }

  /**
   * Play crystal clear clinic alert for Dr. Abdelaziz
   */
  public playDoctorClinicAlert(volume: number = 0.95, onEnd?: () => void): void {
    this.playAudioFile('/audio/dr_abdelaziz_clinic_alert.mp3', volume, onEnd);
  }

  /**
   * Play crystal clear pre-Azan alert for Dr. Abdelaziz
   */
  public playDoctorPreAzan(volume: number = 0.95, onEnd?: () => void): void {
    this.playAudioFile('/audio/dr_abdelaziz_pre_azan.mp3', volume, onEnd);
  }

  private playAudioFile(url: string, volume: number = 0.95, onEnd?: () => void): void {
    if (typeof window === 'undefined') {
      onEnd?.();
      return;
    }
    this.stopAll();
    this.initAudioContext();

    const audio = new Audio(url);
    audio.volume = Math.max(0, Math.min(1, volume));
    this.currentCustomAudio = audio;

    audio.onplay = () => {
      this.notifySpeaking(true);
    };

    audio.onended = () => {
      this.notifySpeaking(false);
      if (this.currentCustomAudio === audio) {
        this.currentCustomAudio = null;
      }
      onEnd?.();
    };

    audio.onerror = (e) => {
      console.warn('Playback error for', url, e);
      this.notifySpeaking(false);
      if (this.currentCustomAudio === audio) {
        this.currentCustomAudio = null;
      }
      onEnd?.();
    };

    audio.play().catch((err) => {
      console.warn('Audio play blocked:', err);
      this.notifySpeaking(false);
      onEnd?.();
    });
  }

  /**
   * Speak Alert with guaranteed crystal-clear personal prefix: "يا دكتور عبد العزيز"
   */
  public speakAlert(
    text: string,
    options: {
      volume?: number;
      rate?: number;
      pitch?: number;
      voiceURI?: string;
      onEnd?: () => void;
    } = {}
  ): void {
    const clean = text.trim();

    // 1. If it's a welcome or readiness test, play full crystal-clear studio welcome
    if (
      clean.includes('جميع أنظمة التنبيه') ||
      clean.includes('تأكيد الجاهزية') ||
      clean.includes('مرحباً بك') ||
      clean === 'يا دكتور عبد العزيز'
    ) {
      this.playDoctorWelcome(options.volume ?? 0.95, options.onEnd);
      return;
    }

    // 2. If it's a clinic task, play dedicated clinic audio
    if (clean.includes('عيادة') || clean.includes('كشف') || clean.includes('مرضى')) {
      this.playDoctorClinicAlert(options.volume ?? 0.95, options.onEnd);
      return;
    }

    // 3. If it's a pre-azan reminder
    if (clean.includes('اقترب موعد الأذان') || clean.includes('الاستعداد للصلاة')) {
      this.playDoctorPreAzan(options.volume ?? 0.95, options.onEnd);
      return;
    }

    // 4. For any other alert: ALWAYS play the studio audio "يا دكتور عبد العزيز" first!
    this.playDoctorCall(options.volume ?? 0.95, () => {
      // Strip any duplicate "يا دكتور عبد العزيز" from the remaining text
      const remainder = clean
        .replace(/^(يا\s+)?دكتور\s+عبد\s*العزيز[،,\.\s]*/i, '')
        .trim();

      if (!remainder) {
        options.onEnd?.();
        return;
      }

      // Speak the remainder text
      this.speak(remainder, options);
    });
  }

  /**
   * Stop any current speech or audio
   */
  public stopAll(): void {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    this.notifySpeaking(false);

    if (this.currentAzanAudio) {
      this.currentAzanAudio.pause();
      this.currentAzanAudio.currentTime = 0;
      this.currentAzanAudio = null;
    }

    if (this.currentCustomAudio) {
      this.currentCustomAudio.pause();
      this.currentCustomAudio.currentTime = 0;
      this.currentCustomAudio = null;
    }
  }

  /**
   * Play any custom audio file (URL or Blob)
   */
  public async playCustomAudio(
    audioSource: string | Blob,
    volume: number = 0.9,
    onEnded?: () => void
  ): Promise<HTMLAudioElement | null> {
    if (typeof window === 'undefined') return null;

    this.stopAll();
    this.initAudioContext();

    try {
      const src = typeof audioSource === 'string' ? audioSource : URL.createObjectURL(audioSource);
      const audio = new Audio(src);
      audio.volume = Math.max(0, Math.min(1, volume));

      this.currentCustomAudio = audio;

      audio.onplay = () => {
        this.notifySpeaking(true);
      };

      audio.onended = () => {
        this.notifySpeaking(false);
        if (this.currentCustomAudio === audio) {
          this.currentCustomAudio = null;
        }
        if (typeof audioSource !== 'string') {
          URL.revokeObjectURL(src);
        }
        onEnded?.();
      };

      audio.onerror = (e) => {
        console.warn('Custom audio playback error:', e);
        this.notifySpeaking(false);
        if (this.currentCustomAudio === audio) {
          this.currentCustomAudio = null;
        }
        if (typeof audioSource !== 'string') {
          URL.revokeObjectURL(src);
        }
        onEnded?.();
      };

      await audio.play();
      return audio;
    } catch (err) {
      console.warn('Failed to start custom audio playback:', err);
      this.notifySpeaking(false);
      onEnded?.();
      return null;
    }
  }

  /**
   * Play Azan Audio with robust local file priority, remote fallbacks, and custom audio support
   */
  public playAzan(
    reciter: 'takbeerat' | 'mishary' | 'abdulbasit' | 'makkah' | 'custom' = 'mishary',
    volume: number = 0.9,
    onEnded?: () => void,
    customAudioSource?: string | Blob | null
  ): Promise<boolean> {
    return new Promise((resolve) => {
      this.stopAll();
      this.initAudioContext();

      if (reciter === 'custom' && customAudioSource) {
        this.playCustomAudio(customAudioSource, volume, () => {
          onEnded?.();
          resolve(true);
        }).then((audio) => {
          if (!audio) {
            // fallback to mishary if custom failed
            this.playAzan('mishary', volume, onEnded).then(resolve);
          }
        });
        return;
      }

      // Priority 1: Local bundled files (instant, 100% offline, zero latency)
      // Priority 2: Direct verified Internet Archive CDN
      const audioSources: Record<string, string[]> = {
        mishary: [
          '/audio/mishary.mp3',
          'https://archive.org/download/Mp3CollectionAdzan/A%20Very%20Beautiful%20Adzan%20by%20Mishary%20Al%20Afasy.mp3',
        ],
        makkah: [
          '/audio/makkah.mp3',
          'https://archive.org/download/Mp3CollectionAdzan/Adzan%20%28%20Makkah%20%29.mp3',
        ],
        abdulbasit: [
          '/audio/abdulbasit.mp3',
          'https://archive.org/download/Mp3CollectionAdzan/Adzan%20%28%20Mesir%20%29.mp3',
        ],
        takbeerat: [
          '/audio/takbeerat.mp3',
          '/audio/mishary.mp3',
        ],
      };

      const sources = audioSources[reciter] || audioSources.mishary;
      let sourceIndex = 0;

      const audio = new Audio();
      audio.volume = Math.max(0, Math.min(1, volume));

      const tryPlaySource = () => {
        if (sourceIndex >= sources.length) {
          console.warn('All audio sources exhausted, falling back to synthesizer.');
          this.playFallbackAzanChime(volume, onEnded);
          resolve(false);
          return;
        }

        const currentSrc = sources[sourceIndex];
        audio.src = currentSrc;
        audio.load();

        audio
          .play()
          .then(() => {
            this.notifySpeaking(true);
            resolve(true);
          })
          .catch((err) => {
            console.warn(`Audio play failed for ${currentSrc}:`, err);
            sourceIndex++;
            tryPlaySource();
          });
      };

      audio.onplay = () => {
        this.notifySpeaking(true);
      };

      audio.onended = () => {
        this.notifySpeaking(false);
        this.currentAzanAudio = null;
        onEnded?.();
        resolve(true);
      };

      audio.onerror = (e) => {
        console.warn(`Audio error on source ${sources[sourceIndex]}:`, e);
        sourceIndex++;
        tryPlaySource();
      };

      this.currentAzanAudio = audio;
      tryPlaySource();
    });
  }

  /**
   * Fallback if audio file cannot be played: Synthesize alert + recite Takbeerat via TTS
   */
  private playFallbackAzanChime(volume: number, onEnded?: () => void) {
    this.playChime('pre_azan', volume);
    setTimeout(() => {
      this.speak(
        'الله أكبر، الله أكبر. الله أكبر، الله أكبر. أشهد أن لا إله إلا الله، أشهد أن محمداً رسول الله. حان الآن موعد الأذان.',
        {
          volume,
          onEnd: onEnded,
        }
      );
    }, 1200);
  }
}

export const audioService = new AudioService();
