import { motion } from 'motion/react';
import type { CSSProperties } from 'react';
import { cn } from '../lib/util';
import { hash, rng } from './paper/geometry';
import { SLAP_SPRING } from './paper/motion';
import { rel } from './paper/cls';

export type DymoTone = 'ink' | 'red' | 'blue';

const TONE: Record<DymoTone, string> = { ink: '#1a1714', red: '#d42716', blue: '#2344c8' };

const SIZES = { xs: 12, sm: 15, md: 21, lg: 27, xl: 36 } as const;
export type DymoSize = keyof typeof SIZES;

export interface DymoLabelProps {
  /** The embossed text (caps; e.g. a room code). */
  text: string;
  tone?: DymoTone;
  /** A preset or px (default md = 21px). */
  size?: DymoSize | number;
  /** Rotation in degrees. */
  tilt?: number;
  /** Letter spacing in em (default 0.2). */
  spacing?: number;
  /** Punched out and slapped on when it mounts (default false). */
  animate?: boolean | number;
  /** Accessible text when it differs from `text` (e.g. "Room code B K X Z"). */
  label?: string;
  className?: string;
  style?: CSSProperties;
}

/**
 * An embossed Dymo label: white raised caps on glossy plastic tape (the room code, "GUESSR").
 * Every letter sits a hair off the baseline, like a real label maker.
 */
export function DymoLabel({ text, tone = 'ink', size = 'md', tilt = 0, spacing = 0.2, animate = false, label, className, style }: DymoLabelProps) {
  const px = typeof size === 'number' ? size : SIZES[size];
  const r = rng(hash(text) + 3);
  const letters = Array.from(text.toUpperCase());
  const motionProps =
    animate !== false
      ? {
          initial: { opacity: 0, x: -18, rotate: tilt - 6, scaleX: 0.6 },
          animate: { opacity: 1, x: 0, rotate: tilt, scaleX: 1 },
          transition: { ...SLAP_SPRING, delay: typeof animate === 'number' ? animate : 0 },
        }
      : { initial: false as const, animate: { rotate: tilt } };
  return (
    <motion.span
      className={cn(rel(className), 'inline-flex shrink-0 items-center whitespace-nowrap rounded-[2px] leading-none text-white uppercase', className)}
      style={{
        fontSize: px,
        fontFamily: 'var(--font-sans)',
        fontWeight: 800,
        fontStretch: '100%',
        letterSpacing: `${spacing}em`,
        padding: `0.28em ${Math.max(0.3, 0.5 - spacing)}em 0.24em ${0.5 + spacing * 0.3}em`,
        background: `linear-gradient(180deg, rgb(255 255 255 / 0.22), rgb(255 255 255 / 0) 35%, rgb(0 0 0 / 0) 65%, rgb(0 0 0 / 0.22)), ${TONE[tone]}`,
        boxShadow: '0 1px 0 rgb(0 0 0 / 0.25), 0 3px 7px -2px rgb(0 0 0 / 0.35)',
        rotate: tilt,
        ...style,
      }}
      {...motionProps}
    >
      <span className="sr-only">{label ?? text}</span>
      {letters.map((c, i) => (
        <span
          key={i}
          aria-hidden
          className="inline-block"
          style={{
            transform: `translateY(${((r() - 0.5) * 0.09).toFixed(3)}em)`,
            textShadow: '0 1px 0 rgb(0 0 0 / 0.45), 0 -0.5px 0 rgb(255 255 255 / 0.35)',
            whiteSpace: 'pre',
          }}
        >
          {c}
        </span>
      ))}
    </motion.span>
  );
}
