import type { CSSProperties } from 'react';
import { cn } from '../lib/util';
import { Icon, type IconName, type IconWeight } from './Icon';
import { hash, scissorClip } from './paper/geometry';

export type IconBadgeTone = 'sun' | 'pink' | 'mint' | 'sky' | 'tangerine' | 'lilac' | 'danger' | 'cream' | 'ink' | 'kraft' | 'blue';
export type IconBadgeSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

const SIZE: Record<IconBadgeSize, { box: string; icon: string }> = {
  xs: { box: 'size-7', icon: 'size-4' },
  sm: { box: 'size-8', icon: 'size-[1.2rem]' },
  md: { box: 'size-11', icon: 'size-6' },
  lg: { box: 'size-16', icon: 'size-9' },
  xl: { box: 'size-20', icon: 'size-11' },
};

/** Paper of the scrap, icon color and the default body fill of the two-tone icon. */
const TONE: Record<IconBadgeTone, { bg: string; fg: string; fill: string }> = {
  sun: { bg: 'paper-postit', fg: 'text-ink', fill: '#fff' },
  pink: { bg: 'paper-pink', fg: 'text-ink', fill: '#fff' },
  mint: { bg: 'paper-mint', fg: 'text-ink', fill: '#fff' },
  sky: { bg: 'paper-sky', fg: 'text-ink', fill: '#fff' },
  tangerine: { bg: 'bg-tangerine', fg: 'text-ink', fill: '#fff' },
  lilac: { bg: 'paper-lilac', fg: 'text-ink', fill: '#fff' },
  danger: { bg: 'paper-red', fg: 'text-white', fill: 'transparent' },
  cream: { bg: 'paper-sheet', fg: 'text-ink', fill: 'var(--color-yellow)' },
  kraft: { bg: 'paper-kraft', fg: 'text-ink', fill: 'var(--color-sheet)' },
  blue: { bg: 'bg-blue', fg: 'text-white', fill: 'transparent' },
  ink: { bg: 'paper-ink', fg: 'text-[#fff6e0]', fill: 'transparent' },
};

export interface IconBadgeProps {
  name: IconName;
  /** Paper color (default sun = post-it yellow). */
  tone?: IconBadgeTone;
  size?: IconBadgeSize;
  /** Body color of the two-tone icon (default white, or yellow on a white scrap). */
  fill?: string;
  /** Rotation in degrees (a scrap glued on crooked). */
  tilt?: number;
  /** Paper shadow under the scrap (default true). */
  shadow?: boolean;
  weight?: IconWeight;
  /** Accessible label; decorative without it. */
  label?: string;
  className?: string;
  style?: CSSProperties;
}

/**
 * An ink icon on a scissor-cut scrap of colored paper. Use it wherever an emoji used to head a
 * card, a step, a setting or a toast: <IconBadge name="camera" tone="sun" size="md" tilt={-4} />
 */
export function IconBadge({ name, tone = 'sun', size = 'md', fill, tilt, shadow = true, weight, label, className, style }: IconBadgeProps) {
  const s = SIZE[size];
  const t = TONE[tone];
  return (
    <span
      className={cn('inline-flex shrink-0', shadow && 'lift-sm', className)}
      style={tilt ? { rotate: `${tilt}deg`, ...style } : style}
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    >
      <span className={cn('inline-flex items-center justify-center', s.box, t.bg, t.fg)} style={{ clipPath: scissorClip(hash(`${name}${tone}`), 7) }}>
        <Icon name={name} fill={fill ?? t.fill} weight={weight} className={s.icon} />
      </span>
    </span>
  );
}
