import { motion } from 'motion/react';
import type { PublicPlayer } from '../../shared/protocol';
import { useT } from '../i18n';
import { cn } from '../lib/util';
import { Icon } from './Icon';

export type AvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';

const SIZES: Record<AvatarSize, { box: string; emoji: string; crown: string; stroke: number }> = {
  xs: { box: 'size-7 border-2', emoji: 'text-base', crown: 'size-4 -top-2.5 -left-1.5', stroke: 3 },
  sm: { box: 'size-9 border-2', emoji: 'text-xl', crown: 'size-5 -top-3 -left-2', stroke: 2.8 },
  md: { box: 'size-12 border-3', emoji: 'text-2xl', crown: 'size-6 -top-3.5 -left-2', stroke: 2.6 },
  lg: { box: 'size-16 border-3', emoji: 'text-4xl', crown: 'size-8 -top-4.5 -left-2.5', stroke: 2.5 },
  xl: { box: 'size-24 border-4', emoji: 'text-5xl', crown: 'size-10 -top-5 -left-3', stroke: 2.4 },
  '2xl': { box: 'size-32 border-4', emoji: 'text-7xl', crown: 'size-12 -top-6 -left-3', stroke: 2.4 },
};

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
          initial={{ rotate: -30, scale: 0 }}
          animate={{ rotate: -18, scale: 1 }}
          transition={{ type: 'spring', stiffness: 500, damping: 18 }}
          className={cn('pointer-events-none absolute text-ink drop-shadow-[0_2px_0_var(--color-ink)]', s.crown)}
          role="img"
          aria-label={t('common.host')}
        >
          <Icon name="crown" fill="var(--color-sun)" strokeWidth={s.stroke} className="size-full" />
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
        {isMe && <Icon name="star" fill="currentColor" strokeWidth={2} className="mb-0.5 ml-1 inline size-3 align-middle opacity-60" />}
      </span>
      {trailing}
    </span>
  );
}
