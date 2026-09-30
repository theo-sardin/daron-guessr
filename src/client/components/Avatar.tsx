import { motion } from 'motion/react';
import type { PublicPlayer } from '../../shared/protocol';
import { useT } from '../i18n';
import { cn } from '../lib/util';
import { Icon } from './Icon';
import { MarkerCircle } from './Marker';
import { rel } from './paper/cls';

export type AvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';

/**
 * `d`: diameter (px). `crown`: [size, top, left] in px: the crown sits on the upper-left rim of
 * the disc, about a third of it overlapping, and scales with it (never under 18px).
 */
const SIZES: Record<AvatarSize, { d: number; crown: [number, number, number] }> = {
  xs: { d: 28, crown: [18, -8.5, -3] },
  sm: { d: 36, crown: [20, -9, -2] },
  md: { d: 48, crown: [24, -10.5, -1] },
  lg: { d: 64, crown: [30, -12, 0] },
  xl: { d: 96, crown: [40, -14.5, 4] },
  '2xl': { d: 128, crown: [50, -17, 8] },
};

/**
 * The server hands out bright party colors; on paper they become the zine's paper tones
 * (post-it yellow, pink, mint, sky…). Unknown colors are mixed with paper white.
 */
const PAPER_TONES: Record<string, string> = {
  '#ff4fa3': '#f6a6c1',
  '#ffd23f': '#ffdf3d',
  '#3ddc97': '#9ed9c0',
  '#4cc9f0': '#a9c8f2',
  '#ff8c42': '#f7a866',
  '#b388ff': '#c9b8f0',
  '#ff5d5d': '#f4897a',
  '#7bd389': '#b8de9a',
  '#f7a6d7': '#f9c9de',
  '#5e8bff': '#8fa8ee',
  '#ffb86b': '#fbcb94',
  '#2ec4b6': '#86d3c8',
};

/** A player color as a paper tone: `style={{ backgroundColor: paperColor(player.color) }}`. */
export function paperColor(color: string | undefined): string {
  if (!color) return 'var(--color-sheet)';
  return PAPER_TONES[color.toLowerCase()] ?? `color-mix(in srgb, ${color} 62%, #fffdf6)`;
}

/** A white halo around the crown so it reads on any disc. */
const HALO = ['drop-shadow(1.5px 0 0 #fff)', 'drop-shadow(-1.5px 0 0 #fff)', 'drop-shadow(0 1.5px 0 #fff)', 'drop-shadow(0 -1.5px 0 #fff)'].join(' ');

type AvatarPlayer = Pick<PublicPlayer, 'avatar' | 'color'> & Partial<Pick<PublicPlayer, 'name' | 'isHost' | 'connected'>>;

export interface AvatarProps {
  player: AvatarPlayer;
  size?: AvatarSize;
  /** Show the crown on hosts (default true). */
  crown?: boolean;
  /** Grey out disconnected players (default true). */
  dimOffline?: boolean;
  className?: string;
  /** Circled in red marker (e.g. the revealed owner). */
  highlight?: boolean;
  /** Rotation in degrees (a sticker slapped on a bit crooked). */
  tilt?: number;
}

/** The player's emoji on a disc of colored paper with a white rim (a round sticker). */
export function Avatar({ player, size = 'md', crown = true, dimOffline = true, className, highlight, tilt }: AvatarProps) {
  const t = useT();
  const s = SIZES[size];
  const offline = dimOffline && player.connected === false;
  const rim = Math.max(2, Math.round(s.d * 0.07));
  const disc = (
    <span
      className={cn('emoji inline-flex items-center justify-center rounded-full leading-none select-none', offline && 'opacity-45 grayscale')}
      style={{
        width: s.d,
        height: s.d,
        backgroundColor: paperColor(player.color),
        border: `${rim}px solid #fff`,
        boxShadow: '0 1px 1px rgb(40 25 10 / 0.25), 0 3px 7px -2px rgb(40 25 10 / 0.35)',
        fontSize: Math.round(s.d * 0.5),
        rotate: tilt ? `${tilt}deg` : undefined,
      }}
      aria-hidden
    >
      {player.avatar}
    </span>
  );
  return (
    <span className={cn(rel(className), 'inline-flex shrink-0', className)} title={player.name}>
      {highlight ? (
        <MarkerCircle pad={Math.max(5, s.d * 0.12)} strokeWidth={s.d > 60 ? 3.6 : 3} className="flex">
          {disc}
        </MarkerCircle>
      ) : (
        disc
      )}
      {crown && player.isHost && (
        <motion.span
          initial={{ rotate: -34, scale: 0 }}
          animate={{ rotate: -20, scale: 1 }}
          transition={{ type: 'spring', stiffness: 500, damping: 18 }}
          className="pointer-events-none absolute z-20 text-ink"
          style={{ width: s.crown[0], height: s.crown[0], top: s.crown[1], left: s.crown[2], filter: HALO }}
          role="img"
          aria-label={t('common.host')}
        >
          <Icon name="crown" fill="var(--color-yellow)" weight="bold" className="block size-full" />
        </motion.span>
      )}
    </span>
  );
}

/** Avatar + name on one line. */
export function PlayerChip({
  player,
  size = 'sm',
  isMe,
  className,
  trailing,
}: {
  player: PublicPlayer;
  size?: AvatarSize;
  isMe?: boolean;
  className?: string;
  trailing?: React.ReactNode;
}) {
  return (
    <span className={cn('inline-flex min-w-0 items-center gap-2', className)}>
      <Avatar player={player} size={size} />
      <span className={cn('min-w-0 truncate font-extrabold tracking-[-0.01em] text-ink', !player.connected && 'opacity-60')}>
        {player.name}
        {isMe && <Icon name="star" fill="var(--color-yellow)" className="mb-0.5 ml-1 inline size-3.5 align-middle" />}
      </span>
      {trailing}
    </span>
  );
}
