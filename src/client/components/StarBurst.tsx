import { motion } from 'motion/react';
import { useLayoutEffect, useRef, type CSSProperties, type ReactNode } from 'react';
import { cn } from '../lib/util';
import { burstPoints } from './paper/geometry';
import { rel } from './paper/cls';
import { textOf } from './paper/text';

export type StarBurstTone = 'yellow' | 'red' | 'pink' | 'mint' | 'sheet' | 'blue';

const FILL: Record<StarBurstTone, { bg: string; fg: string }> = {
  yellow: { bg: '#ffdf3d', fg: 'var(--color-ink)' },
  red: { bg: '#e3321f', fg: '#fff' },
  pink: { bg: '#f6a6c1', fg: 'var(--color-ink)' },
  mint: { bg: '#9ed9c0', fg: 'var(--color-ink)' },
  sheet: { bg: '#fffdf6', fg: 'var(--color-ink)' },
  blue: { bg: '#2344c8', fg: '#fff' },
};

export interface StarBurstProps {
  children?: ReactNode;
  tone?: StarBurstTone;
  /** Diameter in px (default 104). */
  size?: number;
  /** Rotation in degrees (default 12). */
  tilt?: number;
  /** Number of spikes (default 14). */
  spikes?: number;
  seed?: number;
  /** Spins in and lands when it mounts (default false). A number delays it (s). */
  animate?: boolean | number;
  className?: string;
  style?: CSSProperties;
}

/** The text stays inside the star's inner circle: at most this share of the diameter. */
const TEXT_BOX = 0.64;

/**
 * A cut-out star burst badge ("100% GÊNANT", "+300", "NEW"): ink outline, bold centered text.
 * Children are laid out in a column; size the text with the usual classes. Text that would
 * cross the spikes is scaled down to fit the inner circle (measured, so any label fits).
 */
export function StarBurst({ children, tone = 'yellow', size = 104, tilt = 12, spikes = 14, seed = 5, animate = false, className, style }: StarBurstProps) {
  const c = FILL[tone];
  const delay = typeof animate === 'number' ? animate : 0;
  const textRef = useRef<HTMLSpanElement>(null);
  const label = textOf(children);
  useLayoutEffect(() => {
    const el = textRef.current;
    if (!el) return;
    const fit = () => {
      // Layout sizes ignore transforms: scaling does not feed back into the measure.
      const box = size * TEXT_BOX;
      const k = Math.min(1, box / Math.max(1, el.scrollWidth), box / Math.max(1, el.scrollHeight));
      el.style.transform = k < 1 ? `scale(${k.toFixed(3)})` : '';
    };
    fit();
    let alive = true;
    void document.fonts?.ready.then(() => alive && fit());
    return () => {
      alive = false;
    };
  }, [size, label]);
  return (
    <motion.span
      className={cn(rel(className), 'inline-flex shrink-0 items-center justify-center', className)}
      style={{ width: size, height: size, rotate: tilt, filter: 'drop-shadow(0 2px 0 rgb(40 25 10 / 0.2)) drop-shadow(0 5px 6px rgb(40 25 10 / 0.25))', ...style }}
      initial={animate !== false ? { scale: 0, rotate: tilt - 90 } : false}
      animate={{ scale: 1, rotate: tilt }}
      transition={{ type: 'spring', stiffness: 380, damping: 15, delay }}
    >
      <svg viewBox="0 0 100 100" className="absolute inset-0 size-full" aria-hidden>
        <polygon points={burstPoints(spikes, seed)} fill={c.bg} stroke="#17130f" strokeWidth="2.2" strokeLinejoin="round" />
      </svg>
      <span
        ref={textRef}
        className="relative flex flex-col items-center justify-center text-center leading-[0.9] whitespace-nowrap"
        style={{ color: c.fg, fontWeight: 900, fontStretch: '105%', fontSize: size * 0.2 }}
      >
        {children}
      </span>
    </motion.span>
  );
}
