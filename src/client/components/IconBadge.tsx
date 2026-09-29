import type { CSSProperties } from 'react';
import { cn } from '../lib/util';
import { Icon, type IconName, type IconWeight } from './Icon';

export type IconBadgeTone = 'sun' | 'pink' | 'mint' | 'sky' | 'tangerine' | 'lilac' | 'danger' | 'cream' | 'ink';
export type IconBadgeSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

const SIZE: Record<IconBadgeSize, { box: string; icon: string; shadow: string }> = {
  xs: { box: 'size-7 rounded-[0.6rem] border-2', icon: 'size-4', shadow: 'shadow-[0_2px_0_0_var(--color-ink)]' },
  sm: { box: 'size-8 rounded-xl border-2', icon: 'size-[1.2rem]', shadow: 'shadow-[0_2px_0_0_var(--color-ink)]' },
  md: { box: 'size-11 rounded-[0.9rem] border-3', icon: 'size-6', shadow: 'shadow-pop-sm' },
  lg: { box: 'size-16 rounded-[1.3rem] border-3', icon: 'size-9', shadow: 'shadow-pop-sm' },
  xl: { box: 'size-20 rounded-[1.6rem] border-3', icon: 'size-11', shadow: 'shadow-pop' },
};

/** Tile color, icon color and the default body fill of the two-tone icon. */
const TONE: Record<IconBadgeTone, { bg: string; fg: string; fill: string }> = {
  sun: { bg: 'bg-sun', fg: 'text-ink', fill: '#fff' },
  pink: { bg: 'bg-pink', fg: 'text-ink', fill: '#fff' },
  mint: { bg: 'bg-mint', fg: 'text-ink', fill: '#fff' },
  sky: { bg: 'bg-sky', fg: 'text-ink', fill: '#fff' },
  tangerine: { bg: 'bg-tangerine', fg: 'text-ink', fill: '#fff' },
  lilac: { bg: 'bg-lilac', fg: 'text-ink', fill: '#fff' },
  danger: { bg: 'bg-danger', fg: 'text-ink', fill: '#fff' },
  cream: { bg: 'bg-cream', fg: 'text-ink', fill: 'var(--color-sun)' },
  // A hairline of light keeps the ink tile visible on the night background.
  ink: { bg: 'bg-ink ring-[1.5px] ring-inset ring-white/15', fg: 'text-cream', fill: 'transparent' },
};

export interface IconBadgeProps {
  name: IconName;
  /** Tile color (default sun). One accent per card: match the card's accent or go cream. */
  tone?: IconBadgeTone;
  size?: IconBadgeSize;
  /** Body color of the two-tone icon (default white, or sun on cream). */
  fill?: string;
  /** Rotation in degrees (a slapped-on sticker). */
  tilt?: number;
  /** Hard ink shadow under the tile (default true). */
  shadow?: boolean;
  weight?: IconWeight;
  /** Accessible label; decorative without it. */
  label?: string;
  className?: string;
  style?: CSSProperties;
}

/**
 * An icon as a sticker: ink outline + one accent, on a colored tile with a hard shadow. Use it
 * wherever an emoji used to head a card, a step, a setting or a toast:
 * <IconBadge name="camera" tone="sun" size="md" tilt={-4} />
 */
export function IconBadge({ name, tone = 'sun', size = 'md', fill, tilt, shadow = true, weight, label, className, style }: IconBadgeProps) {
  const s = SIZE[size];
  const t = TONE[tone];
  return (
    <span
      className={cn('inline-flex shrink-0 items-center justify-center border-ink', s.box, t.bg, t.fg, shadow && s.shadow, className)}
      style={tilt ? { rotate: `${tilt}deg`, ...style } : style}
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    >
      <Icon name={name} fill={fill ?? t.fill} weight={weight} className={s.icon} />
    </span>
  );
}
