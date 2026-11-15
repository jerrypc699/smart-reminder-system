import React, { Component, ErrorInfo, ReactNode, StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App';

// Service Worker Management: Only run SW on HTTPS production, unregister on localhost to avoid stale cache
if ('serviceWorker' in navigator) {
  if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    navigator.serviceWorker.getRegistrations().then((registrations) => {
      for (const registration of registrations) {
        registration.unregister();
      }
    });
  } else if (window.location.protocol === 'https:') {
    window.addEventListener('load', () => {
      navigator.serviceWorker
        .register('/sw.js')
        .then((reg) => {
          reg.update();
          console.log('✓ Service Worker active for Dr. Abdelaziz PWA:', reg.scope);
        })
        .catch((err) => {
          console.warn('Service Worker registration warning:', err);
        });
    });
  }
}

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('System Runtime Caught Error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#070B14] text-white flex flex-col items-center justify-center p-6 text-center font-['Cairo']" dir="rtl">
          <div className="w-16 h-16 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center mb-4 text-amber-400 text-3xl">
            ⚠️
          </div>
          <h2 className="text-xl sm:text-2xl font-black mb-2 text-white">
            جاري تهيئة وتحديث نظام د. عبد العزيز
          </h2>
          <p className="text-sm text-slate-300 max-w-md mb-6 leading-relaxed">
            تم تسجيل تحديث جديد. انقر على الزر أدناه لتحديث الذاكرة المؤقتة وتشغيل النظام مباشرة.
          </p>
          <button
            type="button"
            onClick={() => {
              try {
                sessionStorage.clear();
              } catch { }
              window.location.reload();
            }}
            className="px-6 py-3 rounded-xl font-black text-sm bg-gradient-to-r from-[#FFF4CC] via-[#F1D583] to-[#D4AF37] text-[#070B14] shadow-lg cursor-pointer"
          >
            تحديث وفتح النظام الآن ⚡
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

const rootElement = document.getElementById('root');
if (rootElement) {
  createRoot(rootElement).render(
    <StrictMode>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </StrictMode>,
  );
}
