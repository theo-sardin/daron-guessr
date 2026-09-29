import { AnimatePresence, motion } from 'motion/react';
import type { ReactNode, Ref } from 'react';
import type { PublicPlayer } from '../../../shared/protocol';
import { Avatar } from '../../components/Avatar';
import { Polaroid } from '../../components/Polaroid';
import { cn } from '../../lib/util';
import { reached, type Stage, type StampKind } from './timeline';

const STAMP_COLORS: Record<StampKind, string> = {
  spotted: '#1fb576',
  hidden: '#d93a3a',
  revealed: '#5530b8',
};

export interface PhotoCardProps {
  src: string;
  alt: string;
  stage: Stage;
  tilt: number;
  /** Only set once the owner is revealed. */
  owner: PublicPlayer | null;
  stamp: { kind: StampKind; text: string } | null;
  /** The viewer's verdict sticker (phones only; the full card is visible on wide screens). */
  badge: ReactNode;
  zoomLabel: string;
  onZoom: () => void;
  anchorRef: Ref<HTMLDivElement>;
}

/**
 * The photo being revealed: flies in, shrinks a bit on phones once the vote bars need room,
 * shakes during the drum roll, then gets stamped and the owner's avatar is slapped on it.
 */
export function PhotoCard({ src, alt, stage, tilt, owner, stamp, badge, zoomLabel, onZoom, anchorRef }: PhotoCardProps) {
  const big = !reached(stage, 'bars');
  const revealed = owner !== null;
  return (
    <motion.div
      ref={anchorRef}
      layout
      transition={{ layout: { type: 'spring', stiffness: 220, damping: 26 } }}
      className={cn('relative mx-auto shrink-0', big ? 'w-[min(78vw,19rem)]' : 'w-[min(50vw,12.5rem)]', 'md:w-[21rem]')}
    >
      <div className={cn(stage === 'drumroll' && 'animate-shake')}>
        <Polaroid
          src={src}
          alt={alt}
          className="w-full"
          onOpen={onZoom}
          aria-label={zoomLabel}
          initial={{ opacity: 0, y: 260, x: -90, rotate: -30, scale: 0.35 }}
          animate={
            revealed
              ? { opacity: 1, y: 0, x: 0, rotate: tilt, scale: [1, 0.9, 1.05, 1] }
              : { opacity: 1, y: 0, x: 0, rotate: tilt, scale: 1 }
          }
          transition={{
            type: 'spring',
            stiffness: 170,
            damping: 17,
            scale: revealed ? { duration: 0.5, times: [0, 0.25, 0.6, 1], delay: 0.05 } : { type: 'spring', stiffness: 170, damping: 17 },
          }}
          overlay={
            <AnimatePresence>
              {stamp && (
                <motion.div
                  key="stamp"
                  className="pointer-events-none absolute inset-x-0 bottom-[10%] flex justify-center"
                  initial={{ scale: 3.2, opacity: 0, rotate: -35 }}
                  animate={{ scale: 1, opacity: 1, rotate: -11 }}
                  transition={{ type: 'spring', stiffness: 600, damping: 22, delay: 0.08 }}
                >
                  <span
                    className="rounded-xl border-[5px] bg-white/85 px-3 py-0.5 font-display text-[clamp(1.25rem,6vw,2.25rem)] leading-tight tracking-wider whitespace-nowrap uppercase shadow-lg md:text-4xl"
                    style={{ color: STAMP_COLORS[stamp.kind], borderColor: STAMP_COLORS[stamp.kind] }}
                  >
                    {stamp.text}
                  </span>
                </motion.div>
              )}
            </AnimatePresence>
          }
        />
      </div>

      {badge && <div className="pointer-events-none absolute -top-4 -left-4 z-10 md:hidden">{badge}</div>}

      {/* The owner's avatar, slapped on the corner like a sticker, with a spinning sunburst. */}
      <AnimatePresence>
        {owner && (
          <motion.div
            key="owner"
            className="pointer-events-none absolute -right-5 -bottom-6 z-10 md:-right-6 md:-bottom-8"
            initial={{ scale: 0, rotate: -200 }}
            animate={{ scale: 1, rotate: 8 }}
            transition={{ type: 'spring', stiffness: 380, damping: 14, delay: 0.15 }}
          >
            <motion.div
              className="absolute top-1/2 left-1/2 -z-10 size-[180%] -translate-x-1/2 md:size-[150%] -translate-y-1/2 rounded-full opacity-80"
              style={{
                background: `repeating-conic-gradient(${owner.color} 0deg 12deg, transparent 12deg 30deg)`,
                maskImage: 'radial-gradient(circle, black 35%, transparent 70%)',
                WebkitMaskImage: 'radial-gradient(circle, black 35%, transparent 70%)',
              }}
              animate={{ rotate: 360 }}
              transition={{ duration: 9, repeat: Infinity, ease: 'linear' }}
            />
            <span className="block md:hidden">
              <Avatar player={owner} size="lg" crown={false} dimOffline={false} highlight />
            </span>
            <span className="hidden md:block">
              <Avatar player={owner} size="xl" crown={false} dimOffline={false} highlight />
            </span>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
