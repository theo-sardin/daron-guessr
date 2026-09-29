import type { CSSProperties } from 'react';
import type { PhotoKind } from '../../shared/protocol';
import { useT } from '../i18n';
import { cn } from '../lib/util';
import { Icon, type IconName } from './Icon';

export type KindTone = 'sky' | 'pink' | 'mint' | 'sun' | 'lilac' | 'tangerine';

/** Color family of each photo kind (same families as the lobby slots). */
export const KIND_TONE: Record<PhotoKind, KindTone> = {
  daron: 'sky',
  daronne: 'pink',
  brother: 'mint',
  sister: 'lilac',
  grandpa: 'sun',
  grandma: 'tangerine',
  friend: 'mint',
  partner: 'pink',
  pet: 'sun',
  kid: 'tangerine',
  pick: 'lilac',
};

/** CSS color of a kind, e.g. `style={{ backgroundColor: kindColor('sister') }}`. */
export const kindColor = (kind: PhotoKind) => `var(--color-${KIND_TONE[kind]})`;

export type KindTagSize = 'sm' | 'md' | 'lg';

/** Tag height, pointer width (px) and type size per size. */
const SIZES: Record<KindTagSize, { h: number; p: number; text: string; icon: string; eyelet: number }> = {
  sm: { h: 22, p: 8, text: 'text-[10px]', icon: 'size-3', eyelet: 6 },
  md: { h: 26, p: 9, text: 'text-[11.5px]', icon: 'size-3.5', eyelet: 7 },
  lg: { h: 34, p: 11, text: 'text-[14px]', icon: 'size-4', eyelet: 9 },
};

const BORDER = 2;

/** Price-tag outline: pointed left end, tiny chamfers on the right corners. */
function tagShape(p: number) {
  return `polygon(${p}px 0, calc(100% - 3px) 0, 100% 3px, 100% calc(100% - 3px), calc(100% - 3px) 100%, ${p}px 100%, 0 50%)`;
}

export interface KindTagProps {
  kind: PhotoKind;
  size?: KindTagSize;
  /** Rotation in degrees (a slapped-on label). */
  tilt?: number;
  /** Optional icon after the eyelet. */
  icon?: IconName;
  /** Override the text (defaults to the kind's short label). */
  label?: string;
  className?: string;
  style?: CSSProperties;
}

/**
 * The photo kind as a paper luggage tag: pointed end with an eyelet, kind color, ink
 * outline, Space Mono caps. <KindTag kind="sister" size="sm" tilt={-4} />
 */
export function KindTag({ kind, size = 'md', tilt = 0, icon, label, className, style }: KindTagProps) {
  const t = useT();
  const s = SIZES[size];
  const inner = s.p * ((s.h - BORDER * 2) / s.h);
  return (
    <span
      className={cn('relative inline-flex max-w-full shrink-0 items-center align-middle text-ink', className)}
      style={{ height: s.h, rotate: tilt ? `${tilt}deg` : undefined, filter: 'drop-shadow(0 2px 0 var(--color-ink))', ...style }}
    >
      <span className="absolute inset-0 bg-ink" style={{ clipPath: tagShape(s.p) }} aria-hidden />
      <span
        className="absolute"
        style={{ inset: BORDER, left: BORDER + 0.6, backgroundColor: kindColor(kind), clipPath: tagShape(inner) }}
        aria-hidden
      />
      {/* Eyelet: a reinforced punched hole. */}
      <span
        className="relative shrink-0 rounded-full border-ink bg-cream"
        style={{ width: s.eyelet, height: s.eyelet, marginLeft: s.p - 1, borderWidth: size === 'lg' ? 2.5 : 2 }}
        aria-hidden
      />
      {icon && <Icon name={icon} className={cn('relative ml-1 shrink-0', s.icon)} strokeWidth={2.6} />}
      <span
        className={cn('relative min-w-0 truncate pr-2 pl-1.5 font-mono leading-none font-bold tracking-[0.06em] uppercase', s.text)}
      >
        {label ?? t(`common.kind.${kind}`)}
      </span>
    </span>
  );
}
