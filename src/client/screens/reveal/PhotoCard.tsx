import { AnimatePresence, motion } from 'motion/react';
import type { ReactNode, Ref } from 'react';
import { REVEAL_DRUMROLL_AT_MS, REVEAL_OWNER_AT_MS, type PublicPlayer } from '../../../shared/protocol';
import { Avatar } from '../../components/Avatar';
import { Polaroid } from '../../components/Polaroid';
import { cn } from '../../lib/util';
import { reached, type Stage, type StampKind } from './timeline';

/** Rubber stamp ink per verdict: one strong color each, on a paper-white patch. */
const STAMP_COLORS: Record<StampKind, string> = {
  spotted: '#1fb576',
  hidden: '#d93a3a',
  revealed: '#5530b8',
};

/**
 * Worn rubber-stamp texture: fractal noise turned into an alpha mask with a few missing specks,
 * so the stamp looks inked by hand instead of typeset.
 */
const STAMP_WEAR = `url("data:image/svg+xml;utf8,${encodeURIComponent(
  `<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='w'><feTurbulence type='fractalNoise' baseFrequency='0.55' numOctaves='3' seed='7'/><feColorMatrix values='0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 -4.2 3.3'/></filter><rect width='160' height='160' filter='url(#w)'/></svg>`,
)}")`;

/** How long the print sits in the developer (the drum roll), in seconds. */
const DEVELOP_S = (REVEAL_OWNER_AT_MS - REVEAL_DRUMROLL_AT_MS) / 1000;

export interface PhotoCardProps {
  src: string;
  alt: string;
  stage: Stage;
  tilt: number;
  /** Only set once the owner is revealed. */
  owner: PublicPlayer | null;
  stamp: { kind: StampKind; text: string } | null;
  /** Camera date imprint of this photo (see fakeDateStamp). */
  dateStamp: string;
  /** The viewer's verdict sticker (phones only; the full card is visible on wide screens). */
  badge: ReactNode;
  zoomLabel: string;
  onZoom: () => void;
  anchorRef: Ref<HTMLDivElement>;
}

/**
 * The photo being revealed: flies in, shrinks a bit on phones once the vote bars need room,
 * then goes into the darkroom for the drum roll: the lights go out, the red safelight comes
 * on and the print slowly develops, until the flash at the reveal brings it back to full
 * color. Then it gets rubber-stamped and the owner's avatar is slapped on it.
 */
export function PhotoCard({ src, alt, stage, tilt, owner, stamp, dateStamp, badge, zoomLabel, onZoom, anchorRef }: PhotoCardProps) {
  const big = !reached(stage, 'bars');
  const revealed = owner !== null;
  const developing = stage === 'drumroll';
  return (
    <motion.div
      ref={anchorRef}
      layout
      transition={{ layout: { type: 'spring', stiffness: 220, damping: 26 } }}
      className={cn('relative z-[31] mx-auto shrink-0', big ? 'w-[min(78vw,19rem)]' : 'w-[min(50vw,12.5rem)]', 'md:w-[21rem]')}
    >
      <div className={cn(developing && 'animate-shake')}>
        <motion.div
          className="relative flex"
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
        >
          <Polaroid
            src={src}
            alt={alt}
            className="w-full"
            onOpen={onZoom}
            aria-label={zoomLabel}
            // The owner's sticker lands on the date corner at the reveal: the imprint goes under it
            // (dropped in the flash) instead of peeking out half-covered next to the rubber stamp.
            dateStamp={revealed ? undefined : dateStamp}
            overlay={
              <>
                {/* Developer tray: the image starts almost black and slowly comes up. */}
                <motion.div
                  className="pointer-events-none absolute inset-0 bg-grape-950"
                  initial={false}
                  animate={developing ? { opacity: [0, 0.94, 0.9, 0.18] } : { opacity: 0 }}
                  transition={
                    developing
                      ? { duration: DEVELOP_S, times: [0, 0.1, 0.32, 1], ease: ['easeOut', 'linear', 'easeIn'] }
                      : { duration: revealed ? 0.12 : 0.3 }
                  }
                  aria-hidden
                />
                <AnimatePresence>
                  {stamp && (
                    <motion.div
                      key="stamp"
                      className="pointer-events-none absolute inset-x-0 bottom-[10%] flex justify-center"
                      initial={{ scale: 3.2, opacity: 0, rotate: -35 }}
                      animate={{ scale: 1, opacity: 1, rotate: -11 }}
                      transition={{ type: 'spring', stiffness: 600, damping: 22, delay: 0.08 }}
                    >
                      <RubberStamp color={STAMP_COLORS[stamp.kind]} text={stamp.text} />
                    </motion.div>
                  )}
                </AnimatePresence>
              </>
            }
          />
          {/*
           * The red safelight over the whole print (paper included): multiply keeps only the red
           * channel, like a real darkroom lamp. Off in a snap at the reveal, under the flash.
           */}
          <motion.div
            className="pointer-events-none absolute inset-0 rounded-md mix-blend-multiply"
            // The lamp hangs above the tray: the paper glows red at the top and falls off to dark red.
            style={{ background: 'radial-gradient(130% 100% at 50% -10%, var(--color-safelight) 0%, #c81e25 55%, #7d0f1a 100%)' }}
            initial={false}
            animate={{ opacity: developing ? 1 : 0 }}
            transition={{ duration: developing ? 0.25 : 0.12 }}
            aria-hidden
          />
        </motion.div>
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
              className="absolute top-1/2 left-1/2 -z-10 size-[180%] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-80 md:size-[150%]"
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

/** SPOTTED / UNDERCOVER / REVEALED: a typographic rubber stamp, double frame, worn ink. */
function RubberStamp({ color, text }: { color: string; text: string }) {
  return (
    <span
      className="rounded-lg bg-white/80 p-[3px] shadow-[0_2px_10px_rgb(27_16_54/0.35)]"
      style={{ maskImage: STAMP_WEAR, WebkitMaskImage: STAMP_WEAR, maskSize: '160px 160px', WebkitMaskSize: '160px 160px' }}
    >
      <span
        className="block rounded-md border-[4px] px-1 py-px"
        style={{ borderColor: color, color }}
      >
        <span
          className="block rounded-[3px] border-2 px-2.5 pt-0.5 font-display text-[clamp(1.2rem,5.6vw,2.1rem)] leading-[1.05] tracking-[0.04em] whitespace-nowrap uppercase [font-stretch:75%] md:text-[2.3rem]"
          style={{ borderColor: color }}
        >
          {text}
        </span>
      </span>
    </span>
  );
}
