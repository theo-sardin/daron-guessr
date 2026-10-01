import { AnimatePresence, motion } from 'motion/react';
import { CutoutText } from '../../components/CutoutText';
import { Annotation } from '../../components/Marker';
import { Tape } from '../../components/Tape';
import { PaperStrip } from '../../components/TornPaper';
import { useT } from '../../i18n';

/** The face-down prints fanned out behind the ballot box. */
const PRINTS = [
  { rotate: -13, x: -56, y: 12, delay: 0 },
  { rotate: 10, x: 54, y: 6, delay: 0.12 },
  { rotate: -2, x: 0, y: -6, delay: 0.24 },
];

/** "The votes are in!" suspense before the first photo (photo 1 starts in the future). */
export function Intro({ secondsLeft, total }: { secondsLeft: number; total: number }) {
  const t = useT();
  return (
    <div className="flex min-h-[calc(100dvh-15rem)] flex-col items-center justify-center text-center">
      <CutoutText as="h1" text={t('reveal.intro.title')} size={50} seed="intro" animate />
      <Annotation font="pen" size={26} rotate={-2} delay={0.5} as="p" className="mt-2">
        {t('reveal.intro.sub')}
      </Annotation>

      {/* Prints still face down (their paper backs) with the ballot box in front. */}
      <div className="relative mt-6 mb-7 h-56 w-72 sm:h-64 sm:w-80" aria-hidden>
        <PaperStrip tone="blue" tilt={-5} className="-inset-x-16 top-16 h-28" seed="intro" />
        {PRINTS.map((c, i) => (
          <motion.div
            key={i}
            className="absolute top-2 left-1/2 -ml-[4.5rem] flex h-44 w-36 flex-col bg-[linear-gradient(160deg,#fffefa,#efe7d6)] p-2 pb-6 shadow-paper sm:-ml-20 sm:h-48 sm:w-40"
            initial={{ y: 320, rotate: c.rotate * 3, opacity: 0 }}
            animate={{ y: [c.y, c.y - 6, c.y], x: c.x, rotate: [c.rotate, c.rotate + 2.5, c.rotate], opacity: 1 }}
            transition={{
              y: { delay: c.delay, duration: 1.6, repeat: Infinity, repeatType: 'mirror', ease: 'easeInOut' },
              rotate: { delay: c.delay, duration: 1.3, repeat: Infinity, repeatType: 'mirror', ease: 'easeInOut' },
              x: { delay: c.delay, type: 'spring', stiffness: 200, damping: 18 },
              opacity: { delay: c.delay, duration: 0.2 },
            }}
          >
            <Tape tone={i === 1 ? 'pink' : 'cream'} width={58} height={18} rotate={i === 1 ? 6 : -4} className="-top-2 left-1/2 -translate-x-1/2" />
            <div className="paper-kraft relative flex flex-1 items-center justify-center overflow-hidden">
              <span className="font-marker text-7xl leading-none text-red">?</span>
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
        <div className="paper-ink flex h-[4.5rem] min-w-[4.5rem] flex-col items-center justify-center px-2.5 shadow-paper">
          <span className="label-type text-[10px] whitespace-nowrap text-[#fff6e0]/75">{t('reveal.intro.startsIn')}</span>
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.span
              key={secondsLeft}
              className="mt-0.5 block font-display text-[2.2rem] leading-none text-[#fff6e0]"
              initial={{ scale: 1.8, opacity: 0.3 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.4, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 500, damping: 22 }}
            >
              {secondsLeft}
            </motion.span>
          </AnimatePresence>
        </div>
        <p className="flex items-baseline gap-2 text-left">
          <span className="font-display text-[2.4rem] leading-none">{total}</span>
          <span className="max-w-[8.5rem] text-lg leading-tight font-extrabold">{t('reveal.intro.photos')}</span>
        </p>
      </div>
    </div>
  );
}

/**
 * The ballot box: a kraft cardboard box with a slot, a folded voting slip dropping in on a loop.
 */
function BallotBox() {
  return (
    <svg viewBox="0 0 120 120" className="block w-full overflow-visible drop-shadow-[0_6px_6px_rgb(40_25_10/0.35)]" aria-hidden>
      <defs>
        <clipPath id="reveal-ballot-slot">
          <rect x="0" y="-60" width="120" height="107" />
        </clipPath>
      </defs>
      <path d="M12 56 L24 40 H96 L108 56 Z" fill="#e8cfa6" stroke="var(--color-ink)" strokeWidth="3.5" strokeLinejoin="round" />
      <rect x="38" y="44" width="44" height="7" rx="3.5" fill="var(--color-ink)" />
      <g clipPath="url(#reveal-ballot-slot)">
        <motion.g
          initial={{ y: -26 }}
          animate={{ y: [-26, -26, 44], opacity: [0, 1, 1] }}
          transition={{ duration: 1.5, times: [0, 0.35, 1], ease: 'easeIn', repeat: Infinity, repeatDelay: 0.5 }}
        >
          <g transform="rotate(-6 60 26)">
            <rect x="45" y="6" width="30" height="40" rx="2" fill="#fffdf6" stroke="var(--color-ink)" strokeWidth="3" />
            <path d="M51 17 l4 4 l8 -9" fill="none" stroke="var(--color-red)" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M51 29 h18 M51 36 h12" stroke="var(--color-blue)" strokeWidth="2.6" strokeLinecap="round" />
          </g>
        </motion.g>
      </g>
      <rect x="12" y="56" width="96" height="56" rx="3" fill="var(--color-kraft)" stroke="var(--color-ink)" strokeWidth="3.5" />
      {/* Red Dymo-ish label with a big tick. */}
      <rect x="33" y="72" width="54" height="24" rx="3" fill="var(--color-red)" stroke="var(--color-ink)" strokeWidth="3" />
      <path d="M50 84 l6 6 l13 -13" fill="none" stroke="#fff" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
