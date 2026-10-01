import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useState } from 'react';
import { BLUR_BONUS_BY_STEP, type PhotoRef, type VotingView } from '../../../shared/protocol';
import { Annotation, MarkerArrow } from '../../components/Marker';
import { Polaroid } from '../../components/Polaroid';
import { RubberStamp } from '../../components/RubberStamp';
import { PaperStrip } from '../../components/TornPaper';
import { useI18n } from '../../i18n';
import { cn, seeded } from '../../lib/util';
import { hashOf, quipGroup } from './quips';

/**
 * Width of the print's photo. On a phone it is capped by the viewport height so the question,
 * the photo and the first row of candidates fit on one screen; the owner's print is a bit
 * smaller to make room for the "that's YOUR ___!" note.
 */
const BOX = {
  normal: 'w-[clamp(150px,min(58vw,100dvh_-_560px),250px)] lg:w-[min(44dvh,380px)]',
  compact: 'w-[clamp(140px,min(54vw,100dvh_-_610px),220px)] lg:w-[min(42dvh,360px)]',
} as const;

/** A transparent pixel: the print's own <img> stays empty while the blur layers paint the photo. */
const BLANK = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';

/**
 * Blur radius per step, in % of the photo's width (container query units, so a desktop print is
 * as blurry as a phone one). A tiny variant is already pixelated: a lighter blur smooths it. The
 * full photo (uploaded without variants) needs a much stronger one.
 */
function blurAmount(step: number, steps: number, fromVariant: boolean): number {
  const left = steps > 1 ? Math.max(0, steps - 1 - step) / (steps - 1) : 0;
  if (left <= 0) return 0;
  return fromVariant ? 0.6 + 4.2 * left ** 1.3 : 1.4 + 8.6 * left ** 1.2;
}

export type BlurState = NonNullable<VotingView['blur']>;

