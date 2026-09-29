import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { THEMES, type Theme } from '../../../shared/protocol';
import { Icon, type IconName } from '../../components/Icon';
import { Logo } from '../../components/Logo';
import { pad, Stamp } from '../../components/Stamp';
import { ThemeArt } from '../../components/ThemeArt';
import { useI18n } from '../../i18n';
import { sfx } from '../../lib/sfx';
import { cn, vibrate } from '../../lib/util';

/** Who is hiding in the mystery print (an ink cut-out, never an emoji). */
type Figure = 'dad' | 'kid' | 'dog' | 'granny';

interface MysterySpec {
  figure: Figure;
  tilt: number;
  /** Position classes around the logo. */
  className: string;
  /** The photo's flat color (one accent per print). */
  photo: string;
  delay: number;
  seed: number;
  size: 'sm' | 'md';
}

const CARDS: MysterySpec[] = [
  { figure: 'dad', tilt: -12, className: '-left-3 top-0 min-[375px]:left-0 sm:left-2', photo: 'bg-sky', delay: 0.35, seed: 0, size: 'md' },
  { figure: 'kid', tilt: 11, className: '-right-3 top-12 min-[375px]:right-0 min-[375px]:top-10 sm:right-2', photo: 'bg-pink', delay: 0.5, seed: 1, size: 'md' },
  { figure: 'dog', tilt: 8, className: 'hidden lg:flex -left-8 top-[9.5rem]', photo: 'bg-mint', delay: 0.65, seed: 3, size: 'sm' },
  { figure: 'granny', tilt: -9, className: 'hidden lg:flex -right-6 top-[10.5rem]', photo: 'bg-sun', delay: 0.8, seed: 2, size: 'sm' },
];

/**
 * The subject of a mystery print, as a flat ink cut-out (head and shoulders plus one telltale
 * shape: dad's cap, the kid's pigtails, granny's bun, the dog's floppy ears).
 */
function Silhouette({ figure }: { figure: Figure }) {
  return (
    <svg viewBox="0 0 100 100" className="absolute inset-0 size-full" fill="var(--color-ink)" fillOpacity={0.82} aria-hidden>
      {figure === 'dad' && (
        <g>
          <path d="M6 104C8 80 27 71 50 71S92 80 94 104Z" />
          <circle cx="50" cy="47" r="19" />
          <path d="M30 42C30 19 70 19 70 42Z" />
          <rect x="58" y="35.5" width="30" height="7" rx="3.5" />
        </g>
      )}
      {figure === 'kid' && (
        <g>
          <path d="M18 104C20 84 34 78 50 78S80 84 82 104Z" />
          <circle cx="50" cy="52" r="17" />
          <circle cx="29" cy="42" r="8.5" />
          <circle cx="71" cy="42" r="8.5" />
          <path d="M22 34l7 8-9 3z M78 34l-7 8 9 3z" />
        </g>
      )}
      {figure === 'granny' && (
        <g>
          <path d="M8 104C10 81 28 73 50 73S90 81 92 104Z" />
          <circle cx="50" cy="48" r="18" />
          <circle cx="50" cy="24" r="10" />
          <circle cx="34" cy="38" r="10" />
          <circle cx="66" cy="38" r="10" />
          <circle cx="42" cy="31" r="9" />
          <circle cx="58" cy="31" r="9" />
        </g>
      )}
      {figure === 'dog' && (
        <g>
          <path d="M12 104C14 84 30 77 50 77S86 84 88 104Z" />
          <circle cx="50" cy="48" r="19" />
          <ellipse cx="29" cy="50" rx="8" ry="17" transform="rotate(18 29 50)" />
          <ellipse cx="71" cy="50" rx="8" ry="17" transform="rotate(-18 71 50)" />
          <ellipse cx="50" cy="63" rx="12" ry="9.5" />
        </g>
      )}
    </svg>
  );
}

