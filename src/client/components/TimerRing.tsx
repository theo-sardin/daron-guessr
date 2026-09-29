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
 * Circular countdown driven by server timestamps, drawn like a lens: a cream barrel with the
 * progress arc, and a dark glass in the middle showing the seconds as an orange date stamp.
 * With `endsAt === null` (no timer) it shows "--". Ticks audibly during the last 5 seconds
 * when `ticking`.
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

  const stroke = size >= 56 ? 6 : 5;
  const r = (size - 6) / 2 - stroke / 2 - 1;
  const c = 2 * Math.PI * r;
  const color = endsAt === null ? 'var(--color-sky)' : fraction > 0.5 ? 'var(--color-mint)' : fraction > 0.25 ? 'var(--color-sun)' : 'var(--color-danger)';
  const glass = size - 6 - stroke * 2 - 6;
  const label = endsAt === null ? '--' : String(seconds);
  const digits = Math.max(2, label.length);

  return (
    <motion.div
      className={cn('relative inline-flex shrink-0 items-center justify-center rounded-full border-3 border-ink bg-cream shadow-pop-sm', urgent && 'animate-shake', className)}
      style={{ width: size, height: size }}
      role="timer"
      // Only changes on whole seconds (the ring itself re-renders every 100ms).
      aria-label={ARIA[lang](endsAt === null ? null : seconds)}
    >
      <svg width={size - 6} height={size - 6} className="absolute inset-0 -rotate-90">
        <circle cx={(size - 6) / 2} cy={(size - 6) / 2} r={r} fill="none" stroke="rgb(27 16 54 / 0.1)" strokeWidth={stroke} />
        <circle
          cx={(size - 6) / 2}
          cy={(size - 6) / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - fraction)}
          style={{ transition: 'stroke-dashoffset 0.12s linear, stroke 0.3s' }}
        />
      </svg>
      <span
        className="relative flex items-center justify-center rounded-full border-2 border-ink bg-ink shadow-[inset_0_-6px_12px_-4px_rgb(255_122_26_/_0.35),inset_0_3px_6px_rgb(255_255_255_/_0.08)]"
        style={{ width: glass, height: glass }}
      >
        <span
          className={cn('text-stamp font-stamp7 leading-none', urgent && 'animate-pulse-soft')}
          style={{ fontSize: Math.round((glass * 0.78) / (digits * 0.86)) }}
          aria-hidden
        >
          {label}
        </span>
      </span>
    </motion.div>
  );
}
