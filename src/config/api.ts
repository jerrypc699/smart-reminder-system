import { Capacitor } from '@capacitor/core';

export const REMOTE_API_ORIGIN = 'https://smart-reminder-system-nu.vercel.app';

export function getApiUrl(path: string): string {
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  if (Capacitor.isNativePlatform()) {
    return `${REMOTE_API_ORIGIN}${cleanPath}`;
  }
  if (typeof window !== 'undefined') {
    const origin = window.location.origin;
    if (
      origin.includes('localhost') || 
      origin.includes('127.0.0.1') || 
      origin.startsWith('capacitor://') || 
      origin.startsWith('file://')
    ) {
      return `${REMOTE_API_ORIGIN}${cleanPath}`;
    }
  }
  return cleanPath;
}

