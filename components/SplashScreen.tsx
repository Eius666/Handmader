'use client';

import { useEffect, useState } from 'react';
import { motion } from 'motion/react';

type Phase = 'enter' | 'visible' | 'exit';

export function SplashScreen({ onDone }: { onDone: () => void }) {
  const [phase, setPhase] = useState<Phase>('enter');

  useEffect(() => {
    const t0 = setTimeout(() => setPhase('visible'), 30);
    const t1 = setTimeout(() => setPhase('exit'), 1500);
    const t2 = setTimeout(() => {
      localStorage.setItem('handmader_splash_seen', '1');
      onDone();
    }, 2000);
    return () => { clearTimeout(t0); clearTimeout(t1); clearTimeout(t2); };
  }, [onDone]);

  return (
    <motion.div
      aria-hidden="true"
      animate={{ opacity: phase === 'visible' ? 1 : 0 }}
      transition={{ duration: phase === 'exit' ? 0.45 : 0.3, ease: 'easeOut' }}
      style={{
        position:       'fixed',
        inset:          0,
        zIndex:         9000,
        background:     'var(--background)',
        display:        'flex',
        flexDirection:  'column',
        alignItems:     'center',
        justifyContent: 'center',
        gap:            22,
        pointerEvents:  'none',
      }}
    >
      {/* Logo mark, ringed by a dashed "stitch" — the maker's seam */}
      <div style={{ position: 'relative', width: 108, height: 108 }}>
        <motion.div
          initial={{ rotate: -8, opacity: 0 }}
          animate={{ rotate: 0, opacity: phase === 'enter' ? 0 : 0.5 }}
          transition={{ duration: 0.6, ease: [0.32, 0.72, 0, 1] }}
          style={{
            position:     'absolute',
            inset:        0,
            borderRadius: '50%',
            border:       '1.5px dashed rgb(var(--primary-rgb) / 45%)',
          }}
        />
        <motion.div
          initial={{ scale: 0.75, opacity: 0 }}
          animate={{ scale: phase === 'enter' ? 0.75 : 1, opacity: phase === 'enter' ? 0 : 1 }}
          transition={{ type: 'spring', stiffness: 260, damping: 20 }}
          style={{
            position:        'absolute',
            inset:           10,
            borderRadius:    26,
            background:      'linear-gradient(145deg, var(--primary-soft) 0%, var(--primary) 100%)',
            display:         'flex',
            alignItems:      'center',
            justifyContent:  'center',
            boxShadow:       'var(--shadow-primary)',
          }}
        >
          <span
            className="font-display"
            style={{
              fontSize:      44,
              fontWeight:    700,
              color:         'var(--primary-foreground)',
              lineHeight:    1,
            }}
          >
            H
          </span>
        </motion.div>
      </div>

      {/* Wordmark */}
      <motion.div
        initial={{ y: 10, opacity: 0 }}
        animate={{ y: phase === 'enter' ? 10 : 0, opacity: phase === 'enter' ? 0 : 1 }}
        transition={{ duration: 0.45, delay: 0.1, ease: [0.32, 0.72, 0, 1] }}
        style={{ textAlign: 'center' }}
      >
        <p
          className="font-display"
          style={{
            fontSize:      32,
            fontWeight:    600,
            color:         'var(--foreground)',
            margin:        0,
            letterSpacing: '-0.01em',
            lineHeight:    1,
          }}
        >
          Handmader
        </p>
        <p
          className="font-hand"
          style={{
            fontSize:      19,
            color:         'var(--primary)',
            margin:        '8px 0 0',
          }}
        >
          ручная работа с душой
        </p>
      </motion.div>
    </motion.div>
  );
}
