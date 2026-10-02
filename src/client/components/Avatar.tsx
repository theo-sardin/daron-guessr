import { motion } from 'motion/react';
import type { PublicPlayer } from '../../shared/protocol';
import { useT } from '../i18n';
import { cn } from '../lib/util';

export type AvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';

const SIZES: Record<AvatarSize, { box: string; emoji: string; crown: string; badge: string }> = {
  xs: { box: 'size-7 border-2', emoji: 'text-base', crown: 'text-xs -top-2.5', badge: '' },
  sm: { box: 'size-9 border-2', emoji: 'text-xl', crown: 'text-sm -top-3', badge: '' },
  md: { box: 'size-12 border-3', emoji: 'text-2xl', crown: 'text-base -top-3.5', badge: 'size-5 text-[11px] border-2 -right-1 -bottom-1' },
  lg: { box: 'size-16 border-3', emoji: 'text-4xl', crown: 'text-xl -top-4', badge: 'size-7 text-base border-2 -right-1.5 -bottom-1' },
  xl: { box: 'size-24 border-4', emoji: 'text-5xl', crown: 'text-2xl -top-5', badge: 'size-9 text-xl border-3 -right-1 -bottom-1' },
  '2xl': { box: 'size-32 border-4', emoji: 'text-7xl', crown: 'text-3xl -top-6', badge: 'size-11 text-2xl border-3 right-0 -bottom-1' },
};

type AvatarPlayer = Pick<PublicPlayer, 'avatar' | 'color'> & Partial<Pick<PublicPlayer, 'name' | 'isHost' | 'connected' | 'selfieUrl'>>;

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
  /**
   * Show the player's selfie (`selfieUrl`) in the disc when they have one, with their emoji as a
   * little badge on the rim from md up (default false: the emoji). Tiny faces read badly.
   */
  selfie?: boolean;
  /**
   * Accessible name when the avatar stands alone (a voter stack, a podium): it becomes an image
   * named `label`. Without it the avatar is decorative (it sits next to the player's name).
   */
  label?: string;
}

/** Emoji avatar on the player's color, or their selfie with `selfie`. */
export function Avatar({ player, size = 'md', crown = true, dimOffline = true, className, highlight, selfie = false, label }: AvatarProps) {
  const t = useT();
  const s = SIZES[size];
  const offline = dimOffline && player.connected === false;
  const face = selfie && player.selfieUrl ? player.selfieUrl : null;
  return (
    <span className={cn('relative inline-flex shrink-0', className)} title={player.name} role={label ? 'img' : undefined} aria-label={label}>
      <span
        className={cn(
          'inline-flex items-center justify-center overflow-hidden rounded-full border-ink leading-none shadow-pop-sm',
          s.box,
          offline && 'grayscale opacity-45',
          highlight && 'shadow-glow',
        )}
        style={{ backgroundColor: player.color }}
        aria-hidden
      >
        {face ? (
          <img src={face} alt="" draggable={false} className="size-full object-cover" />
        ) : (
          <span className={cn(s.emoji, 'select-none')}>{player.avatar}</span>
        )}
      </span>
      {face && s.badge && (
        <span
          className={cn('absolute flex items-center justify-center rounded-full border-ink leading-none', s.badge, offline && 'grayscale opacity-45')}
          style={{ backgroundColor: player.color }}
          aria-hidden
        >
          {player.avatar}
        </span>
      )}
      {crown && player.isHost && (
        <motion.span
          initial={{ rotate: -20, scale: 0 }}
          animate={{ rotate: -14, scale: 1 }}
          className={cn('pointer-events-none absolute -left-1 drop-shadow', s.crown)}
          role="img"
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
  selfie,
}: {
  player: PublicPlayer;
  size?: AvatarSize;
  isMe?: boolean;
  className?: string;
  trailing?: React.ReactNode;
  /** Show the selfie in the avatar when there is one (see Avatar). */
  selfie?: boolean;
}) {
  return (
    <span className={cn('inline-flex min-w-0 items-center gap-2', className)}>
      <Avatar player={player} size={size} selfie={selfie} />
      <span className={cn('min-w-0 truncate font-bold', !player.connected && 'opacity-60')}>
        {player.name}
        {isMe && <span className="ml-1 text-xs font-semibold opacity-60">★</span>}
      </span>
      {trailing}
    </span>
  );
}
