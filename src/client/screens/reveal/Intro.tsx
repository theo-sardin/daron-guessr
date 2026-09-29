import { AnimatePresence, motion } from 'motion/react';
import { Stamp, pad } from '../../components/Stamp';
import { useT } from '../../i18n';

/** The three undeveloped prints fanned out behind the ballot box. */
const PRINTS = [
  { rotate: -13, x: -52, y: 10, delay: 0 },
  { rotate: 9, x: 50, y: 6, delay: 0.12 },
  { rotate: -2, x: 0, y: -6, delay: 0.24 },
];

/** "The votes are in!" suspense before the first photo (photo 1 starts in the future). */
export function Intro({ secondsLeft, total }: { secondsLeft: number; total: number }) {
  const t = useT();
  return (
    <div className="flex min-h-[calc(100dvh-15rem)] flex-col items-center justify-center text-center">
      <motion.h1
        className="text-outline font-display text-[2.6rem] leading-[1] tracking-[-0.02em] text-balance text-cream [font-stretch:80%] sm:text-7xl"
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

      {/* Undeveloped prints (still in the dark, safelight red) with the ballot box in front. */}
      <div className="relative mt-8 mb-7 h-56 w-72 sm:h-64 sm:w-80" aria-hidden>
        {PRINTS.map((c, i) => (
          <motion.div
            key={i}
            className="absolute top-2 left-1/2 -ml-[4.5rem] flex h-44 w-36 flex-col rounded-md border-3 border-ink bg-white p-2 pb-6 shadow-pop sm:-ml-20 sm:h-48 sm:w-40"
            initial={{ y: 320, rotate: c.rotate * 3, opacity: 0 }}
            animate={{ y: [c.y, c.y - 6, c.y], x: c.x, rotate: [c.rotate, c.rotate + 2.5, c.rotate], opacity: 1 }}
            transition={{
              y: { delay: c.delay, duration: 1.6, repeat: Infinity, repeatType: 'mirror', ease: 'easeInOut' },
              rotate: { delay: c.delay, duration: 1.3, repeat: Infinity, repeatType: 'mirror', ease: 'easeInOut' },
              x: { delay: c.delay, type: 'spring', stiffness: 200, damping: 18 },
              opacity: { delay: c.delay, duration: 0.2 },
            }}
          >
            <div className="relative flex flex-1 items-center justify-center overflow-hidden rounded-sm bg-[radial-gradient(90%_80%_at_40%_35%,#7a1a2a_0%,#3a0d1f_55%,var(--color-grape-950)_100%)]">
              <span className="font-display text-7xl leading-none text-safelight/80 [font-stretch:75%]">?</span>
            </div>
          </motion.div>
        ))}
        <motion.div
          className="absolute -right-4 -bottom-5 w-32 sm:-right-6 sm:w-36"
          initial={{ scale: 0, rotate: -30 }}
          animate={{ scale: 1, rotate: [0, -6, 6, -4, 4, 0] }}
          transition={{
            scale: { delay: 0.45, type: 'spring', stiffness: 400, damping: 12 },
            rotate: { delay: 0.8, duration: 0.55, repeat: Infinity, repeatDelay: 0.6 },
          }}
        >
          <BallotBox />
        </motion.div>
      </div>

      <div className="flex items-center gap-4">
        <div className="flex h-[4.5rem] min-w-[4.5rem] flex-col items-center justify-center rounded-2xl bg-ink px-2.5 shadow-pop ring-[1.5px] ring-white/15 ring-inset">
          <span className="label-mono whitespace-nowrap text-cream/60">{t('reveal.intro.startsIn')}</span>
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.span
              key={secondsLeft}
              className="mt-1 block"
              initial={{ scale: 1.8, opacity: 0.3 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.4, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 500, damping: 22 }}
            >
              <Stamp size="lg">{pad(secondsLeft)}</Stamp>
            </motion.span>
          </AnimatePresence>
        </div>
        <p className="flex items-baseline gap-2 text-left">
          <Stamp size="lg">{pad(total)}</Stamp>
          <span className="max-w-[8.5rem] font-display text-lg leading-tight text-cream">{t('reveal.intro.photos')}</span>
        </p>
      </div>
    </div>
  );
}

/**
 * The ballot box: a sun box with a lid and a slot, a folded voting slip dropping in on a loop.
 * Flat shapes and a thick ink outline, like the ThemeArt illustrations.
 */
function BallotBox() {
  return (
    <svg viewBox="0 0 120 120" className="block w-full overflow-visible drop-shadow-[0_5px_0_var(--color-ink)]" aria-hidden>
      <defs>
        {/* Everything above the middle of the slot: the slip vanishes into it. */}
        <clipPath id="reveal-ballot-slot">
          <rect x="0" y="-60" width="120" height="107" />
        </clipPath>
      </defs>
      {/* Lid (seen from slightly above) and the slot. */}
      <path d="M12 56 L24 40 H96 L108 56 Z" fill="var(--color-cream)" stroke="var(--color-ink)" strokeWidth="4" strokeLinejoin="round" />
      <rect x="38" y="44" width="44" height="7" rx="3.5" fill="var(--color-ink)" />
      <g clipPath="url(#reveal-ballot-slot)">
        <motion.g
          initial={{ y: -26 }}
          animate={{ y: [-26, -26, 44], opacity: [0, 1, 1] }}
          transition={{ duration: 1.5, times: [0, 0.35, 1], ease: 'easeIn', repeat: Infinity, repeatDelay: 0.5 }}
        >
          <g transform="rotate(-6 60 26)">
            <rect x="45" y="6" width="30" height="40" rx="3" fill="#fff" stroke="var(--color-ink)" strokeWidth="3.5" />
            <path d="M51 17 l4 4 l8 -9" fill="none" stroke="var(--color-ink)" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M51 29 h18 M51 36 h12" stroke="var(--color-ink)" strokeWidth="3" strokeLinecap="round" />
          </g>
        </motion.g>
      </g>
      {/* Body. */}
      <rect x="12" y="56" width="96" height="56" rx="6" fill="var(--color-sun)" stroke="var(--color-ink)" strokeWidth="4" />
      <path d="M20 64 v40" stroke="#fff" strokeOpacity="0.55" strokeWidth="4" strokeLinecap="round" />
      {/* Front label with a big tick. */}
      <rect x="36" y="70" width="48" height="28" rx="5" fill="var(--color-cream)" stroke="var(--color-ink)" strokeWidth="3.5" />
      <path d="M49 84 l7 7 l14 -15" fill="none" stroke="var(--color-ink)" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
