import type { ReactNode } from 'react';
import { cn } from '../../lib/util';

/**
 * Heading of a lobby card: bold Archivo Black words on the paper, an optional ballpoint note
 * scribbled next to them ("psst, only you can see them").
 */
export function CardTitle({ children, note, className }: { children: ReactNode; note?: ReactNode; className?: string }) {
  return (
    <h2 className={cn('flex min-w-0 flex-wrap items-baseline gap-x-2 font-heavy text-[1.55rem] leading-[0.95] tracking-[-0.02em] text-ink sm:text-[1.75rem]', className)}>
      <span className="min-w-0">{children}</span>
      {note && <span className="text-pen -rotate-2 text-[1.15rem] leading-none font-bold tracking-normal">{note}</span>}
    </h2>
  );
}
