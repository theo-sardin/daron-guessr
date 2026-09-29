import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { useEffect, useRef, useState } from 'react';
import { THEMES, type Theme } from '../../../shared/protocol';
import { Logo } from '../../components/Logo';
import { useI18n } from '../../i18n';
import { sfx } from '../../lib/sfx';
import { cn, vibrate } from '../../lib/util';
import { EMOJI_FONT } from './helpers';

interface MysterySpec {
  silhouette: string;
  tilt: number;
  /** Position classes around the logo. */
  className: string;
  bg: string;
  delay: number;
  seed: number;
  size: 'sm' | 'md';
}

const CARDS: MysterySpec[] = [
  { silhouette: '👨', tilt: -12, className: 'left-0 top-0 sm:left-2', bg: 'from-sky to-grape-300', delay: 0.35, seed: 0, size: 'md' },
  { silhouette: '🧒', tilt: 11, className: 'right-0 top-10 sm:right-2', bg: 'from-pink to-tangerine', delay: 0.5, seed: 1, size: 'md' },
  { silhouette: '🐶', tilt: 8, className: 'hidden lg:flex -left-8 top-[9.5rem]', bg: 'from-mint to-sky', delay: 0.65, seed: 3, size: 'sm' },
  { silhouette: '👵', tilt: -9, className: 'hidden lg:flex -right-6 top-[10.5rem]', bg: 'from-sun to-pink', delay: 0.8, seed: 2, size: 'sm' },
];

/**
 * A mini instant photo whose subject (a dad, a kid, a pet…) is a black silhouette hidden behind a big "?".
 * Tapping it teases ("Nice try 😏") instead of revealing anything: the whole game in a nutshell.
 */