export function PhotoStage({
  photo,
  round,
  visible,
  locked,
  compact,
  blur,
  /** Bonus kept from the step you last changed your vote at (null: not voted yet / unknown). */
  keptBonus,
  showBonus,
  onZoom,
  className,
}: {
  photo: PhotoRef;
  round: number;
  visible: boolean;
  locked: boolean;
  compact: boolean;
  blur: BlurState | null;
  keptBonus: number | null;
  showBonus: boolean;
  onZoom: () => void;
  className?: string;
}) {
  const { t, tpick } = useI18n();
  const r = seeded(round * 977 + 13);
  const tilt = (r() * 2 - 1) * 3.2;
  const from = r() > 0.5 ? 1 : -1;
  const blurring = blur !== null && blur.step < blur.steps - 1;
  const seed = hashOf(photo.id);

  return (
    <div className={cn('relative', className)}>
      {/* The torn blue halftone strip the print is glued on (bleeds across the window on desktop). */}
      <PaperStrip tone="blue" tilt={from * 4} bleed="md" seed={photo.id} className="-inset-x-8 top-[46%] h-[42%] lg:top-[40%] lg:h-[38%]" />
      <div className="relative min-h-[120px] pt-3 pl-2 lg:pl-0">
        <AnimatePresence initial={false} mode="popLayout">
          {visible && (
            <motion.div
              key={photo.id}
              className="relative z-[2] w-fit"
              initial={{ x: `${from * 110}vw`, y: -60, rotate: from * 30, scale: 0.75 }}
              animate={{ x: 0, y: 0, rotate: 0, scale: 1 }}
              exit={{ x: `${-from * 110}vw`, y: 40, rotate: -from * 25, scale: 0.8, transition: { duration: 0.4, ease: 'easeIn' } }}
              transition={{ type: 'spring', stiffness: 180, damping: 20, mass: 0.9 }}
            >
              <Polaroid
                src={blur ? BLANK : photo.url}
                tilt={tilt}
                tape
                caption={blur ? <FocusScale blur={blur} /> : compact ? undefined : t('voting.zoom')}
                captionClassName={cn('mt-2 text-[1.35rem] lg:text-[1.6rem]', blur && 'rotate-0!')}
                imageClassName={cn(BOX[compact ? 'compact' : 'normal'], 'aspect-[1/1.04] @container')}
                onOpen={blurring ? undefined : onZoom}
                className="p-[10px]!"
                overlay={blur ? <BlurLayers url={photo.url} amount={blurAmount(blur.step, blur.steps, blur.fromVariant)} /> : undefined}
              />
              <AnimatePresence>
                {locked && (
                  <motion.div key="lock" className="pointer-events-none absolute inset-x-0 top-[38%] z-10 flex justify-center" exit={{ opacity: 0 }} role="status">
                    <RubberStamp backing animate={0.05} size={19} tilt={-11} className="lg:scale-125">
                      {t('voting.locked')}
                    </RubberStamp>
                  </motion.div>
                )}
              </AnimatePresence>
              {/* Margin note on the right of the print: the blur bonus, or a red marker remark with an arrow. */}
              <div className="absolute top-3 left-full z-10 ml-1 w-[clamp(64px,calc(100vw_-_100%_-_2.6rem),128px)] lg:ml-3 lg:w-[150px]">
                {blur && showBonus ? (
                  <BonusNote blur={blur} kept={keptBonus} />
                ) : (
                  <>
                    <Annotation rotate={6} delay={0.7} size={19} className="block text-[17px]! sm:text-[19px]! lg:text-[22px]!">
                      {tpick(`voting.transition.notes.${quipGroup(photo.kind)}`, seed)}
                    </Annotation>
                    <MarkerArrow from={[60, 6]} to={[-14, 70]} bend={-0.3} delay={1.1} className="relative mt-1 block h-[64px] w-[90%]" />
                  </>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

/**
 * The blurred photo: each step's picture fades in over the previous one (they are different,
 * sharper variants), scaled up a little so the blur's soft edge stays outside the frame.
 */
function BlurLayers({ url, amount }: { url: string; amount: number }) {
  const [layers, setLayers] = useState<{ url: string; amount: number; loaded: boolean }[]>(() => [{ url, amount, loaded: false }]);
  useEffect(() => {
    setLayers((ls) => (ls.at(-1)?.url === url ? ls.map((l, i) => (i === ls.length - 1 ? { ...l, amount } : l)) : [...ls.slice(-2), { url, amount, loaded: false }]));
  }, [url, amount]);
  const onLoad = (u: string) => {
    setLayers((ls) => ls.map((l) => (l.url === u ? { ...l, loaded: true } : l)));
    // Once the sharper one is in, the older ones can go (after the crossfade).
    window.setTimeout(() => {
      setLayers((ls) => {
        const i = ls.findIndex((l) => l.url === u);
        return i > 0 ? ls.slice(i) : ls;
      });
    }, 900);
  };
  return (
    <span aria-hidden className="absolute inset-0 overflow-hidden bg-paper-dark">
      {layers.map((l) => (
        <img
          key={l.url}
          src={l.url}
          alt=""
          draggable={false}
          onLoad={() => onLoad(l.url)}
          className="absolute inset-0 size-full object-cover"
          style={{
            opacity: l.loaded ? 1 : 0,
            filter: l.amount > 0 ? `blur(${l.amount.toFixed(2)}cqw) saturate(1.08)` : 'none',
            transform: `scale(${(1 + (l.amount * 3.2) / 100).toFixed(3)})`,
            transition: 'opacity 0.7s ease, filter 0.9s ease, transform 0.9s ease',
          }}
        />
      ))}
    </span>
  );
}

/** Under the print: "focus" in typewriter and one little box per sharpening step, drawn in marker. */
function FocusScale({ blur }: { blur: BlurState }) {
  const { t } = useI18n();
  const n = blur.step + 1;
  return (
    <span className="flex items-center justify-center gap-2 not-italic" role="img" aria-label={t('voting.blur.focusLabel', { n, total: blur.steps })}>
      <span className="label-type text-[0.8rem] text-ink">{t('voting.blur.focus')}</span>
      <span className="flex items-center gap-[3px]" aria-hidden>
        {Array.from({ length: blur.steps }, (_, i) => (
          <motion.i
            key={i}
            className={cn(
              'block size-[13px] rounded-[2px]',
              i < blur.step && 'bg-ink/80',
              i === blur.step && 'border-2 border-red bg-red/25',
              i > blur.step && 'border-[1.5px] border-dashed border-ink/35',
            )}
            style={{ rotate: `${((i * 37) % 7) - 3}deg` }}
            animate={i === blur.step ? { scale: [1, 1.25, 1] } : { scale: 1 }}
            transition={i === blur.step ? { duration: 0.5 } : undefined}
          />
        ))}
      </span>
      <span className="font-num text-[1.05rem] text-ink" aria-hidden>
        {n}/{blur.steps}
      </span>
    </span>
  );
}

/** "+75 if you get it now": the speed bonus scribbled next to the print. */
function BonusNote({ blur, kept }: { blur: BlurState; kept: number | null }) {
  const { t } = useI18n();
  const now = BLUR_BONUS_BY_STEP[blur.step] ?? 0;
  const value = kept ?? now;
  const label = kept !== null ? t('voting.blur.kept') : value > 0 ? t('voting.blur.now') : t('voting.blur.none');
  return (
    <motion.div className="origin-top-left" initial={{ rotate: 6 }} animate={{ rotate: 6 }} aria-live="polite">
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span
          key={`${value}-${kept !== null}`}
          className={cn('block font-marker leading-none text-red-ink', value > 0 ? 'text-[2.4rem] lg:text-[2.9rem]' : 'text-[1.6rem]')}
          initial={{ scale: 1.6, rotate: -12, opacity: 0 }}
          animate={{ scale: 1, rotate: 0, opacity: 1 }}
          exit={{ scale: 0.6, opacity: 0, transition: { duration: 0.15 } }}
          transition={{ type: 'spring', stiffness: 480, damping: 16 }}
        >
          {value > 0 ? `+${value}` : t('voting.blur.sharp')}
        </motion.span>
      </AnimatePresence>
      <span className="text-pen mt-0.5 block text-[1.05rem] leading-[0.95] lg:text-[1.3rem]">{label}</span>
    </motion.div>
  );
}
