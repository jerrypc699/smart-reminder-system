import { Coordinates, CalculationMethod, PrayerTimes, Madhab, Qibla } from 'adhan';
import { PrayerInfo, PrayerId, PrayerSettings, CityPreset } from '../types';

export const CITY_PRESETS: CityPreset[] = [
  // Egypt
  { name: 'القاهرة', country: 'مصر', latitude: 30.0444, longitude: 31.2357, method: 'Egyptian' },
  { name: 'الإسكندرية', country: 'مصر', latitude: 31.2001, longitude: 29.9187, method: 'Egyptian' },
  { name: 'الجيزة', country: 'مصر', latitude: 30.0131, longitude: 31.2089, method: 'Egyptian' },
  { name: 'المنصورة', country: 'مصر', latitude: 31.0409, longitude: 31.3785, method: 'Egyptian' },
  { name: 'أسيوط', country: 'مصر', latitude: 27.1809, longitude: 31.1837, method: 'Egyptian' },
  
  // Saudi Arabia
  { name: 'مكة المكرمة', country: 'السعودية', latitude: 21.4225, longitude: 39.8262, method: 'UmmAlQura' },
  { name: 'المدينة المنورة', country: 'السعودية', latitude: 24.4686, longitude: 39.6142, method: 'UmmAlQura' },
  { name: 'الرياض', country: 'السعودية', latitude: 24.7136, longitude: 46.6753, method: 'UmmAlQura' },
  { name: 'جدة', country: 'السعودية', latitude: 21.4858, longitude: 39.1925, method: 'UmmAlQura' },
  { name: 'الدمام', country: 'السعودية', latitude: 26.4207, longitude: 50.0888, method: 'UmmAlQura' },

  // UAE
  { name: 'دبي', country: 'الإمارات', latitude: 25.2048, longitude: 55.2708, method: 'Dubai' },
  { name: 'أبو ظبي', country: 'الإمارات', latitude: 24.4539, longitude: 54.3773, method: 'Dubai' },
  { name: 'الشارقة', country: 'الإمارات', latitude: 25.3573, longitude: 55.4033, method: 'Dubai' },

  // GCC & Levant
  { name: 'الدوحة', country: 'قطر', latitude: 25.2854, longitude: 51.531, method: 'Qatar' },
  { name: 'مدينة الكويت', country: 'الكويت', latitude: 29.3759, longitude: 47.9774, method: 'Kuwait' },
  { name: 'المنامة', country: 'البحرين', latitude: 26.2285, longitude: 50.586, method: 'UmmAlQura' },
  { name: 'مسقط', country: 'سلطنة عمان', latitude: 23.5859, longitude: 58.4059, method: 'MuslimWorldLeague' },
  { name: 'عمان', country: 'الأردن', latitude: 31.9454, longitude: 35.9284, method: 'MuslimWorldLeague' },
  { name: 'القدس الشريف', country: 'فلسطين', latitude: 31.7683, longitude: 35.2137, method: 'Egyptian' },
  { name: 'بيروت', country: 'لبنان', latitude: 33.8938, longitude: 35.5018, method: 'MuslimWorldLeague' },
  { name: 'دمشق', country: 'سوريا', latitude: 33.5138, longitude: 36.2765, method: 'MuslimWorldLeague' },
  { name: 'بغداد', country: 'العراق', latitude: 33.3152, longitude: 44.3661, method: 'MuslimWorldLeague' },

  // North Africa
  { name: 'الخرطوم', country: 'السودان', latitude: 15.5007, longitude: 32.5599, method: 'Egyptian' },
  { name: 'طرابلس', country: 'ليبيا', latitude: 32.8872, longitude: 13.1913, method: 'MuslimWorldLeague' },
  { name: 'تونس', country: 'تونس', latitude: 36.8065, longitude: 10.1815, method: 'MuslimWorldLeague' },
  { name: 'الجزائر', country: 'الجزائر', latitude: 36.7538, longitude: 3.0588, method: 'MuslimWorldLeague' },
  { name: 'الرباط', country: 'المغرب', latitude: 34.0209, longitude: -6.8416, method: 'MuslimWorldLeague' },

  // International
  { name: 'إسطنبول', country: 'تركيا', latitude: 41.0082, longitude: 28.9784, method: 'MuslimWorldLeague' },
  { name: 'لندن', country: 'بريطانيا', latitude: 51.5074, longitude: -0.1278, method: 'MuslimWorldLeague' },
  { name: 'نيويورك', country: 'أمريكا', latitude: 40.7128, longitude: -74.006, method: 'NorthAmerica' },
];

export const DEFAULT_PRAYER_SETTINGS: PrayerSettings = {
  cityName: 'القاهرة',
  countryName: 'مصر',
  latitude: 30.0444,
  longitude: 31.2357,
  method: 'Egyptian',
  madhab: 'shafi',
  preAzanReminderMinutes: 10,
  enablePreAzanAlert: true,
  enableAzanAudio: true,
  azanReciter: 'mishary',
  enableDuaaAfterAzan: true,
};

