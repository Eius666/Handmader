'use client';

import { ReactNode } from 'react';
import { motion } from 'motion/react';

const EASE = [0.32, 0.72, 0, 1] as const;

/** Fade + slight rise on every page mount. Each route is its own component
 *  tree in the app router, so a plain mount animation (no AnimatePresence
 *  needed) is enough to read as a page transition. */
export function PageTransition({ children }: { children: ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.36, ease: EASE }}
      className="min-h-full"
    >
      {children}
    </motion.div>
  );
}
