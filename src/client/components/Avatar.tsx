import { motion } from 'motion/react';
import type { PublicPlayer } from '../../shared/protocol';
import { useT } from '../i18n';
import { cn } from '../lib/util';
import { Icon } from './Icon';

export type AvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';

/**
 * `crown`: [size, top, left] in px. The crown sits on the upper-left rim of the circle, about a
 * third of it overlapping the avatar, and scales with it (never under 18px).
 */
const SIZES: Record<AvatarSize, { box: string; emoji: string; crown: [number, number, number] }> = {
  xs: { box: 'size-7 border-2', emoji: 'text-base', crown: [18, -8.5, -2] },
  sm: { box: 'size-9 border-2', emoji: 'text-xl', crown: [20, -9, -1] },
  md: { box: 'size-12 border-3', emoji: 'text-2xl', crown: [24, -10.5, 0] },
  lg: { box: 'size-16 border-3', emoji: 'text-4xl', crown: [30, -12, 1] },
  xl: { box: 'size-24 border-4', emoji: 'text-5xl', crown: [40, -14.5, 5] },
  '2xl': { box: 'size-32 border-4', emoji: 'text-7xl', crown: [50, -17, 9] },
};

/** A cream halo around the crown: it separates it from the avatar and still reads on the dark night. */
const HALO = [
  'drop-shadow(1.5px 0 0 var(--color-cream))',
  'drop-shadow(-1.5px 0 0 var(--color-cream))',
  'drop-shadow(0 1.5px 0 var(--color-cream))',
  'drop-shadow(0 -1.5px 0 var(--color-cream))',
].join(' ');

type AvatarPlayer = Pick<PublicPlayer, 'avatar' | 'color'> & Partial<Pick<PublicPlayer, 'name' | 'isHost' | 'connected'>>;

export interface AvatarProps {
  player: AvatarPlayer;
  size?: AvatarSize;
  /** Show the crown on hosts (default true). */
  crown?: boolean;
  /** Grey out disconnected players (default true). */
  dimOffline?: boolean;
  className?: string;
  /** Adds a glowing ring (e.g. the revealed owner). */
  highlight?: boolean;
}

/** Emoji avatar on the player's color. */
export function Avatar({ player, size = 'md', crown = true, dimOffline = true, className, highlight }: AvatarProps) {
  const t = useT();
  const s = SIZES[size];
  const offline = dimOffline && player.connected === false;
  return (
    <span className={cn('relative inline-flex shrink-0', className)} title={player.name}>
      <span
        className={cn(
          'inline-flex items-center justify-center rounded-full border-ink leading-none shadow-pop-sm',
          s.box,
          offline && 'grayscale opacity-45',
          highlight && 'shadow-glow',
        )}
        style={{ backgroundColor: player.color }}
      >
        <span className={cn(s.emoji, 'select-none')} aria-hidden>
          {player.avatar}
        </span>
      </span>
      {crown && player.isHost && (
        <motion.span
          initial={{ rotate: -34, scale: 0 }}
          animate={{ rotate: -20, scale: 1 }}
          transition={{ type: 'spring', stiffness: 500, damping: 18 }}
          className="pointer-events-none absolute text-ink"
          style={{ width: s.crown[0], height: s.crown[0], top: s.crown[1], left: s.crown[2], filter: HALO }}
          role="img"
          aria-label={t('common.host')}
        >
          <Icon name="crown" fill="var(--color-sun)" weight="bold" className="block size-full" />
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
      <span className={cn('min-w-0 truncate font-bold', !player.connected && 'opacity-60')}>
        {player.name}
        {isMe && <Icon name="star" fill="currentColor" className="mb-0.5 ml-1 inline size-3 align-middle opacity-60" />}
      </span>
      {trailing}
    </span>
  );
}
