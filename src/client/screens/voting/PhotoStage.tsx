import { AnimatePresence, motion } from 'motion/react';
import type { CSSProperties } from 'react';
import type { PhotoRef } from '../../../shared/protocol';
import { Icon } from '../../components/Icon';
import { Polaroid } from '../../components/Polaroid';
import { fakeDateStamp, Stamp } from '../../components/Stamp';
import { Viewfinder } from '../../components/Viewfinder';
import { useT } from '../../i18n';
import { cn, seeded } from '../../lib/util';

/**
 * Photo box sizes. The photo is capped by the viewport height so that on a phone the
 * question, the photo and the first row of candidates fit on one screen. The owner's
 * view is a bit smaller to make room for the "that's YOUR ___!" banner.
 */
const SIZES = {
  normal: {
    slot: 'h-[calc(max(150px,min(40dvh,100dvh_-_420px,440px))+2.25rem)] lg:h-[calc(min(58dvh,540px)+2.25rem)]',
    box: 'h-[max(150px,min(40dvh,100dvh_-_420px,440px))] w-[calc(max(150px,min(40dvh,100dvh_-_420px,440px))*0.8)] lg:h-[min(58dvh,540px)] lg:w-[min(46.4dvh,432px)]',
  },
  compact: {
    slot: 'h-[calc(max(140px,min(34dvh,100dvh_-_470px,400px))+2.25rem)] lg:h-[calc(min(58dvh,540px)+2.25rem)]',
    box: 'h-[max(140px,min(34dvh,100dvh_-_470px,400px))] w-[calc(max(140px,min(34dvh,100dvh_-_470px,400px))*0.8)] lg:h-[min(58dvh,540px)] lg:w-[min(46.4dvh,432px)]',
  },
} as const;

/** Viewfinder geometry inside the photo (px), shared by the brackets and the HUD next to them. */
const VF = { inset: 10, length: 22, thickness: 3.5 };
/** The brackets snap into focus once the print has landed, not while it is still flying in. */
const SNAP_DELAY = 0.42;

/** Worn-ink texture for the rubber stamp (alpha mask: mostly opaque, with specks where the ink missed). */
const INK_MASK =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.7' numOctaves='2' seed='7' stitchTiles='stitch'/%3E%3CfeColorMatrix values='0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 0 -14 10.5'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")";

export function PhotoStage({
  photo,
  round,
  visible,
  locked,
  compact,
  onZoom,
  className,
}: {
  photo: PhotoRef;
  round: number;
  visible: boolean;
  locked: boolean;
  compact: boolean;
  onZoom: () => void;
  className?: string;
}) {
  const t = useT();
  const size = SIZES[compact ? 'compact' : 'normal'];
  const r = seeded(round * 977 + 13);
  const tilt = (r() * 2 - 1) * 4.5;
  const from = r() > 0.5 ? 1 : -1;

  return (
    <div className={cn('relative flex items-center justify-center pt-3', size.slot, className)}>
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
              src={photo.url}
              tilt={tilt}
              imageClassName={cn(size.box, 'max-w-[calc(100vw-5rem)] @container')}
              onOpen={onZoom}
              whileHover={{ scale: 1.015 }}
              // On a phone the owner's banner covers the bottom of the print: the HUD moves up.
              overlay={<ViewfinderHud dateStamp={fakeDateStamp(photo.id)} zoom={t('voting.zoom')} top={compact} />}
            />
          </motion.div>
        )}
      </AnimatePresence>
      <AnimatePresence>{locked && <LockedStamp key={`lock-${round}`} label={t('voting.locked')} />}</AnimatePresence>
    </div>
  );
}

/**
 * What you see through the camera: white brackets snapping into focus, a tiny "zoom" hint in the
 * bottom-left and the photo's own date imprint in the bottom-right, both tucked between the arms.
 */
