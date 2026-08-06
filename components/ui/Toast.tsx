'use client';

import { useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';

export function Toast({ message, onClose }: { message: string; onClose: () => void }) {
  useEffect(() => {
    const t = setTimeout(onClose, 2800);
    return () => clearTimeout(t);
  }, [onClose]);

  return (
    <AnimatePresence>
      {message && (
        <motion.div
          aria-live="polite"
          role="status"
          initial={{ opacity: 0, y: 16, x: '-50%' }}
          animate={{ opacity: 1, y: 0, x: '-50%' }}
          exit={{ opacity: 0, y: 10, x: '-50%' }}
          transition={{ type: 'spring', stiffness: 420, damping: 32 }}
          style={{
            position:      'fixed',
            bottom:        108,
            left:          '50%',
            zIndex:        1000,
            background:    'var(--foreground)',
            color:         'var(--background)',
            padding:       '12px 22px',
            borderRadius:  14,
            fontSize:      14,
            fontWeight:    700,
            letterSpacing: '-0.01em',
            boxShadow:     'var(--shadow-float)',
            whiteSpace:    'nowrap',
          }}
        >
          {message}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
