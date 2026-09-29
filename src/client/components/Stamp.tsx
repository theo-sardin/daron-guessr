import { Children, type ReactNode } from 'react';
import { cn } from '../lib/util';

export type StampVariant = 'seg7' | 'seg14' | 'mono';
export type StampSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';

const FONT: Record<StampVariant, string> = {
  seg7: 'font-stamp7 tracking-[0.06em]',
  seg14: 'font-stamp14 tracking-[0.06em]',
  // The negative margin cancels the tracking after the last letter, so centered codes stay centered.
  mono: 'font-mono font-bold tracking-[0.16em] -mr-[0.16em]',
};

const SIZE: Record<StampSize, string> = {
  xs: 'text-[0.75rem]',
  sm: 'text-sm',
  md: 'text-xl',
  lg: 'text-3xl',
  xl: 'text-[2.75rem]',
  '2xl': 'text-6xl',
};

/** Characters DSEG7 has no glyph for (/ ' ? + …): drawn with DSEG14 so they still read as segments. */
const SEG7_MISSING = /([^0-9A-Za-z\-:. !])/;

/** A lit segment drawn with CSS (for the slash and the apostrophe, narrower than a DSEG cell). */
const SEGMENT = 'absolute rounded-full bg-current';

function renderSeg7(text: string): ReactNode {
  if (!SEG7_MISSING.test(text)) return text;
  return text.split(SEG7_MISSING).map((part, i) => {
    if (i % 2 === 0) return part;
    if (part === '/')
      return (
        <span key={i} className="relative inline-block h-[1em] w-[0.42em] align-baseline">
          <span className={cn(SEGMENT, 'top-[4%] left-[42%] h-[92%] w-[0.1em] rotate-[18deg]')} />
        </span>
      );
    if (part === '+')
      return (
        <span key={i} className="relative inline-block h-[1em] w-[0.5em] align-baseline">
          <span className={cn(SEGMENT, 'top-[46%] left-[8%] h-[0.1em] w-[84%]')} />
          <span className={cn(SEGMENT, 'top-[18%] left-[45%] h-[64%] w-[0.1em]')} />
        </span>
      );
    if (part === "'")
      return (
        <span key={i} className="relative inline-block h-[1em] w-[0.3em] align-baseline">
          <span className={cn(SEGMENT, 'top-0 left-[30%] h-[36%] w-[0.1em] rotate-[12deg]')} />
        </span>
      );
    return (
      <span key={i} className="font-stamp14">
        {part}
      </span>
    );
  });
}

/** `children` as one string when it is only text and numbers (`{round}/{total}` is an array in JSX). */
function flatText(children: ReactNode): string | null {
  if (typeof children === 'string' || typeof children === 'number') return String(children);
  const parts = Children.toArray(children);
  if (parts.length === 0 || !parts.every((c) => typeof c === 'string' || typeof c === 'number')) return null;
  return parts.join('');
}

/** Zero-pads a number for a stamp: pad(3) → "03", pad(7, 3) → "007". */
export const pad = (n: number, width = 2) => String(Math.max(0, Math.trunc(n))).padStart(width, '0');

/** Hash of a string (FNV-1a), for stable per-photo fakes. */
function hash(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 0x01000193);
  return h >>> 0;
}

/**
 * A believable camera date imprint derived from an id, stable across renders and players:
 * fakeDateStamp(photo.id) → "'93 07 14" (years 1985-2005). Use it on prints so every photo
 * gets its own date; keep "'98 12 24" for the logo only.
 */
export function fakeDateStamp(id: string): string {
  const h = hash(id);
  const year = 85 + (h % 21);
  const month = 1 + ((h >>> 5) % 12);
  const day = 1 + ((h >>> 9) % 28);
  return `'${pad(year % 100)} ${pad(month)} ${pad(day)}`;
}

export interface StampProps {
  children: ReactNode;
  /**
   * seg7 (default): DSEG7 digits, for numbers only: timer, round "03/08", scores, dates.
   * mono: Space Mono 700 caps, for anything people read aloud or type: ROOM CODES, words.
   * seg14: decorative only (e.g. a short "OK" / "FIN"), never codes: K V W X Y B are unreadable.
   */
  variant?: StampVariant;
  size?: StampSize;
  /** Space Mono micro-label above the stamp ("ROOM", "PHOTO", "SCORE"). */
  label?: ReactNode;
  /**
   * Sit on a dark ink chip. Only for UI chrome (a timer / score HUD, a stamp on a light card
   * that must glow). A date imprint on a photo or on the night background has no plate.
   */
  plate?: boolean;
  /** @deprecated No-op. Unlit "8" segments made stamps read as alarm clocks; kept so old calls compile. */
  ghost?: boolean;
  /**
   * Orange LED glow (default true): on photos and dark surfaces. Off, the stamp is printed on
   * light paper in a darker ink (`--color-stamp-ink`, AA on cream).
   */
  glow?: boolean;
  className?: string;
  /** Extra classes for the digits line. */
  valueClassName?: string;
  /** Accessible text when the visual text is not meaningful as-is (e.g. "3 of 8"). */
  ariaLabel?: string;
}

/**
 * The orange date imprint of a disposable camera, for numbers and codes:
 *   <Stamp label="PHOTO">{pad(round)}/{pad(total)}</Stamp>      → 03/08 in DSEG7
 *   <Stamp variant="mono" label="ROOM" size="xl">{code}</Stamp>  → a room code
 *   <Stamp size="xs">{fakeDateStamp(photo.id)}</Stamp>         → on a print
 */
export function Stamp({
  children,
  variant = 'seg7',
  size = 'md',
  label,
  plate,
  glow = true,
  className,
  valueClassName,
  ariaLabel,
}: StampProps) {
  const text = flatText(children);
  const value = variant === 'seg7' && text !== null ? renderSeg7(text) : (text ?? children);
  const lit = glow || plate;

  return (
    <span
      className={cn(
        'inline-flex flex-col items-start gap-1 leading-none',
        plate && 'rounded-xl border-2 border-ink bg-ink px-2.5 pt-1.5 pb-2 text-cream',
        className,
      )}
      aria-label={ariaLabel}
      role={ariaLabel ? 'img' : undefined}
    >
      {label && <span className={cn('label-mono', plate ? 'text-cream/60' : 'opacity-70')}>{label}</span>}
      <span
        className={cn('whitespace-nowrap tabular-nums', FONT[variant], SIZE[size], lit ? 'text-stamp' : 'text-stamp-print', valueClassName)}
        aria-hidden={ariaLabel ? true : undefined}
      >
        {value}
      </span>
    </span>
  );
}
