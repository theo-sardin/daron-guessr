import { AnimatePresence, motion } from 'motion/react';
import { useT } from '../../i18n';
import { cn } from '../../lib/util';

export type IntroStage = 'ready' | 3 | 2 | 1 | 'go';

const STICKER: Record<Exclude<IntroStage, 'ready'>, string> = {
  3: 'bg-pink text-white',
  2: 'bg-sun text-ink',
  1: 'bg-sky text-ink',
  go: 'bg-mint text-ink',
};

/** Full-screen "Get ready!" + 3-2-1-GO before the very first photo. */
export function IntroOverlay({ stage, totalRounds, voteSeconds }: { stage: IntroStage; totalRounds: number; voteSeconds: number }) {
  const t = useT();
  return (
    <motion.div
      className="fixed inset-0 z-[45] flex flex-col items-center justify-center overflow-hidden bg-[radial-gradient(circle_at_50%_42%,var(--color-grape-800),var(--color-grape-950)_75%)] px-6 pt-16 pb-28 text-center"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 1.15, transition: { duration: 0.35, ease: 'easeIn' } }}
      aria-live="assertive"
    >
      {/* Spinning sunburst. */}
      <motion.div
        aria-hidden
        className="pointer-events-none absolute top-1/2 left-1/2 size-[190vmax] -translate-x-1/2 -translate-y-1/2 opacity-25"
        style={{
          background:
            'repeating-conic-gradient(from 0deg, var(--color-grape-600) 0deg 10deg, transparent 10deg 20deg)',
          maskImage: 'radial-gradient(circle, black 0%, transparent 55%)',
          WebkitMaskImage: 'radial-gradient(circle, black 0%, transparent 55%)',
        }}
        animate={{ rotate: 360 }}
        transition={{ duration: 30, repeat: Infinity, ease: 'linear' }}
      />

      <motion.h1
        className="text-outline relative font-display text-5xl leading-none text-sun sm:text-7xl"
        initial={{ scale: 0.3, rotate: -12, y: -40 }}
        animate={{ scale: 1, rotate: -3, y: 0 }}
        transition={{ type: 'spring', stiffness: 380, damping: 12 }}
      >
        {t('voting.intro.ready')}
      </motion.h1>

      <motion.p
        className="relative mt-4 max-w-sm text-lg leading-snug font-extrabold text-cream sm:text-xl"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
      >
        {t('voting.intro.rule')}
      </motion.p>

      <div className="relative my-8 flex size-44 items-center justify-center sm:size-52">
        <AnimatePresence mode="popLayout">
          {stage === 'ready' ? (
            <motion.span
              key="ready"
              className="text-8xl"
              initial={{ scale: 0 }}
              animate={{ scale: 1, rotate: [0, -10, 10, 0] }}
              exit={{ scale: 0, opacity: 0 }}
              transition={{ duration: 0.5 }}
              aria-hidden
            >
              📸
            </motion.span>
          ) : (
            <motion.span
              key={String(stage)}
              className={cn(
                'absolute inset-0 flex items-center justify-center rounded-full border-[5px] border-ink font-display shadow-pop-lg',
                stage === 'go' ? 'text-6xl sm:text-7xl' : 'text-[7rem] leading-none sm:text-[8.5rem]',
                STICKER[stage],
              )}
              initial={{ scale: 0, rotate: -40 }}
              animate={{ scale: 1, rotate: stage === 'go' ? -6 : 0 }}
              exit={{ scale: 1.9, opacity: 0, transition: { duration: 0.3 } }}
              transition={{ type: 'spring', stiffness: 520, damping: 13 }}
            >
              {stage === 'go' ? t('voting.intro.go') : stage}
            </motion.span>
          )}
        </AnimatePresence>
      </div>

      <motion.div
        className="relative flex flex-wrap justify-center gap-2"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.45 }}
      >
        <span className="rounded-full border-2 border-ink bg-cream px-3 py-1 text-sm font-extrabold text-ink shadow-pop-sm">
          📸 {t('voting.intro.photos', { count: totalRounds })}
        </span>
        <span className="rounded-full border-2 border-ink bg-cream px-3 py-1 text-sm font-extrabold text-ink shadow-pop-sm">
          ⏱️ {voteSeconds > 0 ? t('voting.intro.perPhoto', { seconds: voteSeconds }) : t('voting.intro.noTimer')}
        </span>
      </motion.div>
    </motion.div>
  );
}
