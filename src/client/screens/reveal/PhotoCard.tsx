import { AnimatePresence, motion } from 'motion/react';
import { useRef, type ReactNode, type Ref } from 'react';
import { REVEAL_DRUMROLL_AT_MS, REVEAL_OWNER_AT_MS, type PhotoKind, type PublicPlayer } from '../../../shared/protocol';
import { Polaroid } from '../../components/Polaroid';
import { useI18n } from '../../i18n';
import { cn } from '../../lib/util';
import type { Scene } from './kinds';
import {
  BlurWipe,
  Companion,
  GlowUpBadge,
  Hearts,
  PhotoLens,
  PosterTitle,
  RelationSticker,
  ResemblanceGauge,
  SceneTag,
  SuspectBoard,
  type Suspect,
} from './scenes';
import { reached, type Stage, type StampKind } from './timeline';

const STAMP_COLORS: Record<StampKind, string> = {
  spotted: '#1fb576',
  hidden: '#d93a3a',
  revealed: '#5530b8',
};

/** How long the drum roll lasts (the body-part photo zooms in meanwhile), in seconds. */
const DRUMROLL_S = (REVEAL_OWNER_AT_MS - REVEAL_DRUMROLL_AT_MS) / 1000;

export interface PhotoCardProps {
  src: string;
  alt: string;
  kind: PhotoKind;
  scene: Scene;
  stage: Stage;
  tilt: number;
  /** Only set once the owner is revealed. */
  owner: PublicPlayer | null;
  stamp: { kind: StampKind; text: string } | null;
  /** Blur game: the photo stays blurred until the owner reveal wipes it clean. */
  blur: boolean;
  /** Share of right guesses (album: the resemblance gauge), null without votes. */
  resemblance: number | null;
  /** Board scene: the pinned suspects (candidates with votes, + the owner once revealed). */
  suspects: Suspect[];
  /** The viewer's verdict sticker (phones only; the full card is visible on wide screens). */
  badge: ReactNode;
  zoomLabel: string;
  onZoom: () => void;
  anchorRef: Ref<HTMLDivElement>;
}

/**
 * The photo being revealed: flies in, shrinks a bit on phones once the vote bars need room,
 * shakes during the drum roll, then gets stamped while the owner's face slides in next to it
 * with the touch of the photo's mode (see SCENE). On the detective board the suspects are
 * pinned around it instead, and the culprit gets caught.
 */