function ViewfinderHud({ dateStamp, zoom, top }: { dateStamp: string; zoom: string; top?: boolean }) {
  // 10px inset + 22px arm + 6px: right next to the bottom brackets. `top` (phone only, where the
  // owner's banner overlaps the print) moves the zoom hint under the top-left bracket instead.
  const beside = VF.inset + VF.length + 6;
  return (
    <>
      <Viewfinder
        // Phone, owner's view: the banner overlaps the bottom of the print, so the frame stops
        // above it instead of leaving two bracket stubs poking out from under the banner.
        className={cn('pointer-events-none absolute inset-x-0 top-0', top ? 'bottom-7 lg:bottom-0' : 'bottom-0')}
        color="#ffffff"
        gap={-VF.inset}
        length={VF.length}
        thickness={VF.thickness}
        snap={SNAP_DELAY}
        shadow
      />
      <motion.span
        className={cn(
          'pointer-events-none absolute flex items-center gap-1 rounded-full bg-ink/55 py-[3px] pr-2 pl-1.5 text-white backdrop-blur-[2px]',
          top ? 'top-[9px] lg:top-auto lg:bottom-[9px]' : 'bottom-[9px]',
        )}
        style={{ left: beside }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: SNAP_DELAY + 0.25 }}
      >
        <Icon name="zoom" className="size-3.5" />
        <span className="label-mono text-[10px]">{zoom}</span>
      </motion.span>
      {/* Hidden under the owner's banner on a phone, and on prints too narrow for both. */}
      <motion.span
        // Only when the print is wide enough for both (not on a 320px phone).
        className={cn('pointer-events-none absolute bottom-[11px] hidden leading-none', top ? 'lg:block' : '@min-[240px]:block')}
        style={{ right: beside }}
        initial={{ opacity: 0 }}
        animate={{ opacity: [0, 1, 0.5, 1] }}
        transition={{ delay: SNAP_DELAY + 0.1, duration: 0.4 }}
        aria-hidden
      >
        <Stamp size="xs" valueClassName="stamp-on-photo">
          {dateStamp}
        </Stamp>
      </motion.span>
    </>
  );
}

const INK_STYLE: CSSProperties = { maskImage: INK_MASK, WebkitMaskImage: INK_MASK, maskSize: '220px', WebkitMaskSize: '220px' };

/**
 * "Votes locked" slammed on the print like a rubber stamp: double rule, worn red ink, a padlock.
 * The paper patch under it stays solid (readable on any photo); only the ink layer is worn.
 * Sized in `em` off a font size that shrinks with the viewport, so the long French label
 * ("Les jeux sont faits") never spills past a 320px screen.
 */
function LockedStamp({ label }: { label: string }) {
  return (
    <motion.div
      className="pointer-events-none absolute inset-x-0 top-1/2 z-10 flex justify-center px-2"
      initial={{ scale: 2.6, opacity: 0, rotate: -24, y: '-50%' }}
      animate={{ scale: 1, opacity: 1, rotate: -9, y: '-50%' }}
      exit={{ scale: 0.6, opacity: 0, y: '-50%' }}
      transition={{ type: 'spring', stiffness: 560, damping: 22 }}
    >
      <span className="relative rounded-[0.42em] bg-cream/90 text-[length:min(2rem,7.4vw)] shadow-[0_0.12em_0_0_rgb(27_16_54_/_0.35)] sm:text-[2.5rem]" role="status">
        <span
          className="flex items-center gap-[0.28em] rounded-[0.42em] border-[0.15em] border-danger-dark py-[0.2em] pr-[0.45em] pl-[0.35em] text-danger-dark shadow-[inset_0_0_0_0.09em_var(--color-cream),inset_0_0_0_0.17em_var(--color-danger-dark)]"
          style={INK_STYLE}
        >
          <Icon name="lock" className="size-[0.95em] shrink-0" weight="bold" />
          <span className="font-display leading-none tracking-[0.01em] whitespace-nowrap uppercase [font-stretch:78%]">{label}</span>
        </span>
      </span>
    </motion.div>
  );
}
