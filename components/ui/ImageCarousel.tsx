'use client';

import { useState, useRef } from 'react';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';

interface Props {
  photos: string[];
  height?: string;
  showFullscreen?: boolean;
}

function useSwipeHandlers(
  onSwipeLeft: () => void,
  onSwipeRight: () => void,
  onSwipeDown?: () => void,
) {
  const startX = useRef(0);
  const startY = useRef(0);

  return {
    onTouchStart(e: React.TouchEvent) {
      startX.current = e.touches[0].clientX;
      startY.current = e.touches[0].clientY;
    },
    onTouchEnd(e: React.TouchEvent) {
      const dx = e.changedTouches[0].clientX - startX.current;
      const dy = e.changedTouches[0].clientY - startY.current;
      if (onSwipeDown && dy > 80 && Math.abs(dy) > Math.abs(dx)) {
        onSwipeDown();
        return;
      }
      if (Math.abs(dx) < 50 || Math.abs(dy) > Math.abs(dx)) return;
      if (dx < 0) onSwipeLeft();
      else onSwipeRight();
    },
  };
}

export function ImageCarousel({ photos, height = 'h-48', showFullscreen = true }: Props) {
  const [idx,   setIdx]   = useState(0);
  const [lbIdx, setLbIdx] = useState<number | null>(null);

  const count = photos?.length ?? 0;

  function clamp(i: number) { return Math.max(0, Math.min(count - 1, i)); }

  const inlineSwipe = useSwipeHandlers(
    () => setIdx((i) => clamp(i + 1)),
    () => setIdx((i) => clamp(i - 1)),
  );

  const lbSwipe = useSwipeHandlers(
    () => setLbIdx((i) => (i !== null ? clamp(i + 1) : null)),
    () => setLbIdx((i) => (i !== null ? clamp(i - 1) : null)),
    () => setLbIdx(null),
  );

  if (count === 0) return null;

  return (
    <>
      {/* ── Inline carousel ─────────────────────────────────── */}
      <div
        className={`relative overflow-hidden rounded-xl ${height} cursor-pointer`}
        {...inlineSwipe}
        onClick={(e) => {
          e.stopPropagation();
          if (showFullscreen) setLbIdx(idx);
        }}
      >
        {photos.map((src, i) => (
          <div
            key={i}
            className="absolute inset-0"
            style={{
              transform: `translateX(${(i - idx) * 100}%)`,
              transition: 'transform 280ms cubic-bezier(0.32,0.72,0,1)',
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={src}
              alt={`Фото ${i + 1}`}
              className="h-full w-full object-cover"
              draggable={false}
            />
          </div>
        ))}

        {/* Count badge */}
        {count > 1 && (
          <span className="absolute right-2 top-2 z-10 rounded-full bg-black/50 px-2 py-0.5 text-[11px] font-bold text-white backdrop-blur-sm select-none">
            {idx + 1}/{count}
          </span>
        )}

        {/* Dot indicators */}
        {count > 1 && (
          <div className="absolute bottom-2 left-0 right-0 z-10 flex justify-center gap-1.5 select-none">
            {photos.map((_, i) => (
              <span
                key={i}
                className="rounded-full transition-all duration-200"
                style={{
                  width:      i === idx ? 14 : 6,
                  height:     6,
                  background: i === idx ? '#C2703E' : 'rgba(255,255,255,0.65)',
                }}
              />
            ))}
          </div>
        )}
      </div>

      {/* ── Lightbox ────────────────────────────────────────── */}
      {lbIdx !== null && (
        <div
          className="fixed inset-0 z-50 flex flex-col bg-black/92"
          {...lbSwipe}
        >
          {/* Top bar */}
          <div className="flex shrink-0 items-center justify-between px-5 pt-12 pb-4 select-none">
            <span className="text-sm font-bold text-white/60">
              {lbIdx + 1} / {count}
            </span>
            <button
              type="button"
              onClick={() => setLbIdx(null)}
              aria-label="Закрыть"
              className="flex size-10 items-center justify-center rounded-full bg-white/15 text-white transition-all active:scale-90"
            >
              <X className="size-5" />
            </button>
          </div>

          {/* Image area */}
          <div className="relative flex-1 overflow-hidden">
            {photos.map((src, i) => (
              <div
                key={i}
                className="absolute inset-0 flex items-center justify-center p-5"
                style={{
                  transform: `translateX(${(i - lbIdx) * 100}%)`,
                  transition: 'transform 280ms cubic-bezier(0.32,0.72,0,1)',
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={src}
                  alt={`Фото ${i + 1}`}
                  className="max-h-full max-w-full rounded-xl object-contain"
                  draggable={false}
                />
              </div>
            ))}

            {/* Desktop arrow — prev */}
            {lbIdx > 0 && (
              <button
                type="button"
                onClick={() => setLbIdx((i) => (i !== null ? clamp(i - 1) : null))}
                className="absolute left-3 top-1/2 -translate-y-1/2 flex size-11 items-center justify-center rounded-full bg-white/15 text-white transition-all active:scale-90 active:bg-white/25"
              >
                <ChevronLeft className="size-5" />
              </button>
            )}

            {/* Desktop arrow — next */}
            {lbIdx < count - 1 && (
              <button
                type="button"
                onClick={() => setLbIdx((i) => (i !== null ? clamp(i + 1) : null))}
                className="absolute right-3 top-1/2 -translate-y-1/2 flex size-11 items-center justify-center rounded-full bg-white/15 text-white transition-all active:scale-90 active:bg-white/25"
              >
                <ChevronRight className="size-5" />
              </button>
            )}
          </div>

          {/* Dot indicators */}
          {count > 1 && (
            <div className="flex shrink-0 justify-center gap-1.5 py-6 select-none">
              {photos.map((_, i) => (
                <span
                  key={i}
                  className="rounded-full transition-all duration-200"
                  style={{
                    width:      i === lbIdx ? 18 : 7,
                    height:     7,
                    background: i === lbIdx ? '#C2703E' : 'rgba(255,255,255,0.35)',
                  }}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </>
  );
}
