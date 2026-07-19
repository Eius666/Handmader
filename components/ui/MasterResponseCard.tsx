'use client';

import Image from 'next/image';
import { Star, Clock } from 'lucide-react';
import { OrderResponse } from '@/types';
import { VerifiedBadge } from './VerifiedBadge';

interface Props {
  masterId: string;
  response: OrderResponse;
  onSelect?: () => void;
  isSelecting?: boolean;
  selected?: boolean;
}

export function MasterResponseCard({ masterId, response, onSelect, isSelecting, selected }: Props) {
  return (
    /* Double-bezel */
    <div
      style={{
        background: selected ? 'rgba(74,124,89,0.06)' : 'rgba(180,100,70,0.04)',
        border: selected ? '1px solid rgba(74,124,89,0.15)' : '1px solid rgba(180,100,70,0.08)',
        borderRadius: 22,
        padding: 4,
      }}
    >
      <article
        className="flex gap-3"
        style={{
          background: '#ffffff',
          borderRadius: 18,
          padding: '14px',
          boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.9)',
        }}
      >
        {/* Avatar */}
        <div
          className="relative size-[50px] shrink-0 overflow-hidden rounded-full"
          style={{ background: 'rgba(217,108,82,0.1)', border: '2px solid rgba(217,108,82,0.12)' }}
        >
          {response.masterPhoto ? (
            <Image
              src={response.masterPhoto}
              alt={`Фото мастера ${response.masterName}`}
              fill
              sizes="50px"
              className="object-cover"
            />
          ) : (
            <div className="flex size-full items-center justify-center text-[18px] font-bold text-primary">
              {response.masterName?.[0]?.toUpperCase() ?? '?'}
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="truncate text-[14px] font-bold tracking-[-0.01em] text-foreground">
                  {response.masterName}
                </h3>
                {response.masterVerified && <VerifiedBadge size="sm" />}
              </div>
              <span className="inline-flex items-center gap-1 text-[12px] font-semibold" style={{ color: '#c87c3e' }}>
                <Star className="size-3.5 fill-current" aria-hidden="true" />
                {response.masterRating > 0 ? response.masterRating.toFixed(1) : '—'}
              </span>
              {(response.masterCompletedOrders ?? 0) > 0 && (
                <span className="text-[11px] font-medium text-muted-foreground">
                  {' · '}{response.masterCompletedOrders} завершено
                </span>
              )}
            </div>
            <div className="flex flex-col items-end shrink-0">
              <span className="text-[17px] font-extrabold tracking-[-0.02em] text-foreground">
                {response.price.toLocaleString('ru-RU')} ₽
              </span>
              <span className="inline-flex items-center gap-1 text-[11px] font-medium text-muted-foreground">
                <Clock className="size-3" aria-hidden="true" />
                {response.timeline}
              </span>
            </div>
          </div>

          {response.comment && (
            <p className="text-[12px] leading-relaxed text-muted-foreground">{response.comment}</p>
          )}

          {/* Portfolio thumbnails */}
          {response.portfolioPhotos && response.portfolioPhotos.length > 0 && (
            <div className="flex gap-2">
              {response.portfolioPhotos.slice(0, 3).map((src, idx) => (
                <div
                  key={idx}
                  className="relative size-14 overflow-hidden rounded-xl"
                  style={{ background: 'rgba(217,108,82,0.08)' }}
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
              className="mt-1 w-full rounded-xl py-2.5 text-[13px] font-bold text-white transition-all duration-200 active:scale-[0.98] disabled:opacity-60"
              style={{
                background: '#d96c52',
                boxShadow: '0 4px 12px rgba(217,108,82,0.3)',
              }}
            >
              {isSelecting ? 'Выбираем...' : 'Выбрать мастера'}
            </button>
          )}

          {selected && (
            <div
              className="mt-1 flex items-center justify-center gap-2 rounded-xl py-2.5 text-[13px] font-bold"
              style={{ background: 'rgba(74,124,89,0.12)', color: '#4a7c59' }}
            >
              ✓ Выбран
            </div>
          )}
        </div>
      </article>
    </div>
  );
}
