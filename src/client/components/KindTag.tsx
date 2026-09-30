import type { CSSProperties } from 'react';
import type { PhotoKind } from '../../shared/protocol';
import { useT } from '../i18n';
import { cn } from '../lib/util';
import { Icon, type IconName } from './Icon';
import { TAPE_CLIP } from './paper/geometry';
import { rel } from './paper/cls';

export type KindTone = 'sky' | 'pink' | 'mint' | 'sun' | 'lilac' | 'tangerine';

/** Color family of each photo kind (same families as the lobby slots): paper tones. */
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
  sm: { box: 'h-[22px] gap-1.5 pr-2.5 pl-2', text: 'text-[11px]', dot: 8, icon: 'size-3.5' },
  md: { box: 'h-[26px] gap-1.5 pr-3 pl-2.5', text: 'text-[12.5px]', dot: 9, icon: 'size-4' },
  lg: { box: 'h-[34px] gap-2 pr-3.5 pl-3', text: 'text-[15px]', dot: 12, icon: 'size-[18px]' },
};

export interface KindTagProps {
  kind: PhotoKind;
  size?: KindTagSize;
  /**
   * paper (default): typed on a strip of masking tape, the kind color only on the round
   * sorting sticker. fill: a strip of the kind's colored paper (use sparingly).
   */
  tone?: 'paper' | 'fill';
  /** Rotation in degrees (a label stuck on crooked). */
  tilt?: number;
  /** Optional icon before the text (the dot stays). */
  icon?: IconName;
  /** Override the text (defaults to the kind's short label). */
  label?: string;
  className?: string;
  style?: CSSProperties;
}

/**
 * The photo kind as a label typed on masking tape, with a round color-coding sticker (the
 * kind's color). <KindTag kind="sister" size="sm" tilt={-4} />
 */
export function KindTag({ kind, size = 'md', tone = 'paper', tilt = 0, icon, label, className, style }: KindTagProps) {
  const t = useT();
  const s = SIZES[size];
  const fill = tone === 'fill';
  return (
    <span
      className={cn(rel(className), 'inline-flex max-w-full shrink-0 items-center align-middle text-ink', s.box, className)}
      style={{
        rotate: tilt ? `${tilt}deg` : undefined,
        background: fill
          ? kindColor(kind)
          : 'linear-gradient(180deg, rgb(255 255 255 / 0.35), rgb(255 255 255 / 0) 45%, rgb(120 90 40 / 0.06)), rgb(238 226 186 / 0.92)',
        clipPath: TAPE_CLIP,
        ...style,
      }}
    >
      <span
        className="shrink-0 rounded-full"
        style={{ width: s.dot, height: s.dot, backgroundColor: fill ? 'var(--color-sheet)' : kindColor(kind), boxShadow: 'inset 0 0 0 1px rgb(23 19 15 / 0.25)' }}
        aria-hidden
      />
      {icon && <Icon name={icon} className={cn('-mr-0.5 shrink-0', s.icon)} />}
      <span className={cn('min-w-0 truncate font-type leading-none tracking-[0.04em] uppercase', s.text)}>{label ?? t(`common.kind.${kind}`)}</span>
    </span>
  );
}
