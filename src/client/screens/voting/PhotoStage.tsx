import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { useEffect, useState, type CSSProperties } from 'react';
import { BLUR_BONUS_BY_STEP, type PhotoRef, type VotingView } from '../../../shared/protocol';
import { Polaroid } from '../../components/Polaroid';
import { useT } from '../../i18n';
import { useServerNow } from '../../lib/time';
import { cn, seeded } from '../../lib/util';

export type BlurState = NonNullable<VotingView['blur']>;

/**
 * Photo box heights (the box is 4:5). The photo is capped by the viewport height so that on a
 * phone the question, the photo and the first row of candidates fit on one screen. The owner's
 * view is a bit smaller to make room for the "that's YOUR ___!" banner, and a blurred photo
 * leaves room for its focus meter under the picture.
 */
const BOX = {
  normal: { h: 'max(150px, min(40dvh, 100dvh - 420px, 440px))', lg: 'min(58dvh, 540px)' },
  compact: { h: 'max(140px, min(34dvh, 100dvh - 470px, 400px))', lg: 'min(58dvh, 540px)' },
  blur: { h: 'max(140px, min(36dvh, 100dvh - 465px, 410px))', lg: 'min(54dvh, 500px)' },
  blurCompact: { h: 'max(130px, min(29dvh, 100dvh - 530px, 350px))', lg: 'min(54dvh, 500px)' },
} as const;

/** A transparent pixel: the polaroid's own <img> stays empty while the blur layers paint the photo. */
const BLANK = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';

/**
 * Blur radius per step, in % of the photo's width (container query units, so a desktop photo is
 * as blurry as a phone one). A tiny variant is already pixelated: a lighter blur smooths it. The
 * full photo (uploaded without variants) needs a much stronger one.
 */
function blurAmount(step: number, steps: number, fromVariant: boolean): number {
  const left = steps > 1 ? Math.max(0, steps - 1 - step) / (steps - 1) : 0;
  if (left <= 0) return 0;
  return fromVariant ? 0.6 + 4.2 * left ** 1.3 : 1.4 + 8.6 * left ** 1.2;
}

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
  const t = useT();
  const box = BOX[blur ? (compact ? 'blurCompact' : 'blur') : compact ? 'compact' : 'normal'];
  const r = seeded(round * 977 + 13);
  const tilt = (r() * 2 - 1) * 4.5;
  const from = r() > 0.5 ? 1 : -1;
  // Never open a photo that is still blurry: the lightbox would show it sharp.
  const zoomable = !blur || blur.step >= blur.steps - 1;

  return (
    <div
      className={cn(
        'relative flex items-center justify-center pt-3',
        'h-[calc(var(--box)+var(--extra))] lg:h-[calc(var(--box-lg)+var(--extra))] lg:min-w-[calc(var(--box-lg)*0.8)]',
        className,
      )}
      style={{ '--box': box.h, '--box-lg': box.lg, '--extra': blur ? '4.25rem' : '2.25rem' } as CSSProperties}
    >
      <AnimatePresence initial={false}>
        {visible && (
          <motion.div
            key={photo.id}
            className="absolute"
            initial={{ x: `${from * 110}vw`, y: -60, rotate: from * 40, scale: 0.7 }}
            animate={{ x: 0, y: 0, rotate: 0, scale: 1 }}
            exit={{ x: `${-from * 110}vw`, y: 40, rotate: -from * 35, scale: 0.8, transition: { duration: 0.45, ease: 'easeIn' } }}
            transition={{ type: 'spring', stiffness: 170, damping: 19, mass: 0.9 }}
          >
            <Polaroid
              src={blur ? BLANK : photo.url}
              alt={zoomable ? t('voting.zoomLabel') : t('voting.blur.alt')}
              tilt={tilt}
              imageClassName="@container h-[var(--box)] w-[calc(var(--box)*0.8)] max-w-[calc(100vw-5rem)] lg:h-[var(--box-lg)] lg:w-[calc(var(--box-lg)*0.8)]"
              onOpen={zoomable ? onZoom : undefined}
              whileHover={zoomable ? { scale: 1.015 } : undefined}
              caption={blur ? <FocusMeter blur={blur} /> : undefined}
              overlay={
                <>
                  {blur && <BlurLayers url={photo.url} amount={blurAmount(blur.step, blur.steps, blur.fromVariant)} />}
                  {zoomable && (
                    <motion.span
                      initial={blur ? { scale: 0, rotate: -20 } : false}
                      animate={{ scale: 1, rotate: 0 }}
                      transition={{ type: 'spring', stiffness: 520, damping: 16 }}
                      className="pointer-events-none absolute top-2 right-2 flex items-center gap-1 rounded-full border-2 border-ink bg-cream/90 px-2 py-0.5 text-xs font-extrabold text-ink shadow-pop-sm"
                    >
                      <span aria-hidden>🔍</span>
                      {t('voting.zoom')}
                    </motion.span>
                  )}
                </>
              }
            />
            {blur && showBonus && <BonusSticker blur={blur} kept={keptBonus} />}
          </motion.div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {locked && (
          <motion.div
            key={`lock-${round}`}
            className="pointer-events-none absolute inset-x-0 top-1/2 z-10 flex justify-center"
            initial={{ scale: 3, opacity: 0, rotate: -30, y: '-50%' }}
            animate={{ scale: 1, opacity: 1, rotate: -10, y: '-50%' }}
            exit={{ scale: 0.6, opacity: 0, y: '-50%' }}
            transition={{ type: 'spring', stiffness: 520, damping: 20 }}
          >
            <span className="rounded-2xl border-[5px] border-danger bg-cream/95 px-5 py-2 font-display text-3xl whitespace-nowrap text-danger uppercase shadow-pop-lg outline-3 outline-ink sm:text-4xl">
              {t('voting.locked')}
            </span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/**
 * The blurred photo: each step's picture fades in over the previous one (they are different,
 * sharper variants), scaled up a little so the blur's soft edge stays outside the frame. The
 * same picture at a new step (full photo blurred here) just eases to its new blur.
 */
function BlurLayers({ url, amount }: { url: string; amount: number }) {
  const reduce = useReducedMotion();
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
    <span aria-hidden className="absolute inset-0 overflow-hidden bg-grape-200/50">
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
            transition: reduce ? 'opacity 0.3s ease' : 'opacity 0.7s ease, filter 0.9s ease, transform 0.9s ease',
          }}
        />
      ))}
    </span>
  );
}

