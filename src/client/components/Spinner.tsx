import { useT } from '../i18n';
import { cn } from '../lib/util';

/** A ballpoint loop scribbled over and over, slowly turning, on its own faint pencil track. */
const LOOP = 'M12 3.2C17.2 3 21 6.6 20.8 12.2 20.6 17.4 16.8 20.9 11.6 20.8 6.4 20.6 3 16.8 3.2 11.6 3.4 7.4 6.2 4.4 10.2 3.6';

/**
 * Sized and colored by className (default size-6, currentColor). The pen stroke always covers
 * 35-80% of the loop, so even at 16px it reads as a spinner, never as a stray comma. Pick a
 * color that reads on its background (ink / blue / red on paper, cream on ink), not yellow.
 */
export function Spinner({ className }: { className?: string }) {
  const t = useT();
  return (
    <span role="status" aria-label={t('common.loading')} className={cn('inline-block size-6 shrink-0', className)}>
      <svg viewBox="0 0 24 24" className="block size-full animate-turn" fill="none" aria-hidden>
        <path d={LOOP} stroke="currentColor" strokeOpacity={0.2} strokeWidth={2.4} strokeLinecap="round" />
        <path d={LOOP} pathLength={1} stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeDasharray="0.35 0.65" className="animate-scribble" />
      </svg>
    </span>
  );
}
