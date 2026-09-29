import { motion } from 'motion/react';
import { useEffect, useRef } from 'react';
import { sfx } from '../lib/sfx';
import { useServerNow } from '../lib/time';
import { cn } from '../lib/util';

/**
 * Circular countdown driven by server timestamps. With `endsAt === null` (no timer) it
 * shows an infinity sign. Ticks audibly during the last 5 seconds when `ticking`.
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

  const stroke = 7;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const color = endsAt === null ? 'var(--color-sky)' : fraction > 0.5 ? 'var(--color-mint)' : fraction > 0.25 ? 'var(--color-sun)' : 'var(--color-danger)';

  return (
    <motion.div
      className={cn('relative inline-flex items-center justify-center rounded-full border-3 border-ink bg-cream shadow-pop-sm', urgent && 'animate-shake', className)}
      style={{ width: size, height: size }}
      role="timer"
      aria-label={endsAt === null ? 'no timer' : `${seconds}s`}
    >
      <svg width={size} height={size} className="absolute inset-0 -rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r - 1.5} fill="none" stroke="rgb(27 16 54 / 0.08)" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r - 1.5}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - fraction)}
          style={{ transition: 'stroke-dashoffset 0.12s linear, stroke 0.3s' }}
        />
      </svg>
      <span className={cn('relative font-display text-ink tabular-nums', size >= 64 ? 'text-2xl' : 'text-lg')}>
        {endsAt === null ? '∞' : seconds}
      </span>
    </motion.div>
  );
}