function MysteryCard({ spec }: { spec: MysterySpec }) {
  const { t, tpick } = useI18n();
  const reduce = useReducedMotion();
  const [pokes, setPokes] = useState(0);
  const [teasing, setTeasing] = useState(false);
  const timer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(timer.current), []);

  const poke = () => {
    sfx.play('pop');
    vibrate(10);
    setPokes((n) => n + 1);
    setTeasing(true);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setTeasing(false), 1400);
  };

  const box = spec.size === 'md' ? 'w-[4.5rem] sm:w-24' : 'w-[5.5rem]';
  return (
    <motion.div
      className={cn('absolute z-10 flex', spec.className)}
      initial={{ opacity: 0, scale: 0.3, rotate: spec.tilt * 3 }}
      animate={{ opacity: 1, scale: 1, rotate: spec.tilt }}
      transition={{ type: 'spring', stiffness: 260, damping: 14, delay: spec.delay }}
    >
      <motion.button
        type="button"
        onClick={poke}
        aria-label={t('home.hero.mysteryLabel')}
        className={cn('flex flex-col rounded-md border-3 border-ink bg-white p-1.5 pb-1 text-ink shadow-pop', box)}
        animate={reduce ? undefined : { y: [0, -8, 0] }}
        transition={{ duration: 3.2 + spec.seed * 0.4, repeat: Infinity, ease: 'easeInOut', delay: spec.delay }}
        whileHover={{ scale: 1.08, rotate: -spec.tilt / 2 }}
        whileTap={{ scale: 0.92 }}
      >
        <motion.span
          key={pokes}
          className={cn('relative flex aspect-square w-full items-center justify-center overflow-hidden rounded-sm bg-gradient-to-br', spec.bg)}
          animate={pokes > 0 ? { rotate: [0, -10, 9, -6, 4, 0] } : undefined}
          transition={{ duration: 0.5 }}
        >
          <span className="translate-y-2 text-5xl brightness-0 select-none sm:text-6xl" style={{ opacity: 0.8 }} aria-hidden>
            {spec.silhouette}
          </span>
          <motion.span
            className="text-outline-sm absolute font-display text-4xl text-cream sm:text-5xl"
            animate={teasing ? { scale: [1, 1.5, 1.2], rotate: [0, 14, -8] } : { scale: 1, rotate: 0 }}
            transition={{ type: 'spring', stiffness: 400, damping: 12 }}
            aria-hidden
          >
            ?
          </motion.span>
        </motion.span>
        <span className={cn('mt-0.5 block h-5 truncate text-center font-display leading-5', spec.size === 'md' ? 'text-[0.7rem] sm:text-sm' : 'text-xs')} aria-hidden>
          {tpick('home.hero.mysteryCaption', spec.seed)}
        </span>
      </motion.button>
      <AnimatePresence>
        {teasing && (
          <motion.span
            key={pokes}
            className="pointer-events-none absolute top-full left-1/2 z-20 mt-2 rounded-xl border-2 border-ink bg-white px-2.5 py-1 font-display text-sm whitespace-nowrap text-ink shadow-pop-sm"
            style={{ x: '-50%' }}
            initial={{ opacity: 0, scale: 0.4, y: -8, rotate: -spec.tilt }}
            animate={{ opacity: 1, scale: 1, y: 0, rotate: -spec.tilt / 2 }}
            exit={{ opacity: 0, scale: 0.6, transition: { duration: 0.15 } }}
            transition={{ type: 'spring', stiffness: 600, damping: 18 }}
            aria-hidden
          >
            <span className="absolute -top-[7px] left-1/2 size-3 -translate-x-1/2 rotate-45 border-t-2 border-l-2 border-ink bg-white" />
            <span className="relative">{tpick('home.hero.peekTease', spec.seed + pokes)}</span>
          </motion.span>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export function Hero() {
  const t = useI18n().t;
  return (
    <section className="relative mx-auto w-full max-w-md pt-2">
      {CARDS.map((c) => (
        <MysteryCard key={c.seed} spec={c} />
      ))}
      <motion.div
        className="relative z-0 flex justify-center pt-3"
        initial={{ scale: 0.6, opacity: 0, y: -20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 14 }}
      >
        <Logo size="lg" />
      </motion.div>
      <motion.p
        className="mx-auto mt-3 max-w-[18rem] text-center text-lg leading-snug font-extrabold text-balance text-cream lg:max-w-[16rem]"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
      >
        {t('home.hero.tagline')}
      </motion.p>
    </section>
  );
}

const STEPS = [
  { key: 'home.how.step1', emoji: '📸', bg: 'bg-sun text-ink', tilt: -3 },
  { key: 'home.how.step2', emoji: '🕵️', bg: 'bg-sky text-ink', tilt: 2 },
  { key: 'home.how.step3', emoji: '😂', bg: 'bg-pink text-white', tilt: -2 },
] as const;

const THEME_TONE: Record<Theme, string> = {
  parents: 'bg-sun',
  family: 'bg-mint',
  childhood: 'bg-sky',
  pick: 'bg-lilac',
  mix: 'bg-cream',
};

function ThemeChip({ theme, hidden }: { theme: Theme; hidden?: boolean }) {
  const t = useI18n().t;
  return (
    <li
      className={cn(
        // A trailing margin (not a gap) keeps both copies exactly the same width: seamless loop.
        'mr-2 flex shrink-0 items-center gap-1.5 rounded-full border-2 border-ink px-2.5 py-1 text-sm font-extrabold whitespace-nowrap text-ink shadow-pop-sm',
        THEME_TONE[theme],
      )}
      title={t(`common.theme.${theme}.desc`)}
      aria-hidden={hidden || undefined}
    >
      <span className="leading-none" style={EMOJI_FONT} aria-hidden>
        {t(`common.theme.${theme}.emoji`)}
      </span>
      {t(`common.theme.${theme}.name`)}
    </li>
  );
}

/**
 * The themes the host can pick, as an endless conveyor of chips (a plain scrollable row when
 * motion is reduced): the game is not only about parents.
 */
function ThemeChips() {
  const t = useI18n().t;
  const reduce = useReducedMotion();
  return (
    <div className="mt-4 flex items-center gap-2">
      <span className="shrink-0 -rotate-3 rounded-lg border-2 border-ink bg-pink px-2 py-0.5 font-display text-sm tracking-wide text-white uppercase shadow-pop-sm">
        {t('home.themes.label')}
      </span>
      <div
        className={cn(
          // `contain` keeps the (very wide) conveyor out of the page's intrinsic width.
          'min-w-0 flex-1 pt-0.5 pb-1.5 [contain:inline-size] [mask-image:linear-gradient(to_right,transparent,black_1.25rem,black_calc(100%-1.25rem),transparent)]',
          reduce ? 'overflow-x-auto' : 'overflow-hidden',
        )}
      >
        <motion.ul
          className={cn('flex w-max', reduce && 'pl-3')}
          aria-label={t('home.themes.listLabel')}
          animate={reduce ? undefined : { x: ['0%', '-50%'] }}
          transition={{ duration: 26, ease: 'linear', repeat: Infinity }}
        >
          {THEMES.map((th) => (
            <ThemeChip key={th} theme={th} />
          ))}
          {/* Second copy so the loop is seamless. */}
          {!reduce && THEMES.map((th) => <ThemeChip key={`${th}-copy`} theme={th} hidden />)}
        </motion.ul>
      </div>
    </div>
  );
}

export function HowItWorks({ className }: { className?: string }) {
  const t = useI18n().t;
  const reduce = useReducedMotion();
  return (
    <section className={cn('mx-auto w-full max-w-md', className)} aria-label={t('home.how.title')}>
      <h2 className="mb-2 text-center font-display text-sm tracking-[0.2em] text-grape-200 uppercase">{t('home.how.title')}</h2>
      <motion.ol
        className="grid grid-cols-3 gap-2.5 sm:gap-3"
        initial="hidden"
        animate="shown"
        variants={{ shown: { transition: { staggerChildren: 0.14, delayChildren: 0.45 } } }}
      >
        {STEPS.map((s, i) => (
          <motion.li
            key={s.key}
            variants={{
              hidden: { opacity: 0, scale: 0.4, y: 24, rotate: s.tilt * 4 },
              shown: { opacity: 1, scale: 1, y: 0, rotate: s.tilt, transition: { type: 'spring', stiffness: 420, damping: 15 } },
            }}
            className={cn('relative flex flex-col items-center rounded-2xl border-3 border-ink px-1.5 pt-3 pb-2.5 text-center shadow-pop-sm', s.bg)}
          >
            <span className="absolute -top-2.5 -left-2 flex size-7 items-center justify-center rounded-full border-2 border-ink bg-cream font-display text-sm text-ink">
              {i + 1}
            </span>
            <motion.span
              className="text-3xl leading-none sm:text-4xl"
              animate={reduce ? undefined : { y: [0, -4, 0], rotate: [0, i % 2 ? 8 : -8, 0] }}
              transition={{ duration: 2.2, repeat: Infinity, delay: 1 + i * 0.35, ease: 'easeInOut' }}
              style={EMOJI_FONT}
              aria-hidden
            >
              {s.emoji}
            </motion.span>
            <span className="mt-1.5 text-[0.8rem] leading-tight font-extrabold text-balance sm:text-sm">{t(s.key)}</span>
          </motion.li>
        ))}
      </motion.ol>
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1, type: 'spring', stiffness: 300, damping: 20 }}>
        <ThemeChips />
      </motion.div>
    </section>
  );
}
