import { Children, type ReactNode } from 'react';
import { cn } from '../lib/util';

/** Kept for old calls: every variant now prints in Archivo (no more seven-segment digits). */
export type StampVariant = 'seg7' | 'seg14' | 'mono' | 'num';
export type StampSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';

const SIZE: Record<StampSize, string> = {
  xs: 'text-[0.9rem]',
  sm: 'text-[1.1rem]',
  md: 'text-[1.6rem]',
  lg: 'text-[2.4rem]',
  xl: 'text-[3.1rem]',
  '2xl': 'text-[4.25rem]',
};

/** `children` as one string when it is only text and numbers (`{round}/{total}` is an array in JSX). */
function flatText(children: ReactNode): string | null {
  if (typeof children === 'string' || typeof children === 'number') return String(children);
  const parts = Children.toArray(children);
  if (parts.length === 0 || !parts.every((c) => typeof c === 'string' || typeof c === 'number')) return null;
  return parts.join('');
}

/**
 * A number for display. Numbers are no longer zero-padded ("3/8", not "03/08"); kept so old
 * calls compile: pad(3) → "3".
 */
export const pad = (n: number, _width = 2) => String(Math.max(0, Math.trunc(n)));

/**
 * @deprecated The camera date imprints are gone from the paper world: always returns "" so
 * nothing is printed. Remove the calls.
 */
export function fakeDateStamp(_id: string): string {
  return '';
}

export interface StampProps {
  children: ReactNode;
  /**
   * num / seg7 / seg14 (default): a big Archivo Black number ("3/8" prints the total smaller).
   * mono: wide Archivo caps with spacing, for codes people read aloud or type (prefer <DymoLabel>).
   */
  variant?: StampVariant;
  size?: StampSize;
  /** Typewriter micro-label above the number ("photo", "score"). */
  label?: ReactNode;
  /** Printed on a black Dymo-like chip (HUDs over photos). */
  plate?: boolean;
  /** @deprecated No-op (there is no LED glow on paper). */
  ghost?: boolean;
  /** @deprecated No-op (there is no LED glow on paper). */
  glow?: boolean;
  className?: string;
  /** Extra classes for the number line (e.g. a color: `text-red`). */
  valueClassName?: string;
  /** Accessible text when the visual text is not meaningful as-is (e.g. "3 of 8"). */
  ariaLabel?: string;
}

/** "3/8" → 3 big, "/8" smaller and softer. */
function renderValue(text: string): ReactNode {
  const m = /^(\S+?)\s*\/\s*(\S+)$/.exec(text);
  if (!m) return text;
  return (
    <>
      {m[1]}
      <span className="ml-[0.02em] text-[0.55em] tracking-[-0.02em] opacity-75">/{m[2]}</span>
    </>
  );
}

/**
 * Big, black, instantly readable numbers (Archivo Black):
 *   <Stamp label="photo" size="xl">{round}/{total}</Stamp>   → 3/8
 *   <Stamp size="lg">{score}</Stamp>
 */
export function Stamp({ children, variant = 'num', size = 'md', label, plate, className, valueClassName, ariaLabel }: StampProps) {
  const text = flatText(children);
  const mono = variant === 'mono';
  const value = text !== null && !mono ? renderValue(text) : (text ?? children);

  return (
    <span
      className={cn(
        'inline-flex flex-col items-start gap-1 leading-none',
        plate && 'rounded-[3px] bg-ink px-2.5 pt-1.5 pb-2 text-[#fff6e0] shadow-paper-sm',
        className,
      )}
      aria-label={ariaLabel}
      role={ariaLabel ? 'img' : undefined}
    >
      {label && <span className={cn('label-type', plate && 'text-[#fff6e0]/70')}>{label}</span>}
      <span
        className={cn(
          'flex items-baseline whitespace-nowrap tabular-nums',
          mono ? 'font-sans font-extrabold tracking-[0.14em] -mr-[0.14em] uppercase' : 'font-num',
          SIZE[size],
          valueClassName,
        )}
        aria-hidden={ariaLabel ? true : undefined}
      >
        {value}
      </span>
    </span>
  );
}
