'use client';

import { ReactNode } from 'react';
import { AnimatePresence, motion } from 'motion/react';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  /** Anchor content to the bottom (sheet-style) instead of centering. */
  sheet?: boolean;
}

/** Backdrop fade + content spring scale-up. Wraps any modal/sheet content;
 *  the caller owns layout/styling of the inner card. */
export function Modal({ open, onClose, children, sheet = false }: ModalProps) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex px-5"
          style={{
            background: 'rgb(var(--foreground-rgb) / 48%)',
            alignItems: sheet ? 'flex-end' : 'center',
            justifyContent: 'center',
            paddingBottom: sheet ? 'calc(env(safe-area-inset-bottom) + 16px)' : 0,
          }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={onClose}
        >
          <motion.div
            onClick={(e) => e.stopPropagation()}
            initial={{ opacity: 0, y: sheet ? 40 : 20, scale: sheet ? 1 : 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: sheet ? 30 : 12, scale: sheet ? 1 : 0.96 }}
            transition={{ type: 'spring', stiffness: 380, damping: 34 }}
            className="w-full max-w-sm"
          >
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
