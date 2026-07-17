'use client';

import { useEffect, useState } from 'react';

export function Toast({ message, onClose }: { message: string; onClose: () => void }) {
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    const t1 = setTimeout(() => setExiting(true), 2500);
    const t2 = setTimeout(onClose, 3000);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [onClose]);

  return (
    <div
      aria-live="polite"
      role="status"
      style={{
        position:      'fixed',
        bottom:        108,
        left:          '50%',
        transform:     'translateX(-50%)',
        zIndex:        1000,
        background:    '#2d2d2d',
        color:         '#ffffff',
        padding:       '12px 22px',
        borderRadius:  14,
        fontSize:      14,
        fontWeight:    700,
        letterSpacing: '-0.01em',
        boxShadow:     '0 8px 28px rgba(0,0,0,0.22)',
        whiteSpace:    'nowrap',
        opacity:       exiting ? 0 : 1,
        // Enter via CSS animation; exit via opacity transition
        animation:     exiting ? undefined : 'toast-in 0.25s ease-out both',
        transition:    exiting ? 'opacity 0.4s ease-out' : undefined,
      }}
    >
      {message}
    </div>
  );
}
