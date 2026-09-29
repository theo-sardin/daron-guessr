import { motion } from 'motion/react';
import type { ParentKind } from '../../../shared/protocol';
import { useI18n } from '../../i18n';

/** Quick "Photo 3/8" card sweeping across the screen between two rounds. */
export function RoundTransition({ round, total, kind }: { round: number; total: number; kind: ParentKind }) {
  const { t, tpick } = useI18n();
  const last = round === total - 1;
  return (
    <motion.div
      className="pointer-events-none fixed inset-0 z-[45] flex items-center justify-center overflow-hidden px-6"
      initial={{ opacity: 1 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 1, transition: { duration: 0.4 } }}
      aria-live="polite"
    >
      <motion.div
        className="absolute inset-0 bg-grape-950/80"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.25 }}
      />
      {/* Speed lines. */}
      {[18, 34, 62, 80].map((top, i) => (
        <motion.span
          key={top}
          aria-hidden
          className="absolute h-1.5 w-1/2 rounded-full bg-cream/40"
          style={{ top: `${top}%` }}
          initial={{ x: '120vw' }}
          animate={{ x: '-120vw' }}
          transition={{ duration: 0.6, delay: i * 0.06, ease: 'easeOut' }}
        />
      ))}
      <motion.div
        className="relative flex w-full max-w-xs flex-col items-center rounded-[var(--radius-blob)] border-4 border-ink bg-sun px-6 py-5 sm:max-w-md sm:py-8 text-center text-ink shadow-pop-lg"
        initial={{ x: '110vw', rotate: 18 }}
        animate={{ x: 0, rotate: -4 }}
        exit={{ x: '-110vw', rotate: -20, transition: { duration: 0.35, ease: 'easeIn' } }}
        transition={{ type: 'spring', stiffness: 260, damping: 20 }}
      >
        <span className="font-display text-xl tracking-widest uppercase opacity-70">{t('voting.transition.label')}</span>
        <span className="font-display text-7xl leading-none sm:text-9xl">
          {round + 1}
          <span className="text-4xl opacity-60 sm:text-6xl">/{total}</span>
        </span>
        <span className="mt-2 rounded-full border-2 border-ink bg-cream px-3 py-1 text-sm font-extrabold">
          {t(`common.kindEmoji.${kind}`)} {last ? t('voting.transition.last') : t(`voting.transition.next.${kind}`)}
        </span>
        <span className="mt-2 text-sm font-bold opacity-80">{tpick('voting.transition.quips', round * 31 + total)}</span>
      </motion.div>
    </motion.div>
  );
}
