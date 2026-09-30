import { useT } from '../i18n';
import { cn } from '../lib/util';

/** A ballpoint loop scribbled over and over (drawn, then erased), slowly turning. */
const LOOP = 'M12 3.2C17.2 3 21 6.6 20.8 12.2 20.6 17.4 16.8 20.9 11.6 20.8 6.4 20.6 3 16.8 3.2 11.6 3.4 7.4 6.2 4.4 10.2 3.6';

/** Sized and colored by className (default size-6, currentColor). */
export function Spinner({ className }: { className?: string }) {
  const t = useT();
  return (
    <span role="status" aria-label={t('common.loading')} className={cn('inline-block size-6 shrink-0', className)}>
      <svg viewBox="0 0 24 24" className="block size-full animate-turn" fill="none" aria-hidden>
        <path
          d={LOOP}
          pathLength={1}
          stroke="currentColor"
          strokeWidth={2.6}
          strokeLinecap="round"
          strokeDasharray="1 1"
          strokeDashoffset={0}
          className="animate-scribble"
        />
      </svg>
    </span>
  );
}
