import type { ReactNode } from 'react';
import { cn } from '../lib/util';

export type StampVariant = 'seg7' | 'seg14' | 'mono';
export type StampSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';

const FONT: Record<StampVariant, string> = {
  seg7: 'font-stamp7',
  seg14: 'font-stamp14',
  mono: 'font-mono font-bold',
};

const SIZE: Record<StampSize, string> = {
  xs: 'text-[0.7rem]',
  sm: 'text-sm',
  md: 'text-xl',
  lg: 'text-3xl',
  xl: 'text-[2.75rem]',
  '2xl': 'text-6xl',
};

/** Unlit segments behind the digits (LCD look): every glyph position fully lit. */
const ALL_ON: Record<Exclude<StampVariant, 'mono'>, string> = { seg7: '8', seg14: '~' };

/** Characters DSEG7 has no glyph for (/ ' ? + …): drawn with DSEG14 so "03/08" or "'98" still read as segments. */
const SEG7_MISSING = /([^0-9A-Za-z\-:. !])/;

function renderSeg7(text: string): ReactNode {
  if (!SEG7_MISSING.test(text)) return text;
  return text.split(SEG7_MISSING).map((part, i) =>
    i % 2 ? (
      <span key={i} className="font-stamp14">
        {part}
      </span>
    ) : (
      part
    ),
  );
}

export interface StampProps {
  children: ReactNode;
  /** seg7: digits (timer, scores, "03/08"); seg14: letters + digits (room code); mono: Space Mono. */
  variant?: StampVariant;
  size?: StampSize;
  /** Space Mono micro-label above the stamp ("ROOM", "PHOTO", "SCORE"). */
  label?: ReactNode;
  /** Sit on a dark LCD plate (use it on light cards). */
  plate?: boolean;
  /** Faint unlit segments behind the digits. */
  ghost?: boolean;
  /** Orange glow (default true); off, it looks printed on paper. */
  glow?: boolean;
  className?: string;
  /** Extra classes for the digits line. */
  valueClassName?: string;
  /** Accessible text when the visual text is not meaningful as-is (e.g. "3 of 8"). */
  ariaLabel?: string;
}

/**
 * The orange date imprint of a disposable camera, for numbers and codes:
 * <Stamp>{"03/08"}</Stamp>, <Stamp variant="seg14" label="ROOM">BKXZ</Stamp>.
 */
export function Stamp({
  children,
  variant = 'seg7',
  size = 'md',
  label,
  plate,
  ghost,
  glow = true,
  className,
  valueClassName,
  ariaLabel,
}: StampProps) {
  const text = typeof children === 'string' || typeof children === 'number' ? String(children) : null;
  const value = variant === 'seg7' && text !== null ? renderSeg7(text) : children;
  const ghostText = ghost && variant !== 'mono' && text !== null ? text.replace(/[^\s:.'/]/g, ALL_ON[variant]) : null;

  return (
    <span
      className={cn(
        'inline-flex flex-col items-start gap-1 leading-none',
        plate && 'rounded-xl border-2 border-ink bg-ink px-2.5 pt-1.5 pb-2 text-cream shadow-[inset_0_0_0_1px_rgb(255_255_255_/_0.08),inset_0_-10px_18px_-12px_rgb(255_122_26_/_0.35)]',
        className,
      )}
      aria-label={ariaLabel}
      role={ariaLabel ? 'img' : undefined}
    >
      {label && <span className={cn('label-mono', plate ? 'text-cream/55' : 'opacity-70')}>{label}</span>}
      <span
        className={cn(
          'relative whitespace-nowrap tabular-nums',
          FONT[variant],
          SIZE[size],
          glow ? 'text-stamp' : 'text-stamp-flat',
          variant !== 'mono' && 'tracking-[0.06em]',
          valueClassName,
        )}
        aria-hidden={ariaLabel ? true : undefined}
      >
        {ghostText && (
          <span className="absolute inset-0 opacity-[0.12] [text-shadow:none]" aria-hidden>
            {variant === 'seg7' ? renderSeg7(ghostText) : ghostText}
          </span>
        )}
        <span className="relative">{value}</span>
      </span>
    </span>
  );
}
