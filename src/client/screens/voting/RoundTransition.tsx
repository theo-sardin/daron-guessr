import { motion } from 'motion/react';
import type { CSSProperties } from 'react';
import type { PhotoKind } from '../../../shared/protocol';
import { KindTag } from '../../components/KindTag';
import { pad, Stamp } from '../../components/Stamp';
import { Viewfinder } from '../../components/Viewfinder';
import { useI18n } from '../../i18n';
import type { QuipGroup } from '../../i18n/strings/voting';

/** Faces (family, friends, pets) share the quips; kid photos and random picks get their own. */
function quipGroup(kind: PhotoKind): QuipGroup {
  return kind === 'kid' || kind === 'pick' ? kind : 'people';
}

/** A strip of negatives: sprocket holes along both edges, orange-based frames in between. */
const FILM: CSSProperties = {
  backgroundColor: 'var(--color-ink)',
  backgroundImage: [
    // Sprocket holes (top and bottom rows).
    'repeating-linear-gradient(90deg, transparent 0 9px, rgb(255 248 236 / 0.75) 9px 19px, transparent 19px 28px)',
    'repeating-linear-gradient(90deg, transparent 0 9px, rgb(255 248 236 / 0.75) 9px 19px, transparent 19px 28px)',
    // Frames.
    'repeating-linear-gradient(90deg, rgb(255 122 26 / 0.22) 0 150px, transparent 150px 162px)',
  ].join(','),
  backgroundSize: '100% 7px, 100% 7px, 100% calc(100% - 44px)',
  backgroundPosition: '0 8px, 0 calc(100% - 8px), 0 22px',
  backgroundRepeat: 'no-repeat',
};

/**
 * Between two rounds: a strip of film winds across the screen and the next print slides in,
 * its frame counter "04/08" burned in as a date stamp, the kind's lab label and a handwritten quip.
 */
export function RoundTransition({ round, total, kind }: { round: number; total: number; kind: PhotoKind }) {
  const { t, tpick } = useI18n();
  const last = round === total - 1;
  const tilt = round % 2 ? 3.5 : -3.5;
  return (
    <motion.div
      className="pointer-events-none fixed inset-0 z-[45] flex items-center justify-center overflow-hidden px-6"
      initial={{ opacity: 1 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 1, transition: { duration: 0.4 } }}
      aria-live="polite"
    >
      <motion.div
        className="absolute inset-0 bg-grape-950/85"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.25 }}
      />
      {/* Film advancing to the next frame. */}
      <motion.div
        aria-hidden
        className="absolute top-1/2 left-0 h-40 w-[360vw] -translate-y-1/2 border-y-2 border-white/10 sm:h-48"
        style={{ ...FILM, rotate: -tilt / 2 }}
        initial={{ x: '100vw' }}
        animate={{ x: '-150vw' }}
        exit={{ opacity: 0 }}
        transition={{ duration: 1.1, ease: [0.2, 0.7, 0.3, 1] }}
      />

      <motion.figure
        className="relative m-0 w-full max-w-[18.5rem] rounded-md border-3 border-ink bg-white p-3 pb-4 text-ink shadow-pop-lg sm:max-w-sm"
        initial={{ x: '110vw', rotate: 22 }}
        animate={{ x: 0, rotate: tilt }}
        exit={{ x: '-110vw', rotate: -20, transition: { duration: 0.35, ease: 'easeIn' } }}
        transition={{ type: 'spring', stiffness: 250, damping: 21 }}
      >
        {/* The unexposed frame, still dark: only the counter is burned in. */}
        <div className="relative flex h-40 items-center justify-center overflow-hidden rounded-sm bg-[radial-gradient(circle_at_50%_40%,var(--color-grape-800),var(--color-ink)_80%)] sm:h-52">
          <Viewfinder className="pointer-events-none absolute inset-0" color="rgb(255 255 255 / 0.85)" gap={-10} length={20} thickness={3} snap={0.35} />
          <Stamp
            label={t('voting.photoLabel')}
            size="xl"
            className="text-cream"
            valueClassName="text-[3.5rem]! sm:text-[4.5rem]!"
            ariaLabel={t('voting.photoCount', { n: round + 1, total })}
          >
            {pad(round + 1)}/{pad(total)}
          </Stamp>
        </div>
        <figcaption className="mt-3 flex flex-col items-center gap-1.5 text-center">
          <span className="flex max-w-full flex-wrap items-center justify-center gap-x-2 gap-y-1">
            <KindTag kind={kind} size="sm" tilt={-3} />
            <span className="text-base leading-tight font-extrabold text-balance">
              {last ? t('voting.transition.last') : t(`voting.transition.next.${kind}`)}
            </span>
          </span>
          <span className="text-hand text-[1.6rem] leading-none text-ink/80">{tpick(`voting.transition.quips.${quipGroup(kind)}`, round * 31 + total)}</span>
        </figcaption>
      </motion.figure>
    </motion.div>
  );
}