export function PhotoCard(p: PhotoCardProps) {
  const { t } = useI18n();
  const { scene, stage, owner, stamp } = p;
  const big = !reached(stage, 'bars');
  const revealed = owner !== null;
  const board = scene === 'board';
  // The owner's face joins the photo (the board shows them among the suspects instead).
  const side = revealed && !board;
  const lensZoom = scene === 'lens' && stage === 'drumroll';
  // The blur is only wiped on screen when the reveal happens live (a late join lands on the sharp photo).
  const wipe = useRef(!revealed).current;

  return (
    // The stage: room on the right for the owner's face (the photo slides over), or around for the suspects.
    <div
      className={cn(
        'relative mx-auto flex w-full max-w-[24rem] shrink-0 md:w-[24rem] md:max-w-none lg:w-[28rem]',
        side && 'pr-[6.75rem] md:pr-[7rem] lg:pr-[8.5rem]',
      )}
    >
      {board && reached(stage, 'bars') && <SuspectBoard suspects={p.suspects} culpritId={owner?.id ?? null} />}

      <motion.div
        ref={p.anchorRef}
        layout
        transition={{ layout: { type: 'spring', stiffness: 220, damping: 26 } }}
        className={cn('relative z-[2] mx-auto shrink-0', big ? 'w-[min(78vw,19rem)]' : 'w-[min(50vw,12.5rem)]', 'md:w-[16rem] lg:w-[19rem]')}
      >
        <div className={cn(stage === 'drumroll' && 'animate-shake')}>
          <Polaroid
            src={p.src}
            alt={p.alt}
            className="w-full"
            onOpen={p.onZoom}
            aria-label={p.zoomLabel}
            initial={{ opacity: 0, y: 260, x: -90, rotate: -30, scale: 0.35 }}
            animate={
              revealed
                ? { opacity: 1, y: 0, x: 0, rotate: p.tilt, scale: [1, 0.9, 1.05, 1] }
                : { opacity: 1, y: 0, x: 0, rotate: p.tilt, scale: 1 }
            }
            transition={{
              type: 'spring',
              stiffness: 170,
              damping: 17,
              scale: revealed ? { duration: 0.5, times: [0, 0.25, 0.6, 1], delay: 0.05 } : { type: 'spring', stiffness: 170, damping: 17 },
            }}
            overlay={
              <>
                {/* Body parts: zoomed in on the detail during the drum roll, back out at the reveal. */}
                {scene === 'lens' && (
                  <motion.img
                    src={p.src}
                    alt=""
                    draggable={false}
                    className="pointer-events-none absolute inset-0 size-full object-cover"
                    initial={false}
                    animate={{ scale: lensZoom ? 1.9 : 1, opacity: lensZoom ? 1 : 0 }}
                    transition={
                      lensZoom
                        ? { duration: DRUMROLL_S, ease: 'easeIn' }
                        : { scale: { duration: 0.6, ease: 'easeOut' }, opacity: { duration: 0.2, delay: 0.5 } }
                    }
                  />
                )}
                {p.blur && <BlurWipe src={p.src} revealed={revealed} wipe={wipe} />}
                <AnimatePresence>
                  {stamp && (
                    <motion.div
                      key="stamp"
                      className="pointer-events-none absolute inset-x-0 bottom-[10%] flex justify-center"
                      initial={{ scale: 3.2, opacity: 0, rotate: -35 }}
                      animate={{ scale: 1, opacity: 1, rotate: -11 }}
                      transition={{ type: 'spring', stiffness: 600, damping: 22, delay: p.blur && wipe ? 0.5 : 0.08 }}
                    >
                      <span
                        className="rounded-xl border-[5px] bg-white/85 px-3 py-0.5 font-display leading-tight tracking-wider whitespace-nowrap uppercase shadow-lg"
                        style={{
                          color: STAMP_COLORS[stamp.kind],
                          borderColor: STAMP_COLORS[stamp.kind],
                          // Long verdicts ("AFFAIRE CLASSÉE") shrink to stay on the print.
                          fontSize: `calc(${Math.min(1, 8.5 / Math.max(1, stamp.text.length)).toFixed(3)} * clamp(1.25rem, 6vw, 2.25rem))`,
                        }}
                      >
                        {stamp.text}
                      </span>
                    </motion.div>
                  )}
                </AnimatePresence>
              </>
            }
          />
        </div>

        {/* Then vs now: the photo's tag (the face next to it gets the other one). */}
        {side && scene === 'glowup' && (
          <span aria-hidden className="pointer-events-none absolute -bottom-2.5 left-2 z-[3]">
            <SceneTag tilt={-6} delay={0.55}>
              {t(p.kind === 'kid' ? 'reveal.scene.then' : 'reveal.scene.photo')}
            </SceneTag>
          </span>
        )}

        {/* Body parts: the 🔍 rests on the print until the reveal. */}
        <AnimatePresence>{scene === 'lens' && !revealed && <PhotoLens key="lens" zoom={lensZoom} drumrollS={DRUMROLL_S} />}</AnimatePresence>

        {owner && side && (
          <>
            <Companion
              owner={owner}
              lens={scene === 'lens'}
              label={scene === 'glowup' ? t(p.kind === 'kid' ? 'reveal.scene.now' : 'reveal.scene.irl') : undefined}
            />
            {scene === 'album' && <ResemblanceGauge value={p.resemblance} />}
            {scene === 'glowup' && <GlowUpBadge />}
            {scene === 'tree' && <RelationSticker text={t(`reveal.relation.${p.kind}`)} />}
            {scene === 'poster' && <PosterTitle />}
          </>
        )}

        {p.badge && (
          // On the board the corners belong to the suspects: the verdict goes under the photo.
          <div className={cn('pointer-events-none absolute z-10 md:hidden', board ? '-bottom-5 left-1/2 -translate-x-1/2' : '-top-4 -left-4')}>{p.badge}</div>
        )}
      </motion.div>

      {owner && scene === 'poster' && <Hearts />}
    </div>
  );
}