export class PrayerService {
  /**
   * Get Prayer Calculation Parameters based on settings
   */
  private getParameters(settings: PrayerSettings) {
    let params;
    switch (settings.method) {
      case 'Egyptian':
        params = CalculationMethod.Egyptian();
        break;
      case 'UmmAlQura':
        params = CalculationMethod.UmmAlQura();
        break;
      case 'Dubai':
        params = CalculationMethod.Dubai();
        break;
      case 'Qatar':
        params = CalculationMethod.Qatar();
        break;
      case 'Kuwait':
        params = CalculationMethod.Kuwait();
        break;
      case 'NorthAmerica':
        params = CalculationMethod.NorthAmerica();
        break;
      case 'Karachi':
        params = CalculationMethod.Karachi();
        break;
      case 'MuslimWorldLeague':
      default:
        params = CalculationMethod.MuslimWorldLeague();
        break;
    }

    if (settings.madhab === 'hanafi') {
      params.madhab = Madhab.Hanafi;
    } else {
      params.madhab = Madhab.Shafi;
    }

    return params;
  }

  /**
   * Calculate prayer times for today
   */
  public getPrayerTimes(date: Date = new Date(), settings: PrayerSettings = DEFAULT_PRAYER_SETTINGS) {
    const coordinates = new Coordinates(settings.latitude, settings.longitude);
    const params = this.getParameters(settings);
    const prayerTimes = new PrayerTimes(coordinates, date, params);

    const now = new Date();

    const prayers: { id: PrayerId; arabicName: string; time: Date }[] = [
      { id: 'fajr', arabicName: 'الفجر', time: prayerTimes.fajr },
      { id: 'sunrise', arabicName: 'الشروق', time: prayerTimes.sunrise },
      { id: 'dhuhr', arabicName: 'الظهر', time: prayerTimes.dhuhr },
      { id: 'asr', arabicName: 'العصر', time: prayerTimes.asr },
      { id: 'maghrib', arabicName: 'المغرب', time: prayerTimes.maghrib },
      { id: 'isha', arabicName: 'العشاء', time: prayerTimes.isha },
    ];

    // Find next prayer
    let nextPrayerIndex = -1;
    for (let i = 0; i < prayers.length; i++) {
      if (prayers[i].time > now) {
        nextPrayerIndex = i;
        break;
      }
    }

    // If all passed today, tomorrow Fajr is next
    let tomorrowFajr: Date | null = null;
    if (nextPrayerIndex === -1) {
      const tomorrow = new Date(date);
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowPrayerTimes = new PrayerTimes(coordinates, tomorrow, params);
      tomorrowFajr = tomorrowPrayerTimes.fajr;
    }

    const prayerInfos: PrayerInfo[] = prayers.map((p, index) => {
      const isPassed = p.time <= now;
      const isNext = index === nextPrayerIndex;
      return {
        id: p.id,
        arabicName: p.arabicName,
        time: p.time,
        timeString: this.formatTime24h(p.time),
        formatted12h: this.formatTime12h(p.time),
        isNext,
        isPassed,
      };
    });

    const nextPrayer =
      nextPrayerIndex !== -1
        ? prayerInfos[nextPrayerIndex]
        : {
            id: 'fajr' as PrayerId,
            arabicName: 'الفجر (غداً)',
            time: tomorrowFajr || new Date(),
            timeString: this.formatTime24h(tomorrowFajr || new Date()),
            formatted12h: this.formatTime12h(tomorrowFajr || new Date()),
            isNext: true,
            isPassed: false,
          };

    // Calculate time remaining to next prayer
    const diffMs = Math.max(0, nextPrayer.time.getTime() - now.getTime());
    const totalSeconds = Math.floor(diffMs / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    return {
      prayers: prayerInfos,
      nextPrayer,
      remaining: {
        hours,
        minutes,
        seconds,
        totalSeconds,
        formatted: `${this.pad(hours)}:${this.pad(minutes)}:${this.pad(seconds)}`,
      },
      qiblaDirection: Math.round(Qibla(coordinates)),
    };
  }

  /**
   * Format Hijri Date
   */
  public getHijriDate(date: Date = new Date()): string {
    try {
      const formatter = new Intl.DateTimeFormat('ar-SA-u-ca-islamic-umalqura', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      });
      return formatter.format(date);
    } catch {
      // Fallback
      return date.toLocaleDateString('ar-EG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    }
  }

  /**
   * Format Gregorian Date in Arabic
   */
  public getGregorianDate(date: Date = new Date()): string {
    return date.toLocaleDateString('ar-EG', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  }

  public formatTime12h(date: Date): string {
    let hours = date.getHours();
    const minutes = date.getMinutes();
    const isPm = hours >= 12;
    hours = hours % 12;
    if (hours === 0) hours = 12;
    const period = isPm ? 'م' : 'ص';
    return `${this.pad(hours)}:${this.pad(minutes)} ${period}`;
  }

  public formatTime24h(date: Date): string {
    return `${this.pad(date.getHours())}:${this.pad(date.getMinutes())}`;
  }

  private pad(n: number): string {
    return n < 10 ? `0${n}` : `${n}`;
  }
}

export const prayerService = new PrayerService();