/**
 * A mini instant print whose subject (a dad, a kid, a pet…) is an ink cut-out hidden behind a
 * big "?". Tapping it teases ("Nice try") instead of revealing anything: the whole game in a nutshell.
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

  const box = spec.size === 'md' ? 'w-[4.5rem] max-[374px]:w-[3.75rem] sm:w-24' : 'w-[5.5rem]';
  return (
    <motion.div
      // Below 375px the prints slip behind the wordmark (half off the edges) so the name stays whole.
      className={cn('absolute z-0 flex min-[375px]:z-10', spec.className)}
      initial={{ opacity: 0, scale: 0.3, rotate: spec.tilt * 3 }}
      animate={{ opacity: 1, scale: 1, rotate: spec.tilt }}
      transition={{ type: 'spring', stiffness: 260, damping: 14, delay: spec.delay }}
    >
      <motion.button
        type="button"
        onClick={poke}
        aria-label={t('home.hero.mysteryLabel')}
        className={cn('flex flex-col rounded-[5px] border-3 border-ink bg-white p-1.5 pb-0.5 text-ink shadow-pop', box)}
        animate={reduce ? undefined : { y: [0, -8, 0] }}
        transition={{ duration: 3.2 + spec.seed * 0.4, repeat: Infinity, ease: 'easeInOut', delay: spec.delay }}
        whileHover={{ scale: 1.08, rotate: -spec.tilt / 2 }}
        whileTap={{ scale: 0.92 }}
      >
        <motion.span
          key={pokes}
          className={cn('relative flex aspect-square w-full items-center justify-center overflow-hidden rounded-[2px]', spec.photo)}
          animate={pokes > 0 ? { rotate: [0, -10, 9, -6, 4, 0] } : undefined}
          transition={{ duration: 0.5 }}
        >
          <Silhouette figure={spec.figure} />
          <motion.span
            className="text-outline-sm relative font-display text-4xl leading-none text-cream sm:text-5xl"
            animate={teasing ? { scale: [1, 1.5, 1.2], rotate: [0, 14, -8] } : { scale: 1, rotate: 0 }}
            transition={{ type: 'spring', stiffness: 400, damping: 12 }}
            aria-hidden
          >
            ?
          </motion.span>
        </motion.span>
        <span
          className={cn('text-hand mt-0.5 block h-6 truncate text-center leading-6', spec.size === 'md' ? 'text-base sm:text-lg' : 'text-base')}
          aria-hidden
        >
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
        className="pointer-events-none relative z-[1] flex justify-center pt-3 min-[375px]:z-0 *:pointer-events-auto"
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

/** The three steps, as frames of a film strip: one photo (color + icon) and a caption each. */
const STEPS: ReadonlyArray<{ key: 'home.how.step1' | 'home.how.step2' | 'home.how.step3'; icon: IconName; photo: string }> = [
  { key: 'home.how.step1', icon: 'upload', photo: 'bg-sun' },
  { key: 'home.how.step2', icon: 'zoom', photo: 'bg-sky' },
  { key: 'home.how.step3', icon: 'sparkle', photo: 'bg-pink' },
];

/** A row of film sprocket holes (repeated rounded squares, faint cream on the ink strip). */
const SPROCKETS: CSSProperties = {
  backgroundImage:
    "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='15' height='8'%3E%3Crect x='3.5' y='0' width='8' height='8' rx='2' fill='%23fff8ec' fill-opacity='0.2'/%3E%3C/svg%3E\")",
  backgroundRepeat: 'repeat-x',
  backgroundPosition: 'center',
};

function ThemeChip({ theme, hidden }: { theme: Theme; hidden?: boolean }) {
  const t = useI18n().t;
  return (
    <li
      className={cn(
        // A trailing margin (not a gap) keeps both copies exactly the same width: seamless loop.
        'mr-2 flex h-9 shrink-0 items-center gap-1.5 rounded-full border-2 border-ink bg-cream pr-3 pl-1 text-sm font-extrabold whitespace-nowrap text-ink shadow-pop-sm',
      )}
      title={t(`common.theme.${theme}.desc`)}
      aria-hidden={hidden || undefined}
    >
      <ThemeArt theme={theme} compact className="size-7" />
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
    <div className="mt-3 flex items-center gap-2 sm:mt-4">
      <span className="label-mono shrink-0 -rotate-3 rounded-md border-2 border-ink bg-pink px-2 py-1.5 text-ink shadow-pop-sm">
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
      <h2 className="label-mono mb-2 text-center text-grape-200">{t('home.how.title')}</h2>
      {/*
        The film strip: two rows of sprocket holes and three 3:2 frames (the 35mm ratio). Each
        frame number is edge-printed in the perforation band, the way film labs number frames.
      */}
      <motion.div
        className="relative -rotate-1 rounded-xl border-2 border-ink bg-ink px-2 pt-[1.1rem] pb-[1.2rem] shadow-pop-sm ring-1 ring-white/10 ring-inset"
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 320, damping: 22, delay: 0.4 }}
      >
        <span className="absolute inset-x-2 top-[5px] h-2" style={SPROCKETS} aria-hidden />
        <span className="absolute inset-x-2 bottom-[5px] h-2" style={SPROCKETS} aria-hidden />
        <motion.ol
          className="grid grid-cols-3 gap-2"
          initial="hidden"
          animate="shown"
          variants={{ shown: { transition: { staggerChildren: 0.14, delayChildren: 0.55 } } }}
        >
          {STEPS.map((s, i) => (
            <motion.li
              key={s.key}
              className="relative flex min-w-0 flex-col"
              variants={{
                hidden: { opacity: 0, y: 10 },
                shown: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 420, damping: 20 } },
              }}
            >
              {/* Edge print: an ink patch hides the holes behind the number. */}
              <Stamp size="xs" className="absolute -top-[0.95rem] left-0 bg-ink pr-1.5 pl-0.5" ariaLabel={String(i + 1)}>
                {pad(i + 1)}
              </Stamp>
              <span className={cn('flex aspect-[3/2] items-center justify-center rounded-[3px]', s.photo)} aria-hidden>
                <motion.span
                  className="flex"
                  animate={reduce ? undefined : { y: [0, -3, 0], rotate: [0, i % 2 ? 6 : -6, 0] }}
                  transition={{ duration: 2.4, repeat: Infinity, delay: 1.2 + i * 0.35, ease: 'easeInOut' }}
                >
                  <Icon name={s.icon} fill="#fff" className="size-9 text-ink sm:size-10" />
                </motion.span>
              </span>
              <span className="mt-2 px-0.5 text-[0.8rem] leading-tight font-bold text-balance text-cream sm:text-sm">{t(s.key)}</span>
            </motion.li>
          ))}
        </motion.ol>
      </motion.div>
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1, type: 'spring', stiffness: 300, damping: 20 }}>
        <ThemeChips />
      </motion.div>
    </section>
  );
}
