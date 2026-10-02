import { motion, type HTMLMotionProps } from 'motion/react';
import type { ReactNode } from 'react';
import { cn } from '../lib/util';

export interface CardProps extends Omit<HTMLMotionProps<'div'>, 'children'> {
  children?: ReactNode;
  /** Visual tone of the card surface. */
  tone?: 'cream' | 'white' | 'pink' | 'sun' | 'mint' | 'sky' | 'lilac' | 'tangerine' | 'glass';
  padded?: boolean;
}

const TONES: Record<NonNullable<CardProps['tone']>, string> = {
  cream: 'bg-cream text-ink border-ink shadow-pop',
  white: 'bg-white text-ink border-ink shadow-pop',
  pink: 'bg-pink text-white border-ink shadow-pop',
  sun: 'bg-sun text-ink border-ink shadow-pop',
  mint: 'bg-mint text-ink border-ink shadow-pop',
  sky: 'bg-sky text-ink border-ink shadow-pop',
  lilac: 'bg-lilac text-ink border-ink shadow-pop',
  tangerine: 'bg-tangerine text-ink border-ink shadow-pop',
  glass: 'bg-white/8 text-cream border-white/15 backdrop-blur-md',
};

/** The "sticker" surface used everywhere: thick outline, hard shadow, big radius. */
export function Card({ children, tone = 'cream', padded = true, className, ...rest }: CardProps) {
  return (
    <motion.div className={cn('rounded-[var(--radius-blob)] border-3', TONES[tone], padded && 'p-5', className)} {...rest}>
      {children}
    </motion.div>
  );
}
