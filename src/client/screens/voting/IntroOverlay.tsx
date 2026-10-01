import { AnimatePresence, motion } from 'motion/react';
import type { Theme } from '../../../shared/protocol';
import { PaperTexture } from '../../components/Background';
import { CutoutText } from '../../components/CutoutText';
import { Annotation, MarkerCircle } from '../../components/Marker';
import { RubberStamp } from '../../components/RubberStamp';
import { ThemeArt } from '../../components/ThemeArt';
import { useI18n } from '../../i18n';

export type IntroStage = 'ready' | 3 | 2 | 1 | 'go';

/**
 * Full-screen "Get ready!" before the very first photo: a fresh page of the zine with the title
 * in ransom-note letters, the mode's one-liner in ballpoint, the game's facts on strips of tape,
 * then a big 3-2-1 circled in red marker and a "GO!" rubber stamp (the flash itself is triggered
 * by VotingScreen with the sound cues).
 */
export function IntroOverlay({
  stage,
  totalRounds,
  voteSeconds,
  theme,
  blur,
}: {
  stage: IntroStage;
  totalRounds: number;
  voteSeconds: number;
  theme: Theme;
  blur: boolean;
}) {
  const { t, lang } = useI18n();
  const counting = typeof stage === 'number';
  return (
    <motion.div
      className="fixed inset-0 z-[45] flex flex-col items-center justify-center overflow-hidden px-6 pt-16 pb-36 text-center text-ink"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, y: -40, rotate: -2, transition: { duration: 0.35, ease: 'easeIn' } }}
      aria-live="assertive"
    >
      <PaperTexture className="absolute inset-0" />

      <CutoutText as="h1" text={t('voting.intro.ready')} size="lg" seed={`ready-${lang}`} animate className="relative max-w-[22rem] sm:max-w-none" />

      <Annotation as="p" font="pen" rotate={-2} size={24} delay={0.35} className="relative mt-3 max-w-sm text-balance sm:text-[28px]!">
        {t(`voting.intro.rule.${theme}`)}
      </Annotation>

      {/* The countdown: a big black number circled in red marker, GO! stamped. */}
      <div className="relative my-[min(2rem,4dvh)] flex size-[min(11rem,24dvh)] items-center justify-center">
        <AnimatePresence mode="popLayout">
          {stage === 'ready' ? (
            <motion.div
              key="ready"
              className="relative"
              initial={{ scale: 0.5, rotate: -14, opacity: 0 }}
              animate={{ scale: 1, rotate: -4, opacity: 1 }}
              exit={{ scale: 0.5, opacity: 0, transition: { duration: 0.18 } }}
              transition={{ type: 'spring', stiffness: 380, damping: 16, delay: 0.25 }}
            >
              <ThemeArt theme={theme} className="block size-[min(10rem,21dvh)]" />
              <Annotation rotate={-6} size={19} delay={0.9} className="absolute -right-14 -bottom-4 whitespace-nowrap">
                {t('voting.intro.soon')}
              </Annotation>
            </motion.div>
          ) : stage === 'go' ? (
            <motion.div key="go" exit={{ scale: 1.6, opacity: 0, transition: { duration: 0.25 } }}>
              <RubberStamp size={64} tilt={-10} backing animate={0} sound={false}>
                {t('voting.intro.go')}
              </RubberStamp>
            </motion.div>
          ) : (
            <motion.span
              key={String(stage)}
              className="relative"
              initial={{ scale: 1.8, rotate: -10, opacity: 0 }}
              animate={{ scale: 1, rotate: -3, opacity: 1 }}
              exit={{ scale: 0.7, opacity: 0, transition: { duration: 0.14 } }}
              transition={{ type: 'spring', stiffness: 520, damping: 18 }}
            >
              <MarkerCircle pad={18} strokeWidth={5} sound={false} seed={stage}>
                <span className="font-num block px-3 text-[length:min(7.5rem,15dvh)] leading-[0.9]">{stage}</span>
              </MarkerCircle>
            </motion.span>
          )}
        </AnimatePresence>
      </div>

      <motion.div
        className="relative flex max-w-md flex-wrap justify-center gap-x-3 gap-y-2.5"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: counting || stage === 'go' ? 0.85 : 1, y: 0 }}
        transition={{ delay: 0.45 }}
      >
        <Fact tilt={-2}>{t('voting.intro.photos', { count: totalRounds })}</Fact>
        <Fact tilt={1.5}>{voteSeconds > 0 ? t('voting.intro.perPhoto', { seconds: voteSeconds }) : t('voting.intro.noTimer')}</Fact>
        {blur && <Fact tilt={-1}>{t('voting.intro.blur')}</Fact>}
      </motion.div>
    </motion.div>
  );
}

/** A fact of the game typed on a strip of masking tape. */
function Fact({ children, tilt }: { children: string; tilt: number }) {
  return (
    <span
      className="inline-block bg-tape px-3 py-1.5 font-type text-[0.95rem] leading-tight text-ink shadow-[0_1px_2px_rgb(40_25_10/0.2)]"
      style={{
        rotate: `${tilt}deg`,
        clipPath: 'polygon(1% 4%, 99% 0, 100% 50%, 98.5% 100%, 0.5% 96%, 0 50%)',
      }}
    >
      {children}
    </span>
  );
}
