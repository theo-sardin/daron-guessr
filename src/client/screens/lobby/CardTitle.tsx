import type { ReactNode } from 'react';
import { cn } from '../../lib/util';

/** Heading of a lobby card: an emoji sticker then the title in the display font ("📸 Your parents"). */
export function CardTitle({ emoji, children, className }: { emoji: string; children: ReactNode; className?: string }) {
  return (
    <h2 className={cn('min-w-0 font-display text-2xl leading-none', className)}>
      <span aria-hidden>{emoji} </span>
      {children}
    </h2>
  );
}
