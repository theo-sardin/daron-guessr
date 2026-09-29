import { motion } from 'motion/react';
import type { PublicPlayer } from '../../shared/protocol';
import { useT } from '../i18n';
import { cn } from '../lib/util';

export type AvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';

const SIZES: Record<AvatarSize, { box: string; emoji: string; crown: string }> = {
  xs: { box: 'size-7 border-2', emoji: 'text-base', crown: 'text-xs -top-2.5' },
  sm: { box: 'size-9 border-2', emoji: 'text-xl', crown: 'text-sm -top-3' },
  md: { box: 'size-12 border-3', emoji: 'text-2xl', crown: 'text-base -top-3.5' },
  lg: { box: 'size-16 border-3', emoji: 'text-4xl', crown: 'text-xl -top-4' },
  xl: { box: 'size-24 border-4', emoji: 'text-5xl', crown: 'text-2xl -top-5' },
  '2xl': { box: 'size-32 border-4', emoji: 'text-7xl', crown: 'text-3xl -top-6' },
};

type AvatarPlayer = Pick<PublicPlayer, 'avatar' | 'color'> & Partial<Pick<PublicPlayer, 'name' | 'isHost' | 'connected'>>;

export interface AvatarProps {
  player: AvatarPlayer;
  size?: AvatarSize;
  /** Show the 👑 on hosts (default true). */
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
          initial={{ rotate: -20, scale: 0 }}
          animate={{ rotate: -14, scale: 1 }}
          className={cn('pointer-events-none absolute -left-1 drop-shadow', s.crown)}
          aria-label={t('common.host')}
        >
          👑
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
        {isMe && <span className="ml-1 text-xs font-semibold opacity-60">★</span>}
      </span>
      {trailing}
    </span>
  );
}
