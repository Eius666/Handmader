'use client';

import { ComponentProps } from 'react';
import { motion } from 'motion/react';

const TAP_SPRING  = { type: 'spring', stiffness: 500, damping: 32 } as const;
const LIFT_SPRING = { type: 'spring', stiffness: 380, damping: 30 } as const;

/** A button with a deliberate, physical press — spring scale down on tap. */
export function PressableButton({ children, ...props }: ComponentProps<typeof motion.button>) {
  return (
    <motion.button
      whileTap={{ scale: 0.96 }}
      transition={TAP_SPRING}
      {...props}
    >
      {children}
    </motion.button>
  );
}

/** A card that lifts (shadow + slight rise) on hover and settles on tap.
 *  Use for anything clickable that isn't a plain button — order cards,
 *  master cards, list rows. */
export function MotionCard({
  children, interactive = true, ...props
}: ComponentProps<typeof motion.div> & { interactive?: boolean }) {
  return (
    <motion.div
      whileHover={interactive ? { y: -3 } : undefined}
      whileTap={interactive ? { scale: 0.985 } : undefined}
      transition={LIFT_SPRING}
      {...props}
    >
      {children}
    </motion.div>
  );
}

/** A badge/pill that pops into existence — spring scale from 0. Use for
 *  unread counts, new-status pills, freshly-added items. */
export function PopIn({ children, ...props }: ComponentProps<typeof motion.span>) {
  return (
    <motion.span
      initial={{ opacity: 0, scale: 0.4 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: 'spring', stiffness: 460, damping: 22 }}
      {...props}
    >
      {children}
    </motion.span>
  );
}
