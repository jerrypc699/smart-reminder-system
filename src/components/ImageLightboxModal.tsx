import React from 'react';
import { Download, X } from 'lucide-react';

interface ImageLightboxModalProps {
  image: { url: string; title: string } | null;
  onClose: () => void;
}

export const ImageLightboxModal: React.FC<ImageLightboxModalProps> = ({ image, onClose }) => {
  if (!image) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-3xl bg-slate-900 border border-slate-700 rounded-3xl p-4 shadow-2xl space-y-3">
        <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
          <span className="text-sm font-bold text-white truncate">{image.title}</span>
          <div className="flex items-center gap-2">
            <a
              href={image.url}
              download={image.title}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-emerald-400 cursor-pointer"
              title="تحميل الصورة"
            >
              <Download className="w-4 h-4" />
            </a>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
        <div className="max-h-[75vh] overflow-auto flex items-center justify-center bg-black rounded-2xl p-2">
          <img
            src={image.url}
            alt={image.title}
            className="max-w-full max-h-[70vh] object-contain rounded-xl"
          />
        </div>
      </div>
    </div>
  );
};

