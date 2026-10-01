import { AnimatePresence, motion } from 'motion/react';
import { useRef, type ReactNode, type Ref } from 'react';
import { REVEAL_DRUMROLL_AT_MS, REVEAL_OWNER_AT_MS, type PhotoKind, type PublicPlayer } from '../../../shared/protocol';
import { Polaroid } from '../../components/Polaroid';
import { RubberStamp } from '../../components/RubberStamp';
import { PaperStrip } from '../../components/TornPaper';
import { useI18n } from '../../i18n';
import { cn } from '../../lib/util';
import type { Scene } from './kinds';
import {
  AlbumPage,
  Companion,
  CorkBoard,
  GlowUp,
  Hearts,
  LensCallout,
  Magnifier,
  PhotoCorners,
  PosterMasthead,
  ResemblanceMeter,
  SuspectBoard,
  TreeDoodle,
  type Suspect,
} from './scenes';
import { reached, type Stage } from './timeline';

/** How long the drum roll lasts (the magnifier zooms in meanwhile), in seconds. */
const DRUMROLL_S = (REVEAL_OWNER_AT_MS - REVEAL_DRUMROLL_AT_MS) / 1000;

const STRIP_TONE: Record<Scene, 'yellow' | 'blue' | 'pink' | 'mint' | null> = {
  album: null,
  tree: 'mint',
  glowup: 'yellow',
  board: null,
  poster: 'pink',
  lens: 'blue',
};

export interface PhotoStageProps {
  src: string;
  alt: string;
  kind: PhotoKind;
  scene: Scene;
  stage: Stage;
  index: number;
  tilt: number;
  /** Only set once the owner is revealed. */
  owner: PublicPlayer | null;
  /** The verdict stamp (owner revealed). */
  stamp: string | null;
  /** The owner reveal happens while this screen is open (sounds allowed). */
  live: boolean;
  /** Blur game: the photo stays blurred until the owner reveal wipes it clean. */
  blur: boolean;
  /** Share of correct votes (album: resemblance meter). */
  resemblance: number;
  /** Board scene: the pinned suspects (only candidates with votes, + the owner once revealed). */
  suspects: Suspect[];
  /** The viewer's verdict sticker. */
  badge: ReactNode;
  zoomLabel: string;
  onZoom: () => void;
  anchorRef: Ref<HTMLDivElement>;
}

/**
 * The photo being revealed, taped on a torn halftone strip, with the decorations of its mode
 * (see SCENE): it flies in (or turns in on an album page), shakes during the drum roll, gets a
 * rubber stamp thumped on it at the reveal and slides aside for the owner's print.
 */
