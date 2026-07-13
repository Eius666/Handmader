'use client';

import { useEffect } from 'react';

export function Toast({ message, onClose }: { message: string; onClose: () => void }) {
  useEffect(() => {
    const t = setTimeout(onClose, 3000);
    return () => clearTimeout(t);
  }, [onClose]);

  return (
    <div
      aria-live="polite"
      style={{
        position: 'fixed',
        bottom: 108,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 1000,
        background: '#2d2d2d',
        color: '#ffffff',
        padding: '12px 22px',
        borderRadius: 14,
        fontSize: 14,
        fontWeight: 700,
        letterSpacing: '-0.01em',
        boxShadow: '0 8px 28px rgba(0,0,0,0.22)',
        whiteSpace: 'nowrap',
      }}
    >
      {message}
    </div>
  );
}
