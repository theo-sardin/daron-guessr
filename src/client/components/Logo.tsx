import { motion } from 'motion/react';
import { cn } from '../lib/util';

/** "DARON GUESSR" wordmark with a bouncing mustache. */
export function Logo({ size = 'lg', className }: { size?: 'sm' | 'md' | 'lg'; className?: string }) {
  const text = { sm: 'text-2xl', md: 'text-4xl', lg: 'text-6xl sm:text-7xl' }[size];
  const stroke = size === 'sm' ? 'text-outline-sm' : 'text-outline';
  return (
    <div className={cn('flex flex-col items-center leading-[0.85] select-none', className)} aria-label="Daron Guessr">
      <motion.span
        className={cn('font-display text-sun', text, stroke)}
        initial={{ rotate: -4 }}
        animate={{ rotate: [-4, -2, -4] }}
        transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
      >
        DARON
      </motion.span>
      <motion.span
        className={cn('-mt-1 font-display text-pink', text, stroke)}
        initial={{ rotate: 3 }}
        animate={{ rotate: [3, 1, 3] }}
        transition={{ duration: 3.4, repeat: Infinity, ease: 'easeInOut' }}
      >
        GUESSR
      </motion.span>
      {size !== 'sm' && <Mustache className={cn('mt-1', size === 'lg' ? 'w-24' : 'w-16')} />}
    </div>
  );
}

export function Mustache({ className }: { className?: string }) {
  return (
    <motion.svg
      viewBox="0 0 120 40"
      className={cn('text-ink drop-shadow-[0_3px_0_rgba(255,210,63,0.9)]', className)}
      animate={{ scaleX: [1, 1.08, 1], y: [0, -2, 0] }}
      transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut' }}
      aria-hidden
    >
      <path
        fill="currentColor"
        d="M60 14c-6-10-18-12-28-6C22 14 14 26 2 22c6 12 26 16 40 10 8-3 13-8 18-8s10 5 18 8c14 6 34 2 40-10-12 4-20-8-30-14-10-6-22-4-28 6z"
      />
    </motion.svg>
  );
}
