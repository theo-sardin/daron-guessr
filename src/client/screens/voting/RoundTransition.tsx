import { motion } from 'motion/react';
import type { PhotoKind } from '../../../shared/protocol';
import { CutoutText } from '../../components/CutoutText';
import { KindTag } from '../../components/KindTag';
import { NotebookCard } from '../../components/Paper';
import { Stamp } from '../../components/Stamp';
import { PaperStrip } from '../../components/TornPaper';
import { useI18n } from '../../i18n';
import { quipGroup } from './quips';

/**
 * Between two rounds: the page turns. A torn halftone strip sweeps across, then a notebook card
 * is slapped on with the next photo's number, its kind on a strip of tape, a teaser and a
 * handwritten quip.
 */
export function RoundTransition({ round, total, kind }: { round: number; total: number; kind: PhotoKind }) {
  const { t, tpick } = useI18n();
  const last = round === total - 1;
  const tilt = round % 2 ? 2.5 : -2.5;
  return (
    <motion.div
      className="pointer-events-none fixed inset-0 z-[45] flex items-center justify-center overflow-hidden px-6 text-ink"
      initial={{ opacity: 1 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 1, transition: { duration: 0.4 } }}
      aria-live="polite"
    >
      <motion.div
        className="absolute inset-0 bg-paper/85 backdrop-blur-[3px]"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.25 }}
      />
      {/* The strip sweeping across, like a page being turned. */}
      <motion.div
        aria-hidden
        className="absolute top-1/2 left-0 h-44 w-[160vw] -translate-y-1/2"
        initial={{ x: '100vw' }}
        animate={{ x: '-30vw' }}
        exit={{ x: '-170vw', transition: { duration: 0.4, ease: 'easeIn' } }}
        transition={{ duration: 0.7, ease: [0.2, 0.7, 0.3, 1] }}
      >
        <PaperStrip tone={last ? 'red' : round % 2 ? 'yellow' : 'blue'} tilt={-tilt} seed={`t${round}`} className="inset-0" />
      </motion.div>

      <motion.div
        className="relative w-full max-w-[19rem] sm:max-w-sm"
        initial={{ x: '110vw', rotate: 18 }}
        animate={{ x: 0, rotate: tilt }}
        exit={{ x: '-110vw', rotate: -16, transition: { duration: 0.35, ease: 'easeIn' } }}
        transition={{ type: 'spring', stiffness: 250, damping: 21 }}
      >
        <NotebookCard tape="yellow" torn="b" lift="lg" leading={30} className="flex flex-col items-start gap-2 pr-4 pb-5">
          <div className="flex w-full items-end justify-between gap-3">
            <Stamp label={t('voting.photoLabel')} size="xl" ariaLabel={t('voting.photoCount', { n: round + 1, total })}>
              {round + 1}/{total}
            </Stamp>
            {last && <CutoutText text={t('voting.transition.last')} size={26} seed={`last-${round}`} animate={0.2} className="mb-1" />}
          </div>
          <span className="flex max-w-full flex-wrap items-center gap-x-2 gap-y-1">
            <KindTag kind={kind} size="sm" tilt={-3} />
            {!last && <span className="text-[1.05rem] leading-tight font-extrabold text-balance">{t(`voting.transition.next.${kind}`)}</span>}
          </span>
          <span className="text-pen text-[1.6rem] leading-[30px]">{tpick(`voting.transition.quips.${quipGroup(kind)}`, round * 31 + total)}</span>
        </NotebookCard>
      </motion.div>
    </motion.div>
  );
}
