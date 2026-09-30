import { motion } from 'motion/react';
import { useEffect, useRef } from 'react';
import { useI18n, type Lang } from '../i18n';
import { sfx } from '../lib/sfx';
import { useServerNow } from '../lib/time';
import { cn } from '../lib/util';

/** Spoken label (kept here: the timer is the only component that needs these two strings). */
const ARIA: Record<Lang, (s: number | null) => string> = {
  en: (s) => (s === null ? 'No time limit' : `${s} second${s === 1 ? '' : 's'} left`),
  fr: (s) => (s === null ? 'Pas de limite de temps' : `${s} seconde${s > 1 ? 's' : ''} restante${s > 1 ? 's' : ''}`),
};

/**
 * A red marker circle drawn by hand (a bit more than a turn), on a pale pencil track. It is
 * drawn in a 86x86 box and scaled, so the stroke keeps the same weight relative to the size.
 */
const LOOP = 'M43 6.5C63 6 80 22 79.5 43 79 64 62 80 42 79.5 22 79 6.5 63 7 43 7.3 26 21 7.4 41 6.6';

/**
 * Countdown driven by server timestamps: a red marker loop that un-draws as time runs out, the
 * seconds as a big black number and "sec" in red ballpoint. Under 5 seconds the number turns
 * red, the ring shakes and little alarm strokes pop out. With `endsAt === null` (no timer) it
 * shows ∞. Ticks audibly during the last 5 seconds when `ticking`.
 */
export function TimerRing({
  startsAt,
  endsAt,
  size = 64,
  ticking = true,
  className,
}: {
  startsAt: number;
  endsAt: number | null;
  size?: number;
  ticking?: boolean;
  className?: string;
}) {
  const { lang } = useI18n();
  const now = useServerNow(100);
  const total = endsAt === null ? 1 : Math.max(1, endsAt - startsAt);
  const remainingMs = endsAt === null ? total : Math.max(0, endsAt - Math.max(now, startsAt));
  const fraction = endsAt === null ? 1 : remainingMs / total;
  const seconds = Math.ceil(remainingMs / 1000);
  const urgent = endsAt !== null && seconds <= 5 && now >= startsAt;

  const lastTick = useRef<number | null>(null);
  useEffect(() => {
    if (!ticking || !urgent || seconds <= 0) return;
    if (lastTick.current !== seconds) {
      lastTick.current = seconds;
      sfx.play(seconds % 2 ? 'tick' : 'tock');
    }
  }, [seconds, urgent, ticking]);

  const label = String(seconds);
  const digits = label.length;
  // Number size: ~46% of the ring for 1-2 digits, smaller for 3.
  const numSize = size * (digits >= 3 ? 0.34 : 0.47);
  const showSec = size >= 56;

  return (
    <div
      className={cn('relative inline-flex shrink-0 items-center justify-center', urgent && 'animate-shake', className)}
      style={{ width: size, height: size }}
      role="timer"
      // Only changes on whole seconds (the ring itself re-renders every 100ms).
      aria-label={ARIA[lang](endsAt === null ? null : seconds)}
    >
      <svg viewBox="0 0 86 86" className="absolute inset-0 size-full overflow-visible" aria-hidden>
        <circle cx="43" cy="43" r="36" fill="none" stroke="rgb(23 19 15 / 0.13)" strokeWidth="7" />
        <path
          d={LOOP}
          pathLength={1}
          fill="none"
          stroke="var(--color-red)"
          strokeWidth="7.5"
          strokeLinecap="round"
          strokeDasharray="1 1"
          strokeDashoffset={1 - fraction}
          style={{ transition: 'stroke-dashoffset 0.12s linear', mixBlendMode: 'multiply' }}
        />
        {urgent && (
          <motion.path
            d="M50 1.5l2-6M60 4l4-5M68 9l5-3"
            stroke="var(--color-red)"
            strokeWidth="2.6"
            strokeLinecap="round"
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ pathLength: 1, opacity: 1 }}
            transition={{ duration: 0.25 }}
          />
        )}
      </svg>
      {endsAt === null ? (
        <svg viewBox="0 0 40 20" className="relative w-[46%]" aria-hidden>
          <path d="M20 10C16 3 6 3 6 10s10 7 14 0 14-7 14 0-10 7-14 0" fill="none" stroke="var(--color-ink)" strokeWidth="4" strokeLinecap="round" />
        </svg>
      ) : (
        <span className="relative flex flex-col items-center leading-[0.8]" aria-hidden>
          <span
            className={cn('font-display tabular-nums', urgent ? 'text-red' : 'text-ink')}
            style={{ fontSize: numSize, fontWeight: 900, fontStretch: '112%', letterSpacing: '-0.03em', marginTop: showSec ? size * 0.06 : 0 }}
          >
            {label}
          </span>
          {showSec && (
            <span className="text-hand text-red-ink" style={{ fontSize: size * 0.2, lineHeight: 0.9 }}>
              sec
            </span>
          )}
        </span>
      )}
    </div>
  );
}
