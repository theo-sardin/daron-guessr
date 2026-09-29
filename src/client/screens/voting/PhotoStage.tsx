import { AnimatePresence, motion } from 'motion/react';
import type { PhotoRef } from '../../../shared/protocol';
import { Polaroid } from '../../components/Polaroid';
import { useT } from '../../i18n';
import { cn, seeded } from '../../lib/util';

/**
 * Photo box sizes. The photo is capped by the viewport height so that on a phone the
 * question, the photo and the first row of candidates fit on one screen. The owner's
 * view is a bit smaller to make room for the "that's YOUR parent" banner.
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
              imageClassName={cn(size.box, 'max-w-[calc(100vw-5rem)]')}
              onOpen={onZoom}
              whileHover={{ scale: 1.015 }}
              overlay={
                <span className="pointer-events-none absolute top-2 right-2 flex items-center gap-1 rounded-full border-2 border-ink bg-cream/90 px-2 py-0.5 text-xs font-extrabold text-ink shadow-pop-sm">
                  <span aria-hidden>🔍</span>
                  {t('voting.zoom')}
                </span>
              }
            />
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
