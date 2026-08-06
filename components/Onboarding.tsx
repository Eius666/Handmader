'use client';

import { useRef, useState } from 'react';

interface Slide {
  emoji: string;
  title: string;
  desc?: string;
  steps?: string[];
}

const SLIDES: Slide[] = [
  {
    emoji: '🧶',
    title: 'Заказывайте вязаные изделия',
    desc:  'Опишите что хотите — шапку, свитер, игрушку или аксессуар. Лучшие мастера предложат свои варианты.',
  },
  {
    emoji: '🧑‍🎨',
    title: 'Станьте мастером',
    desc:  'Выбирайте интересные заказы, общайтесь с клиентами и зарабатывайте на любимом деле.',
  },
  {
    emoji: '✅',
    title: 'Как это работает',
    steps: ['Создайте заказ', 'Мастер откликается', 'Получите готовое изделие'],
  },
];

export function Onboarding({ onDone }: { onDone: () => void }) {
  const [slide, setSlide]   = useState(0);
  const [animKey, setAnimKey] = useState(0);
  const touchX = useRef<number | null>(null);

  function goTo(idx: number) {
    setSlide(idx);
    setAnimKey((k) => k + 1);
  }

  function next() {
    if (slide < SLIDES.length - 1) goTo(slide + 1);
    else finish();
  }

  function finish() {
    localStorage.setItem('handmader_onboarded', '1');
    onDone();
  }

  function onTouchStart(e: React.TouchEvent) {
    touchX.current = e.touches[0].clientX;
  }
  function onTouchEnd(e: React.TouchEvent) {
    if (touchX.current === null) return;
    const dx = e.changedTouches[0].clientX - touchX.current;
    if (dx < -50 && slide < SLIDES.length - 1) goTo(slide + 1);
    if (dx >  50 && slide > 0)                 goTo(slide - 1);
    touchX.current = null;
  }

  const s = SLIDES[slide];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Знакомство с приложением"
      style={{
        position:       'fixed',
        inset:          0,
        zIndex:         8000,
        background:     '#FFF8F0',
        display:        'flex',
        flexDirection:  'column',
        userSelect:     'none',
        WebkitUserSelect: 'none',
      }}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      {/* Skip */}
      <div style={{ position: 'absolute', top: 20, right: 20, zIndex: 1 }}>
        <button
          onClick={finish}
          style={{
            background:   'rgb(var(--muted-foreground-rgb) / 0.1)',
            border:       'none',
            borderRadius: 20,
            padding:      '7px 16px',
            fontSize:     13,
            fontWeight:   600,
            color:        '#78716c',
            cursor:       'pointer',
            fontFamily:   'inherit',
          }}
        >
          Пропустить
        </button>
      </div>

      {/* Content */}
      <div
        key={animKey}
        style={{
          flex:           1,
          display:        'flex',
          flexDirection:  'column',
          alignItems:     'center',
          justifyContent: 'center',
          padding:        '0 36px',
          gap:            28,
          textAlign:      'center',
          animation:      'fade-up 0.22s ease-out both',
        }}
      >
        {/* Illustration */}
        <div
          style={{
            width:        104,
            height:       104,
            borderRadius: 32,
            background:   'linear-gradient(145deg, #fff 0%, #ffeedd 100%)',
            border:       '1.5px solid rgb(var(--primary-soft-rgb) / 0.15)',
            display:      'flex',
            alignItems:   'center',
            justifyContent: 'center',
            fontSize:     56,
            boxShadow:    '0 8px 32px rgb(var(--primary-soft-rgb) / 0.12)',
          }}
        >
          {s.emoji}
        </div>

        {/* Text */}
        <div style={{ maxWidth: 280 }}>
          <p
            style={{
              fontSize:      24,
              fontWeight:    800,
              color:         '#1c1917',
              margin:        '0 0 14px',
              letterSpacing: '-0.03em',
              lineHeight:    1.2,
            }}
          >
            {s.title}
          </p>
          {s.desc && (
            <p style={{ fontSize: 15, color: '#78716c', margin: 0, lineHeight: 1.65 }}>
              {s.desc}
            </p>
          )}
          {s.steps && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 4 }}>
              {s.steps.map((step, i) => (
                <div
                  key={step}
                  style={{
                    display:       'flex',
                    alignItems:    'center',
                    gap:           12,
                    background:    '#ffffff',
                    borderRadius:  14,
                    padding:       '13px 16px',
                    border:        '1px solid rgb(var(--foreground-rgb) / 0.1)',
                    boxShadow:     '0 2px 8px rgb(var(--foreground-rgb) / 0.05)',
                    textAlign:     'left',
                    animation:     `fade-up 0.22s ease-out ${i * 60}ms both`,
                  }}
                >
                  <div
                    style={{
                      width:          28,
                      height:         28,
                      borderRadius:   '50%',
                      background:     'var(--primary)',
                      color:          '#fff',
                      display:        'flex',
                      alignItems:     'center',
                      justifyContent: 'center',
                      fontSize:       13,
                      fontWeight:     800,
                      flexShrink:     0,
                    }}
                  >
                    {i + 1}
                  </div>
                  <span style={{ fontSize: 14, fontWeight: 600, color: '#1c1917' }}>
                    {step}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Bottom nav */}
      <div
        style={{
          padding:       '24px 32px',
          paddingBottom: 'calc(24px + env(safe-area-inset-bottom))',
        }}
      >
        {/* Dots */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginBottom: 20 }}>
          {SLIDES.map((_, i) => (
            <button
              key={i}
              onClick={() => goTo(i)}
              aria-label={`Слайд ${i + 1}`}
              style={{
                width:        i === slide ? 24 : 8,
                height:       8,
                borderRadius: 4,
                background:   i === slide ? 'var(--primary)' : 'rgb(var(--muted-foreground-rgb) / 0.22)',
                border:       'none',
                cursor:       'pointer',
                padding:      0,
                transition:   'all 0.3s cubic-bezier(0.32, 0.72, 0, 1)',
              }}
            />
          ))}
        </div>

        {/* CTA */}
        <button
          onClick={next}
          style={{
            width:         '100%',
            background:    'var(--primary)',
            color:         '#fff',
            border:        'none',
            borderRadius:  14,
            padding:       '16px',
            fontSize:      16,
            fontWeight:    700,
            cursor:        'pointer',
            fontFamily:    'inherit',
            letterSpacing: '-0.01em',
            boxShadow:     '0 8px 24px rgb(var(--primary-soft-rgb) / 0.35)',
            transition:    'transform 0.15s ease-out, box-shadow 0.15s ease-out',
          }}
          onMouseDown={(e) => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(0.97)'; }}
          onMouseUp={(e)   => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)'; }}
          onTouchStart={(e) => { e.stopPropagation(); (e.currentTarget as HTMLButtonElement).style.transform = 'scale(0.97)'; }}
          onTouchEnd={(e)   => { e.stopPropagation(); (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)'; }}
        >
          {slide === SLIDES.length - 1 ? 'Начать' : 'Далее →'}
        </button>
      </div>
    </div>
  );
}
