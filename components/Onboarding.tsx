'use client';

import { useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { PressableButton } from '@/components/motion/Pressable';
import { Stagger, StaggerItem } from '@/components/motion/Stagger';

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
        background:     'var(--background)',
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
        <PressableButton
          onClick={finish}
          style={{
            background:   'rgb(var(--muted-foreground-rgb) / 0.1)',
            border:       'none',
            borderRadius: 20,
            padding:      '7px 16px',
            fontSize:     13,
            fontWeight:   600,
            color:        'var(--muted-foreground)',
            cursor:       'pointer',
            fontFamily:   'inherit',
          }}
        >
          Пропустить
        </PressableButton>
      </div>

      {/* Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={animKey}
          initial={{ opacity: 0, x: 24 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -24 }}
          transition={{ duration: 0.28, ease: [0.32, 0.72, 0, 1] }}
          style={{
            flex:           1,
            display:        'flex',
            flexDirection:  'column',
            alignItems:     'center',
            justifyContent: 'center',
            padding:        '0 36px',
            gap:            28,
            textAlign:      'center',
          }}
        >
          {/* Illustration */}
          <motion.div
            initial={{ scale: 0.7, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 300, damping: 20, delay: 0.05 }}
            style={{
              width:        104,
              height:       104,
              borderRadius: 32,
              background:   'linear-gradient(145deg, #fff 0%, rgb(var(--primary-rgb) / 10%) 100%)',
              border:       '1.5px solid rgb(var(--primary-soft-rgb) / 0.15)',
              display:      'flex',
              alignItems:   'center',
              justifyContent: 'center',
              fontSize:     56,
              boxShadow:    '0 8px 32px rgb(var(--primary-soft-rgb) / 0.12)',
            }}
          >
            {s.emoji}
          </motion.div>

          {/* Text */}
          <div style={{ maxWidth: 280 }}>
            <p
              className="font-display"
              style={{
                fontSize:      24,
                fontWeight:    600,
                color:         'var(--foreground)',
                margin:        '0 0 14px',
                letterSpacing: '-0.02em',
                lineHeight:    1.2,
              }}
            >
              {s.title}
            </p>
            {s.desc && (
              <p style={{ fontSize: 15, color: 'var(--muted-foreground)', margin: 0, lineHeight: 1.65 }}>
                {s.desc}
              </p>
            )}
            {s.steps && (
              <Stagger style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 4 }}>
                {s.steps.map((step, i) => (
                  <StaggerItem
                    key={step}
                    style={{
                      display:       'flex',
                      alignItems:    'center',
                      gap:           12,
                      background:    'var(--card)',
                      borderRadius:  14,
                      padding:       '13px 16px',
                      border:        '1px solid rgb(var(--foreground-rgb) / 0.1)',
                      boxShadow:     '0 2px 8px rgb(var(--foreground-rgb) / 0.05)',
                      textAlign:     'left',
                    }}
                  >
                    <div
                      style={{
                        width:          28,
                        height:         28,
                        borderRadius:   '50%',
                        background:     'var(--primary)',
                        color:          'var(--card)',
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
                    <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--foreground)' }}>
                      {step}
                    </span>
                  </StaggerItem>
                ))}
              </Stagger>
            )}
          </div>
        </motion.div>
      </AnimatePresence>

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
            <motion.button
              key={i}
              onClick={() => goTo(i)}
              aria-label={`Слайд ${i + 1}`}
              animate={{
                width: i === slide ? 24 : 8,
                background: i === slide ? 'var(--primary)' : 'rgb(var(--muted-foreground-rgb) / 0.22)',
              }}
              transition={{ type: 'spring', stiffness: 420, damping: 34 }}
              style={{ height: 8, borderRadius: 4, border: 'none', cursor: 'pointer', padding: 0 }}
            />
          ))}
        </div>

        {/* CTA */}
        <PressableButton
          onClick={next}
          style={{
            width:         '100%',
            background:    'var(--primary)',
            color:         'var(--card)',
            border:        'none',
            borderRadius:  14,
            padding:       '16px',
            fontSize:      16,
            fontWeight:    700,
            cursor:        'pointer',
            fontFamily:    'inherit',
            letterSpacing: '-0.01em',
            boxShadow:     '0 8px 24px rgb(var(--primary-soft-rgb) / 0.35)',
          }}
        >
          {slide === SLIDES.length - 1 ? 'Начать' : 'Далее →'}
        </PressableButton>
      </div>
    </div>
  );
}