export function PhotoStage(p: PhotoStageProps) {
  const { t } = useI18n();
  const { scene, stage, owner } = p;
  const revealed = owner !== null;
  const shaking = stage === 'drumroll';
  const board = scene === 'board';
  const shift = revealed && !board;
  const lensZoom = scene === 'lens' && stage === 'drumroll';
  // A blur wipe only plays when the reveal happens on screen (a late join lands on the sharp photo).
  const wipe = useRef(!revealed).current;
  const strip = STRIP_TONE[scene];

  const caption = revealed ? sceneCaption(scene, p.kind, t) : t('reveal.scene.mystery', { n: p.index + 1 });

  return (
    <div className="relative mx-auto h-[300px] w-full max-w-[24rem] md:h-[384px] md:max-w-[30rem]">
      {strip && <PaperStrip tone={strip} tilt={-4} bleed="md" className="-inset-x-8 top-[78px] h-[118px] md:top-[100px] md:h-[150px]" seed={`reveal-${p.index}`} />}
      {scene === 'album' && <AlbumPage />}
      {board && <CorkBoard />}

      {/* The print. */}
      <motion.div
        ref={p.anchorRef}
        className={cn(
          'absolute left-1/2 z-[2]',
          board ? 'top-[26px] -ml-[92px] w-[184px] md:top-[30px] md:-ml-[112px] md:w-[224px]' : 'top-3 -ml-[106px] w-[212px] md:top-4 md:-ml-[130px] md:w-[260px]',
        )}
        initial={
          scene === 'album'
            ? { opacity: 0, rotateY: -120, x: 0, transformPerspective: 900, originX: 0 }
            : { opacity: 0, y: 240, x: -80, rotate: -30, scale: 0.4 }
        }
        animate={{ opacity: 1, rotateY: 0, y: 0, x: shift ? '-29%' : 0, rotate: p.tilt, scale: 1 }}
        transition={{
          type: 'spring',
          stiffness: 170,
          damping: 19,
          rotateY: { duration: 0.8, ease: [0.3, 0.6, 0.25, 1], delay: 0.1 },
          x: shift ? { type: 'spring', stiffness: 260, damping: 24 } : { type: 'spring', stiffness: 170, damping: 19 },
        }}
      >
        <div className={cn('relative', shaking && 'animate-shake')}>
          {scene === 'poster' && revealed && <PosterMasthead />}
          {scene === 'album' && <PhotoCorners />}
          <Polaroid
            src={p.src}
            alt={p.alt}
            className="w-full"
            tape={scene === 'album' || board ? false : 'cream'}
            caption={caption}
            captionClassName="text-[20px] mt-1.5 md:text-[23px] truncate px-1"
            onOpen={p.onZoom}
            aria-label={p.zoomLabel}
            overlay={
              <>
                {/* Body parts: the magnifier zooms in on the detail during the drum roll, then pulls back. */}
                {scene === 'lens' && (
                  <motion.img
                    src={p.src}
                    alt=""
                    draggable={false}
                    className="pointer-events-none absolute inset-0 size-full object-cover"
                    initial={false}
                    animate={{ scale: lensZoom ? 1.9 : 1, opacity: lensZoom ? 1 : 0 }}
                    transition={lensZoom ? { duration: DRUMROLL_S, ease: 'easeIn' } : { scale: { duration: 0.7, ease: 'easeOut' }, opacity: { duration: 0.2, delay: 0.6 } }}
                  />
                )}
                {p.blur && (
                  <BlurWipe src={p.src} revealed={revealed} wipe={wipe} />
                )}
              </>
            }
          />
          {board && <span aria-hidden className="absolute -top-2 left-1/2 z-10 size-4 -translate-x-1/2 rounded-full border-2 border-ink bg-red shadow-[0_2px_0_rgb(0_0_0/0.3)]" />}
          <AnimatePresence>
            {p.stamp && (
              <div key="stamp" className={cn('pointer-events-none absolute inset-x-0 top-[50%] z-[6] flex', shift ? '-left-3 justify-start' : 'justify-center')}>
                <RubberStamp top backing animate={0.15} sound={p.live} size={stampSize(p.stamp)} tilt={-11}>
                  {p.stamp}
                </RubberStamp>
              </div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>

      {/* Body parts: the magnifier rests on the print until the reveal. */}
      <AnimatePresence>
        {scene === 'lens' && !revealed && (
          <motion.div
            key="lens"
            className="pointer-events-none absolute top-[150px] right-[10%] z-[5] md:top-[200px] md:right-[14%]"
            initial={{ opacity: 0, scale: 0.5, rotate: 30 }}
            animate={lensZoom ? { opacity: 1, scale: 1.25, rotate: -6, x: -60, y: -50 } : { opacity: 1, scale: 1, rotate: 0, x: 0, y: 0 }}
            exit={{ opacity: 0, scale: 0.6, transition: { duration: 0.2 } }}
            transition={lensZoom ? { duration: DRUMROLL_S * 0.8, ease: 'easeInOut' } : { type: 'spring', stiffness: 300, damping: 18, delay: 0.5 }}
          >
            <Magnifier size={88} />
          </motion.div>
        )}
      </AnimatePresence>

      {board && reached(stage, 'bars') && <SuspectBoard suspects={p.suspects} culpritId={owner?.id ?? null} live={p.live} />}

      {owner && !board && (
        <>
          <Companion owner={owner} caption={companionCaption(p.scene, p.kind, owner.name, t)} />
          {scene === 'album' && <ResemblanceMeter value={p.resemblance} />}
          {scene === 'glowup' && <GlowUp />}
          {scene === 'tree' && <TreeDoodle relation={t(`reveal.relation.${p.kind}`)} />}
          {scene === 'poster' && <Hearts />}
          {scene === 'lens' && <LensCallout />}
        </>
      )}

      {p.badge && <div className="pointer-events-none absolute bottom-0 left-0 z-[8] md:-left-2">{p.badge}</div>}
    </div>
  );
}

/** The blurred print, wiped clean by an eraser at the reveal. */
function BlurWipe({ src, revealed, wipe }: { src: string; revealed: boolean; wipe: boolean }) {
  return (
    <>
      <motion.div
        className="pointer-events-none absolute inset-0 overflow-hidden"
        initial={false}
        animate={{ clipPath: revealed ? 'inset(0 0 0 100%)' : 'inset(0 0 0 0%)' }}
        transition={{ duration: revealed && wipe ? 0.75 : 0, ease: 'easeInOut', delay: revealed && wipe ? 0.1 : 0 }}
      >
        <img src={src} alt="" draggable={false} className="size-full scale-110 object-cover blur-[12px]" />
      </motion.div>
      {revealed && wipe && (
        <motion.span
          aria-hidden
          className="pointer-events-none absolute -top-2 -bottom-2 w-5 rounded-[4px] border-2 border-ink bg-pink shadow-paper-sm"
          initial={{ left: '-6%', opacity: 1, rotate: 8 }}
          animate={{ left: '100%', opacity: [1, 1, 0], rotate: [8, -6, 8] }}
          transition={{ duration: 0.8, ease: 'easeInOut', delay: 0.08 }}
        />
      )}
    </>
  );
}

/** Long verdicts ("CRUSH SECRET") get a smaller stamp so they fit the print. */
function stampSize(text: string): number {
  return Math.max(18, Math.min(30, Math.round(230 / Math.max(6, text.length))));
}

type T = ReturnType<typeof useI18n>['t'];

/** Caption of the photo once revealed: what it is compared with the owner's print. */
function sceneCaption(scene: Scene, kind: PhotoKind, t: T): string {
  if (scene === 'glowup') return t(kind === 'kid' ? 'reveal.scene.thenCaption' : 'reveal.scene.photoCaption');
  if (scene === 'board') return t('reveal.scene.evidence');
  return t(`common.kind.${kind}`);
}

function companionCaption(scene: Scene, kind: PhotoKind, name: string, t: T): string {
  if (scene === 'glowup') return t(kind === 'kid' ? 'reveal.scene.nowCaption' : 'reveal.scene.irlCaption', { name });
  return name;
}
