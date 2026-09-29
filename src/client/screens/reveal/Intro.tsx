import { AnimatePresence, motion } from 'motion/react';
import { useT } from '../../i18n';

const CARDS = [
  { rotate: -14, x: -46, y: 8, delay: 0 },
  { rotate: 10, x: 44, y: 4, delay: 0.12 },
  { rotate: -3, x: 0, y: -6, delay: 0.24 },
];

/** "The votes are in!" suspense before the first photo (photo 1 starts in the future). */
export function Intro({ secondsLeft, total }: { secondsLeft: number; total: number }) {
  const t = useT();
  return (
    <div className="flex min-h-[calc(100dvh-15rem)] flex-col items-center justify-center text-center">
      <motion.h1
        className="text-outline font-display text-[2.5rem] leading-[1.05] text-cream sm:text-6xl"
        initial={{ scale: 0.4, opacity: 0, rotate: -8 }}
        animate={{ scale: 1, opacity: 1, rotate: [-8, 3, -2, 0] }}
        transition={{ type: 'spring', stiffness: 320, damping: 14 }}
      >
        {t('reveal.intro.title')}
      </motion.h1>
      <motion.p
        className="mt-2 text-lg font-bold text-grape-200 sm:text-xl"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35 }}
      >
        {t('reveal.intro.sub')}
      </motion.p>

      {/* Stack of mystery polaroids with the ballot box shaking in front. */}
      <div className="relative mt-8 mb-6 h-56 w-72 sm:h-64 sm:w-80">
        {CARDS.map((c, i) => (
          <motion.div
            key={i}
            className="absolute top-2 left-1/2 -ml-[4.5rem] flex h-44 w-36 flex-col rounded-md border-3 border-ink bg-white p-2 pb-6 shadow-pop sm:h-48 sm:w-40 sm:-ml-20"
            initial={{ y: 320, rotate: c.rotate * 3, opacity: 0 }}
            animate={{ y: [c.y, c.y - 6, c.y], x: c.x, rotate: [c.rotate, c.rotate + 2.5, c.rotate], opacity: 1 }}
            transition={{
              y: { delay: c.delay, duration: 1.6, repeat: Infinity, repeatType: 'mirror', ease: 'easeInOut' },
              rotate: { delay: c.delay, duration: 1.3, repeat: Infinity, repeatType: 'mirror', ease: 'easeInOut' },
              x: { delay: c.delay, type: 'spring', stiffness: 200, damping: 18 },
              opacity: { delay: c.delay, duration: 0.2 },
            }}
          >
            <div className="flex flex-1 items-center justify-center rounded-sm bg-gradient-to-br from-grape-300 to-pink/70">
              <span className="text-outline-sm font-display text-6xl text-cream">?</span>
            </div>
          </motion.div>
        ))}
        <motion.div
          className="absolute -right-2 -bottom-2 text-[5.5rem] leading-none drop-shadow-[0_5px_0_rgba(27,16,54,0.7)] sm:text-8xl"
          initial={{ scale: 0, rotate: -40 }}
          animate={{ scale: 1, rotate: [0, -9, 9, -7, 7, 0] }}
          transition={{
            scale: { delay: 0.45, type: 'spring', stiffness: 400, damping: 12 },
            rotate: { delay: 0.8, duration: 0.55, repeat: Infinity, repeatDelay: 0.25 },
          }}
          aria-hidden
        >
          🗳️
        </motion.div>
        <motion.div
          className="absolute -top-3 -left-3 text-4xl"
          animate={{ y: [0, -10, 0], rotate: [-10, 10, -10] }}
          transition={{ duration: 1.8, repeat: Infinity }}
          aria-hidden
        >
          🥁
        </motion.div>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative flex size-16 items-center justify-center rounded-full border-3 border-ink bg-sun shadow-pop">
          <AnimatePresence mode="popLayout">
            <motion.span
              key={secondsLeft}
              className="font-display text-4xl text-ink"
              initial={{ scale: 2.2, opacity: 0.4 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.3, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 500, damping: 20 }}
            >
              {secondsLeft}
            </motion.span>
          </AnimatePresence>
        </div>
        <span className="sticker px-4 py-2 font-display text-lg">📸 {t('reveal.intro.count', { total })}</span>
      </div>
    </div>
  );
}
