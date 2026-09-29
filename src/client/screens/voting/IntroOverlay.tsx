import { AnimatePresence, motion } from 'motion/react';
import type { Theme } from '../../../shared/protocol';
import { Icon, type IconName } from '../../components/Icon';
import { IconBadge } from '../../components/IconBadge';
import { Stamp } from '../../components/Stamp';
import { Viewfinder } from '../../components/Viewfinder';
import { useT } from '../../i18n';
import { cn } from '../../lib/util';

export type IntroStage = 'ready' | 3 | 2 | 1 | 'go';

/**
 * Full-screen "Get ready!" before the very first photo, staged as a camera self-timer: the
 * viewfinder hunts for focus, the orange digits count 3-2-1 with the timer lamp blinking, and
 * "GO!" fires the flash (the flash itself is triggered by VotingScreen with the sound cues).
 */
export function IntroOverlay({
  stage,
  totalRounds,
  voteSeconds,
  theme,
}: {
  stage: IntroStage;
  totalRounds: number;
  voteSeconds: number;
  theme: Theme;
}) {
  const t = useT();
  const counting = typeof stage === 'number';
  return (
    <motion.div
      className="fixed inset-0 z-[45] flex flex-col items-center justify-center overflow-hidden bg-[radial-gradient(circle_at_50%_46%,var(--color-grape-800),var(--color-grape-950)_72%)] px-6 pt-20 pb-40 text-center"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 1.12, transition: { duration: 0.35, ease: 'easeIn' } }}
      aria-live="assertive"
    >
      <motion.h1
        className="relative font-display text-[3.25rem] leading-[0.95] tracking-[-0.025em] text-cream [font-stretch:78%] sm:text-7xl"
        initial={{ scale: 0.4, rotate: -8, y: -30, opacity: 0 }}
        animate={{ scale: 1, rotate: -2, y: 0, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 380, damping: 14 }}
      >
        {t('voting.intro.ready')}
      </motion.h1>

      <motion.p
        className="relative mt-3 max-w-sm text-lg leading-snug font-bold text-balance text-grape-200 sm:text-xl"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
      >
        {t(`voting.intro.rule.${theme}`)}
      </motion.p>

      {/* The self-timer. */}
      <Viewfinder
        // Shrinks on short phones so the chips stay clear of the floating reaction button.
        className="my-[min(2.25rem,4.5dvh)] flex size-[min(13rem,27dvh)] items-center justify-center sm:size-[min(15rem,30dvh)]"
        color="var(--color-cream)"
        length={30}
        thickness={4}
        radius={5}
        gap={0}
        snap={0.15}
        hunt={stage === 'ready'}
      >
        {/* Soft orange spill behind the digits, like the lit LCD. */}
        <motion.span
          aria-hidden
          className="pointer-events-none absolute inset-6 rounded-full bg-stamp/25 blur-2xl"
          animate={{ opacity: counting ? 1 : stage === 'go' ? 0.6 : 0.25 }}
          transition={{ duration: 0.3 }}
        />
        {/* Crosshair in the middle of the frame while it focuses. */}
        <AnimatePresence>
          {stage === 'ready' && (
            <motion.span
              key="cross"
              aria-hidden
              className="pointer-events-none absolute inset-0 flex items-center justify-center"
              exit={{ opacity: 0 }}
            >
              <span className="absolute h-px w-7 bg-cream/40" />
              <span className="absolute h-7 w-px bg-cream/40" />
            </motion.span>
          )}
        </AnimatePresence>
        {counting && <SelfTimerLamp key={stage} />}
        {counting && (
          <span className="label-mono absolute top-3.5 left-4 text-[10px] text-cream/60 sm:top-4 sm:left-5">{t('voting.intro.selfTimer')}</span>
        )}

        <AnimatePresence mode="popLayout">
          {stage === 'ready' ? (
            <motion.span
              key="ready"
              className="relative"
              initial={{ scale: 0, rotate: -20 }}
              animate={{ scale: 1, rotate: -6 }}
              exit={{ scale: 0.4, opacity: 0, transition: { duration: 0.18 } }}
              transition={{ type: 'spring', stiffness: 420, damping: 13, delay: 0.3 }}
            >
              <IconBadge name="camera" tone="sun" size="xl" />
            </motion.span>
          ) : stage === 'go' ? (
            <motion.span
              key="go"
              className="text-outline relative font-display text-[5.5rem] leading-none tracking-[-0.03em] text-sun [font-stretch:76%] sm:text-[7rem]"
              initial={{ scale: 0.3, rotate: -18 }}
              animate={{ scale: 1, rotate: -6 }}
              exit={{ scale: 1.8, opacity: 0, transition: { duration: 0.3 } }}
              transition={{ type: 'spring', stiffness: 520, damping: 12 }}
            >
              {t('voting.intro.go')}
            </motion.span>
          ) : (
            <motion.span
              key={String(stage)}
              className="relative mt-4"
              // An LED digit turning on: a quick flicker, no bounce.
              initial={{ opacity: 0, scale: 1.25 }}
              animate={{ opacity: [0, 1, 0.35, 1], scale: 1 }}
              exit={{ opacity: 0, scale: 0.85, transition: { duration: 0.14 } }}
              transition={{ duration: 0.32, times: [0, 0.25, 0.5, 1], scale: { type: 'spring', stiffness: 500, damping: 22 } }}
            >
              <Stamp
                size="2xl"
                // A seven-segment "1" only lights the right-hand segments: nudge it back to the middle.
                valueClassName={cn('text-[length:min(6.75rem,14dvh)]! sm:text-[8rem]!', stage === 1 && '-translate-x-[0.24em]')}
              >
                {stage}
              </Stamp>
            </motion.span>
          )}
        </AnimatePresence>
      </Viewfinder>

      <motion.div
        className="relative flex flex-wrap justify-center gap-2"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.45 }}
      >
        <Chip icon="images">{t('voting.intro.photos', { count: totalRounds })}</Chip>
        <Chip icon="clock">{voteSeconds > 0 ? t('voting.intro.perPhoto', { seconds: voteSeconds }) : t('voting.intro.noTimer')}</Chip>
      </motion.div>
    </motion.div>
  );
}

/** The camera's self-timer lamp: one orange blink per second. */
function SelfTimerLamp() {
  return (
    <motion.span
      aria-hidden
      className="absolute top-3 right-4 size-3 rounded-full border-2 border-ink bg-stamp shadow-[0_0_12px_3px_rgb(255_122_26_/_0.75)] sm:top-3.5 sm:right-5"
      initial={{ opacity: 1 }}
      animate={{ opacity: [1, 1, 0.15] }}
      transition={{ duration: 0.9, times: [0, 0.45, 0.6] }}
    />
  );
}

function Chip({ icon, children }: { icon: IconName; children: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border-2 border-ink bg-cream py-1 pr-3 pl-2 text-sm font-extrabold text-ink shadow-pop-sm">
      <Icon name={icon} className="size-4" />
      {children}
    </span>
  );
}
