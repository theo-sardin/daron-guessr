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

const SIZES: Record<KindTagSize, { box: string; text: string; dot: number; icon: string }> = {
  sm: { box: 'h-[22px] gap-1.5 pr-2 pl-1.5 rounded-[5px] border-2', text: 'text-[11px]', dot: 9, icon: 'size-3.5' },
  md: { box: 'h-[26px] gap-1.5 pr-2.5 pl-[7px] rounded-[6px] border-2', text: 'text-[12px]', dot: 10, icon: 'size-4' },
  lg: { box: 'h-[34px] gap-2 pr-3 pl-2.5 rounded-[7px] border-[2.5px]', text: 'text-[14px]', dot: 13, icon: 'size-[18px]' },
};

export interface KindTagProps {
  kind: PhotoKind;
  size?: KindTagSize;
  /**
   * paper (default): a white lab label, ink type, the kind color only on the sorting dot, so a
   * card keeps one dominant accent. fill: the whole label in the kind color (use sparingly,
   * e.g. one hero tag on a dark background).
   */
  tone?: 'paper' | 'fill';
  /** Rotation in degrees (a slapped-on label). */
  tilt?: number;
  /** Optional icon before the text (replaces nothing: the dot stays). */
  icon?: IconName;
  /** Override the text (defaults to the kind's short label). */
  label?: string;
  className?: string;
  style?: CSSProperties;
}

/**
 * The photo kind as a photo-lab label: a paper sticker with a round color-coding dot (the
 * kind's color, like the dots labs put on print envelopes) and Space Mono caps.
 * <KindTag kind="sister" size="sm" tilt={-4} />
 */
export function KindTag({ kind, size = 'md', tone = 'paper', tilt = 0, icon, label, className, style }: KindTagProps) {
  const t = useT();
  const s = SIZES[size];
  const fill = tone === 'fill';
  return (
    <span
      className={cn(
        'relative inline-flex max-w-full shrink-0 items-center border-ink align-middle text-ink shadow-[0_2px_0_0_var(--color-ink)]',
        s.box,
        !fill && 'bg-paper',
        className,
      )}
      style={{ rotate: tilt ? `${tilt}deg` : undefined, backgroundColor: fill ? kindColor(kind) : undefined, ...style }}
    >
      <span
        className="shrink-0 rounded-full border-ink"
        style={{ width: s.dot, height: s.dot, borderWidth: size === 'lg' ? 2 : 1.5, backgroundColor: fill ? 'var(--color-paper)' : kindColor(kind) }}
        aria-hidden
      />
      {icon && <Icon name={icon} className={cn('-mr-0.5 shrink-0', s.icon)} />}
      <span className={cn('min-w-0 truncate font-mono leading-none font-bold tracking-[0.06em] uppercase', s.text)}>
        {label ?? t(`common.kind.${kind}`)}
      </span>
    </span>
  );
}
