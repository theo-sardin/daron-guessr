import { motion } from 'motion/react';
import { useState, type CSSProperties } from 'react';
import type { PublicPlayer } from '../../shared/protocol';
import { cn } from '../lib/util';
import { paperColor } from './Avatar';
import { rel } from './paper/cls';
import { Tape, type TapeTone } from './Tape';

export interface SelfiePrintProps {
  player: Pick<PublicPlayer, 'name' | 'avatar' | 'color'> & Partial<Pick<PublicPlayer, 'selfieUrl'>>;
  /** Width in px (default 96). */
  size?: number;
  /** Rotation in degrees (default -4). */
  tilt?: number;
  /** Handwritten caption (default the player's name; false for none). */
  caption?: string | false;
  /** Masking tape on top: true (cream) or a color (default true). */
  tape?: boolean | TapeTone;
  /** Slapped on when it mounts (default false). A number delays it (s). */
  animate?: boolean | number;
  className?: string;
  style?: CSSProperties;
}

/**
 * A player's face as a little photo-booth print, for comparison next to a game photo ("he has
 * his dad's nose!"): their selfie, or their emoji on their paper color when they have none,
 * with their name in ballpoint underneath.
 */
export function SelfiePrint({ player, size = 96, tilt = -4, caption, tape = true, animate = false, className, style }: SelfiePrintProps) {
  const [loaded, setLoaded] = useState(false);
  const tapeTone: TapeTone | null = tape === true ? 'cream' : tape || null;
  const text = caption === false ? null : (caption ?? player.name);
  const pad = Math.max(4, Math.round(size * 0.065));
  return (
    <motion.figure
      className={cn(rel(className), 'm-0 inline-block shrink-0 bg-[linear-gradient(160deg,#fffefa,#f5f1e6)] shadow-paper', className)}
      style={{ width: size, padding: pad, paddingBottom: text ? 0 : pad, ...style }}
      initial={animate !== false ? { opacity: 0, scale: 1.3, rotate: tilt + 10 } : false}
      animate={{ opacity: 1, scale: 1, rotate: tilt }}
      transition={{ type: 'spring', stiffness: 480, damping: 20, delay: typeof animate === 'number' ? animate : 0 }}
    >
      <div className="relative aspect-square w-full overflow-hidden" style={{ backgroundColor: paperColor(player.color) }}>
        {player.selfieUrl ? (
          <img
            src={player.selfieUrl}
            alt={player.name}
            draggable={false}
            onLoad={() => setLoaded(true)}
            className={cn('size-full object-cover transition-opacity duration-300', loaded ? 'opacity-100' : 'opacity-0')}
          />
        ) : (
          <span className="emoji flex size-full items-center justify-center" style={{ fontSize: size * 0.46 }} role="img" aria-label={player.name}>
            {player.avatar}
          </span>
        )}
        <span aria-hidden className="pointer-events-none absolute inset-0 shadow-[inset_0_0_0_1px_rgb(0_0_0/0.1)]" />
      </div>
      {text && (
        <figcaption className="text-pen truncate text-center -rotate-2" style={{ fontSize: Math.max(14, size * 0.19), lineHeight: 1.3, paddingBottom: pad * 0.4 }}>
          {text}
        </figcaption>
      )}
      {tapeTone && <Tape tone={tapeTone} width={size * 0.52} height={Math.max(14, size * 0.17)} rotate={tilt > 0 ? -6 : 5} className="left-1/2 -translate-x-1/2" style={{ top: -Math.max(7, size * 0.08) }} />}
    </motion.figure>
  );
}
