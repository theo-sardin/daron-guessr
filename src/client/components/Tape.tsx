import type { CSSProperties } from 'react';
import { cn } from '../lib/util';
import { TAPE_CLIP } from './paper/geometry';

export type TapeTone = 'cream' | 'yellow' | 'red' | 'blue' | 'pink' | 'mint';

const TONE: Record<TapeTone, string> = {
  cream: 'rgb(238 226 186 / 0.86)',
  yellow: 'rgb(255 223 61 / 0.85)',
  red: 'rgb(227 50 31 / 0.82)',
  blue: 'rgb(120 160 230 / 0.72)',
  pink: 'rgb(246 166 193 / 0.85)',
  mint: 'rgb(158 217 192 / 0.85)',
};

export interface TapeProps {
  tone?: TapeTone;
  /** Size in px (default 78 x 24). */
  width?: number;
  height?: number;
  /** Rotation in degrees. */
  rotate?: number;
  /** Stuck on with a quick left-to-right stretch when it mounts (default false). */
  animate?: boolean;
  /** Delay of the stretch in seconds. */
  delay?: number;
  /** Position it (usually `absolute -top-3 left-1/2 -translate-x-1/2`). */
  className?: string;
  style?: CSSProperties;
}

/**
 * A strip of masking tape (translucent, jagged torn ends, faint crepe texture). Decorative:
 * position it with `className`, e.g. on the top edge of a card or across a photo's corner.
 */
export function Tape({ tone = 'cream', width = 78, height = 24, rotate = 0, animate = false, delay = 0, className, style }: TapeProps) {
  return (
    <span
      aria-hidden
      className={cn('pointer-events-none z-10 block', !/\b(absolute|fixed|relative|sticky)\b/.test(className ?? '') && 'absolute', className)}
      style={{ width, height, rotate: rotate ? `${rotate}deg` : undefined, ...style }}
    >
      <span
        className={cn('block size-full', animate && 'tape-in')}
        style={{
          background: `linear-gradient(180deg, rgb(255 255 255 / 0.35), rgb(255 255 255 / 0) 45%, rgb(120 90 40 / 0.06)), repeating-linear-gradient(90deg, rgb(255 255 255 / 0.08) 0 2px, rgb(150 120 60 / 0.05) 2px 3px), ${TONE[tone]}`,
          clipPath: TAPE_CLIP,
          animationDelay: animate && delay ? `${delay}s` : undefined,
        }}
      />
    </span>
  );
}