/**
 * Under the blurred photo: one dot per sharpening step and when the next one comes ("Sharper in
 * 3s", just "3s" under a small photo).
 */
function FocusMeter({ blur }: { blur: BlurState }) {
  const t = useT();
  const now = useServerNow(250);
  const n = blur.step + 1;
  const sharp = blur.step >= blur.steps - 1;
  const left = blur.nextStepAt === null ? 0 : Math.ceil((blur.nextStepAt - now) / 1000);
  const [long, short] = sharp
    ? [`✨ ${t('voting.blur.sharp')}`, '✨']
    : left > 0
      ? [`🌫️ ${t('voting.blur.sharperIn', { s: left })}`, `🌫️ ${t('voting.blur.inShort', { s: left })}`]
      : [t('voting.blur.sharpening'), '🌫️'];
  return (
    // Sized by the photo above (w-0 min-w-full: it never widens the frame), and a size container.
    <span className="@container block w-0 min-w-full font-sans">
      <span className="flex items-center justify-between gap-2 px-0.5">
        <span className="flex shrink-0 items-center gap-1 @max-[9rem]:gap-0.5" role="img" aria-label={t('voting.blur.focusLabel', { n, total: blur.steps })}>
          {Array.from({ length: blur.steps }, (_, i) => (
            <motion.span
              key={i}
              className={cn(
                'block size-3 rounded-full border-ink @max-[9rem]:size-2 lg:size-4',
                i < blur.step && 'border-2 bg-mint @max-[9rem]:border-[1.5px]',
                i === blur.step && 'border-2 bg-sun @max-[9rem]:border-[1.5px]',
                i > blur.step && 'bg-ink/15',
              )}
              initial={false}
              animate={i === blur.step ? { scale: [1, 1.5, 1] } : { scale: 1 }}
              transition={{ duration: 0.45 }}
            />
          ))}
        </span>
        <span className="min-w-0 truncate text-xs leading-none font-extrabold text-ink-soft lg:text-sm" aria-hidden>
          <span className="@max-[14rem]:hidden">{long}</span>
          <span className="hidden @max-[14rem]:inline">{short}</span>
        </span>
      </span>
    </span>
  );
}

/** "+75 if you get it now": the speed bonus, a sticker slapped on the photo's corner. */
function BonusSticker({ blur, kept }: { blur: BlurState; kept: number | null }) {
  const t = useT();
  const now = BLUR_BONUS_BY_STEP[blur.step] ?? 0;
  const isKept = kept !== null && kept > 0;
  const value = isKept ? kept : now;
  const label = isKept ? t('voting.blur.kept') : value > 0 ? t('voting.blur.now') : t('voting.blur.none');
  return (
    <div className="pointer-events-none absolute -top-4 -left-6 z-20 lg:-left-10" aria-live="polite">
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.div
          key={`${value}-${isKept}`}
          className={cn(
            'flex w-[5.25rem] flex-col items-center rounded-2xl border-3 border-ink px-1 pt-1 pb-1.5 text-center text-ink shadow-pop-sm',
            isKept ? 'bg-mint' : value > 0 ? 'bg-sun' : 'bg-cream',
          )}
          initial={{ scale: 1.8, rotate: -30, opacity: 0 }}
          animate={{ scale: 1, rotate: -9, opacity: 1 }}
          exit={{ scale: 0.5, opacity: 0, transition: { duration: 0.15 } }}
          transition={{ type: 'spring', stiffness: 520, damping: 15 }}
        >
          <span className="font-display text-2xl leading-none whitespace-nowrap">
            {isKept && <span aria-hidden>✓ </span>}+{value}
          </span>
          <span className="mt-0.5 text-[10px] leading-[1.1] font-extrabold">{label}</span>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
