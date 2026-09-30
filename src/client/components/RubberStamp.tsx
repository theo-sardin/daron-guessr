import { motion } from 'motion/react';
import { useEffect, type CSSProperties, type ReactNode } from 'react';
import { sfx } from '../lib/sfx';
import { cn } from '../lib/util';
import { THUMP_SPRING } from './paper/motion';

export type RubberStampTone = 'red' | 'blue' | 'ink';

const TONE: Record<RubberStampTone, string> = { red: 'var(--color-red)', blue: 'var(--color-blue)', ink: 'var(--color-ink)' };
const SIZES = { xs: 13, sm: 18, md: 26, lg: 31, xl: 42 } as const;
export type RubberStampSize = keyof typeof SIZES;

export interface RubberStampProps {
  children: ReactNode;
  tone?: RubberStampTone;
  /** A preset or px (default lg = 31px, the reveal stamp). */
  size?: RubberStampSize | number;
  /** Rotation in degrees (default -12). */
  tilt?: number;
  /** A small line above the word ("★ ★ ★" by default when true, or your own text). */
  top?: ReactNode | true;
  /** A translucent paper patch behind (for stamps on top of photos). */
  backing?: boolean;
  /** Thumps down when it mounts (default false). A number delays it (s). */
  animate?: boolean | number;
  /** Plays the stamp thump when it lands (default true when animated). */
  sound?: boolean;
  className?: string;
  style?: CSSProperties;
}

/**
 * A rubber stamp in grungy ink: double border, wide caps ("GRILLÉE !", "INCOGNITO").
 * `animate` thumps it down (and plays the stamp sound).
 */
export function RubberStamp({ children, tone = 'red', size = 'lg', tilt = -12, top, backing = false, animate = false, sound, className, style }: RubberStampProps) {
  const px = typeof size === 'number' ? size : SIZES[size];
  const color = TONE[tone];
  const delay = typeof animate === 'number' ? animate : 0;
  const playSound = sound ?? animate !== false;

  useEffect(() => {
    if (animate === false || !playSound) return;
    const id = window.setTimeout(() => sfx.play('stamp'), delay * 1000 + 90);
    return () => window.clearTimeout(id);
  }, [animate, playSound, delay]);

  const border = Math.max(2, Math.round(px * 0.13));
  const stamp = (
    <span
      className="relative block text-center uppercase"
      style={{
        color,
        border: `${border}px solid ${color}`,
        boxShadow: `inset 0 0 0 ${border * 0.6}px transparent, inset 0 0 0 ${border * 1.25}px ${color}`,
        borderRadius: Math.max(4, px * 0.2),
        padding: `${(px * 0.29).toFixed(1)}px ${(px * 0.45).toFixed(1)}px ${(px * 0.23).toFixed(1)}px`,
        fontFamily: 'var(--font-sans)',
        fontWeight: 900,
        fontStretch: '115%',
        fontSize: px,
        lineHeight: 0.9,
        letterSpacing: '0.01em',
        whiteSpace: 'nowrap',
        WebkitMaskImage: 'var(--grunge)',
        maskImage: 'var(--grunge)',
      }}
    >
      {top && (
        <span className="block" style={{ fontSize: Math.max(8, px * 0.32), letterSpacing: '0.3em', fontStretch: '110%', marginBottom: px * 0.13 }} aria-hidden>
          {top === true ? '★ ★ ★' : top}
        </span>
      )}
      {children}
    </span>
  );

  return (
    <motion.span
      className={cn('inline-block', backing && 'rounded-lg bg-sheet/90 p-1 shadow-paper', className)}
      style={{ rotate: tilt, ...style }}
      initial={animate !== false ? { scale: 2.3, opacity: 0, rotate: tilt - 9 } : false}
      animate={{ scale: 1, opacity: 1, rotate: tilt }}
      transition={{ ...THUMP_SPRING, delay, opacity: { duration: 0.06, delay } }}
    >
      {stamp}
    </motion.span>
  );
}
