'use client';

import { ReactNode } from 'react';
import { motion, type Variants } from 'motion/react';

const EASE = [0.32, 0.72, 0, 1] as const;

export const staggerContainerVariants: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.055, delayChildren: 0.03 } },
};

export const staggerItemVariants: Variants = {
  hidden: { opacity: 0, y: 14 },
  show:   { opacity: 1, y: 0, transition: { duration: 0.34, ease: EASE } },
};

interface StaggerProps {
  children: ReactNode;
  className?: string;
}

/** Wraps a list/grid so its direct StaggerItem children cascade in on mount. */
export function Stagger({ children, className }: StaggerProps) {
  return (
    <motion.div
      className={className}
      variants={staggerContainerVariants}
      initial="hidden"
      animate="show"
    >
      {children}
    </motion.div>
  );
}

export function StaggerItem({ children, className }: StaggerProps) {
  return (
    <motion.div className={className} variants={staggerItemVariants}>
      {children}
    </motion.div>
  );
}
