'use client';

import Image from 'next/image';
import { Star, Clock } from 'lucide-react';
import { OrderResponse } from '@/types';

interface Props {
  masterId: string;
  response: OrderResponse;
  onSelect?: () => void;
  isSelecting?: boolean;
  selected?: boolean;
}

export function MasterResponseCard({ masterId, response, onSelect, isSelecting, selected }: Props) {
  return (
    <article
      className={`flex gap-3 rounded-2xl border-l-4 bg-card p-4 shadow-[0_4px_20px_rgba(45,45,45,0.06)] ${
        selected ? 'border-status-progress' : 'border-primary'
      }`}
    >
      {/* Avatar */}
      <div className="relative size-[52px] shrink-0 overflow-hidden rounded-full bg-secondary">
        {response.masterPhoto ? (
          <Image
            src={response.masterPhoto}
            alt={`Фото мастера ${response.masterName}`}
            fill
            sizes="52px"
            className="object-cover"
          />
        ) : (
          <div className="flex size-full items-center justify-center text-xl font-bold text-primary">
            {response.masterName?.[0]?.toUpperCase() ?? '?'}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="truncate text-base font-bold text-foreground">{response.masterName}</h3>
            <span className="inline-flex items-center gap-1 text-sm font-semibold text-[#E0A83B]">
              <Star className="size-3.5 fill-current" aria-hidden="true" />
              {response.masterRating > 0 ? response.masterRating.toFixed(1) : '—'}
            </span>
          </div>
          <div className="flex flex-col items-end shrink-0">
            <span className="text-lg font-extrabold text-foreground">
              {response.price.toLocaleString('ru-RU')} ₽
            </span>
            <span className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground">
              <Clock className="size-3" aria-hidden="true" />
              {response.timeline}
            </span>
          </div>
        </div>

        {response.comment && (
          <p className="text-sm leading-relaxed text-muted-foreground">{response.comment}</p>
        )}

        {/* Portfolio thumbnails */}
        {response.portfolioPhotos && response.portfolioPhotos.length > 0 && (
          <div className="flex gap-2">
            {response.portfolioPhotos.slice(0, 3).map((src, idx) => (
              <div
                key={idx}
                className="relative size-14 overflow-hidden rounded-xl bg-secondary"
              >
                <Image
                  src={src}
                  alt={`Работа мастера ${response.masterName} ${idx + 1}`}
                  fill
                  sizes="56px"
                  className="object-cover"
                  onError={() => {}}
                />
              </div>
            ))}
          </div>
        )}

        {onSelect && !selected && (
          <button
            type="button"
            onClick={onSelect}
            disabled={isSelecting}
            className="mt-1 w-full rounded-xl bg-primary py-2.5 text-base font-bold text-primary-foreground shadow-[0_4px_14px_rgba(224,122,95,0.35)] transition-transform active:scale-[0.98] disabled:opacity-60"
          >
            {isSelecting ? 'Выбираем...' : '✓ Выбрать'}
          </button>
        )}

        {selected && (
          <div className="mt-1 flex items-center justify-center gap-2 rounded-xl bg-status-progress/15 py-2.5 text-sm font-bold text-status-progress">
            ✓ Выбран
          </div>
        )}
      </div>
    </article>
  );
}
