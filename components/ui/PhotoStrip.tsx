'use client';

import { useState } from 'react';
import Image from 'next/image';
import { X } from 'lucide-react';

interface PhotoStripProps {
  photos: string[];
  className?: string;
}

export function PhotoStrip({ photos, className }: PhotoStripProps) {
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);

  if (!photos || photos.length === 0) return null;

  return (
    <>
      <div className={`-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 scrollbar-none${className ? ` ${className}` : ''}`}>
        {photos.map((src, i) => (
          <button
            key={i}
            type="button"
            onClick={(e) => { e.stopPropagation(); setLightboxSrc(src); }}
            className="relative h-20 w-20 shrink-0 overflow-hidden rounded-lg bg-secondary transition-transform active:scale-95"
          >
            <Image
              src={src}
              alt={`Фото ${i + 1}`}
              fill
              sizes="80px"
              className="object-cover"
              onError={() => {}}
            />
          </button>
        ))}
      </div>

      {lightboxSrc && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          onClick={() => setLightboxSrc(null)}
        >
          <button
            type="button"
            onClick={() => setLightboxSrc(null)}
            aria-label="Закрыть"
            className="absolute right-4 top-4 flex size-10 items-center justify-center rounded-full bg-white/20 text-white"
          >
            <X className="size-5" />
          </button>
          <div
            className="max-h-[85vh] max-w-[90vw] overflow-hidden rounded-2xl bg-black"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={lightboxSrc}
              alt="Фото заказа"
              className="max-h-[85vh] max-w-[90vw] rounded-2xl object-contain"
            />
          </div>
        </div>
      )}
    </>
  );
}
