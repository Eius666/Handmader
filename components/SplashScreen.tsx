'use client';

import { useEffect, useState } from 'react';

type Phase = 'enter' | 'visible' | 'exit';

export function SplashScreen({ onDone }: { onDone: () => void }) {
  const [phase, setPhase] = useState<Phase>('enter');

  useEffect(() => {
    // tiny delay so the initial styles are painted before transition starts
    const t0 = setTimeout(() => setPhase('visible'), 30);
    // begin fade-out at 1.5s
    const t1 = setTimeout(() => setPhase('exit'), 1500);
    // notify parent and mark as seen at 2s (after 500ms exit transition)
    const t2 = setTimeout(() => {
      localStorage.setItem('handmader_splash_seen', '1');
      onDone();
    }, 2000);
    return () => { clearTimeout(t0); clearTimeout(t1); clearTimeout(t2); };
  }, [onDone]);

  return (
    <div
      aria-hidden="true"
      style={{
        position:       'fixed',
        inset:          0,
        zIndex:         9000,
        background:     '#FFF8F0',
        display:        'flex',
        flexDirection:  'column',
        alignItems:     'center',
        justifyContent: 'center',
        gap:            20,
        pointerEvents:  'none',
        opacity:    phase === 'visible' ? 1 : 0,
        transform:  phase === 'enter'   ? 'scale(0.92)' : 'scale(1)',
        transition: phase === 'exit'
          ? 'opacity 0.45s ease-out'
          : 'opacity 0.3s ease-out, transform 0.35s cubic-bezier(0.32, 0.72, 0, 1)',
      }}
    >
      {/* Logo mark */}
      <div
        style={{
          width:        88,
          height:       88,
          borderRadius: 26,
          background:   'linear-gradient(145deg, #d96c52 0%, #f2a47e 100%)',
          display:      'flex',
          alignItems:   'center',
          justifyContent: 'center',
          boxShadow:    '0 16px 48px rgba(217,108,82,0.38), 0 4px 12px rgba(217,108,82,0.2)',
        }}
      >
        <span
          style={{
            fontSize:      48,
            fontWeight:    900,
            color:         '#fff',
            lineHeight:    1,
            letterSpacing: -3,
            fontFamily:    'inherit',
          }}
        >
          H
        </span>
      </div>

      {/* Wordmark */}
      <div style={{ textAlign: 'center' }}>
        <p
          style={{
            fontSize:      30,
            fontWeight:    800,
            color:         '#1c1917',
            margin:        0,
            letterSpacing: '-0.04em',
            lineHeight:    1,
          }}
        >
          Handmader
        </p>
        <p
          style={{
            fontSize:      13,
            color:         '#a8a29e',
            margin:        '6px 0 0',
            letterSpacing: '0.04em',
            fontWeight:    500,
          }}
        >
          ручная работа с душой
        </p>
      </div>
    </div>
  );
}
