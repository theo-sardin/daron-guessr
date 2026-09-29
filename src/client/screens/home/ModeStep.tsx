import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { useEffect, useId, useRef, useState, type KeyboardEvent, type Ref } from 'react';
import { PHOTOS_PER_PLAYER_OPTIONS, THEME_DEFAULT_PHOTOS, THEMES, type PhotoKind, type Theme } from '../../../shared/protocol';
import { Button } from '../../components/Button';
import { Icon } from '../../components/Icon';
import { BottomBar } from '../../components/Layout';
import { ThemeArt } from '../../components/ThemeArt';
import { Viewfinder } from '../../components/Viewfinder';
import { useT } from '../../i18n';
import { cn } from '../../lib/util';
import { EMOJI_FONT, THEME_BG } from './helpers';

/** Example question shown in each mode's speech bubble ("Anything goes" cycles through several). */
const ASKS: Record<Theme, readonly PhotoKind[]> = {
  parents: ['daronne'],
  family: ['sister'],
  childhood: ['kid'],
  pick: ['pick'],
  mix: ['pet', 'kid', 'daron', 'pick'],
};

/** Card entrance, staggered by the radiogroup. */
const CARD_VARIANTS = {
  hidden: { opacity: 0, y: 26, scale: 0.92 },
  shown: { opacity: 1, y: 0, scale: 1, transition: { type: 'spring' as const, stiffness: 420, damping: 22 } },
};

function usePhotosText() {
  const t = useT();
  return (n: number) => (n === 1 ? t('home.mode.photosOne') : t('home.mode.photosMany', { n }));
}

/**
 * Second step of "Create a room": the host must pick a game mode (nothing is preselected) and
 * can tweak the number of photos per player. The confirm button lives in `ModeConfirmBar`,
 * rendered outside this (transformed) step so its fixed position holds.
 */
export function ModeStep({
  name,
  avatar,
  theme,
  photos,
  onTheme,
  onPhotos,
  onBack,
  busy,
  className,
}: {
  name: string;
  avatar: string;
  theme: Theme | null;
  photos: number;
  onTheme: (theme: Theme) => void;
  onPhotos: (n: number) => void;
  onBack: () => void;
  busy: boolean;
  className?: string;
}) {
  const t = useT();
  const heading = useRef<HTMLHeadingElement>(null);
  const cards = useRef<Array<HTMLButtonElement | null>>([]);

  // Screen readers land on the new step's title (the button that opened it is gone).
  useEffect(() => {
    heading.current?.focus({ preventScroll: true });
  }, []);

  // Radio group keyboard pattern: arrows move the selection, one tab stop for the group.
  const onCardKey = (e: KeyboardEvent<HTMLButtonElement>, index: number) => {
    const last = THEMES.length - 1;
    const next =
      e.key === 'ArrowDown' || e.key === 'ArrowRight'
        ? (index + 1) % THEMES.length
        : e.key === 'ArrowUp' || e.key === 'ArrowLeft'
          ? (index + last) % THEMES.length
          : e.key === 'Home'
            ? 0
            : e.key === 'End'
              ? last
              : null;
    if (next === null) return;
    e.preventDefault();
    cards.current[next]?.focus();
    onTheme(THEMES[next]);
  };

  return (
    <motion.section
      className={className}
      aria-labelledby="home-mode-title"
      initial={{ x: 80, opacity: 0 }}
      animate={{ x: 0, opacity: 1, transition: { type: 'spring', stiffness: 360, damping: 30, delay: 0.16 } }}
      exit={{ x: 80, opacity: 0, transition: { duration: 0.18, ease: 'easeIn' } }}
      onKeyDown={(e) => {
        if (e.key === 'Escape' && !busy) onBack();
      }}
    >
      {/* Phones: Back + profile, title below. Desktop: one row, title in the middle. */}
      <div className="grid grid-cols-[auto_1fr] items-center gap-x-3 gap-y-3 lg:grid-cols-[1fr_auto_1fr]">
        <Button variant="ghost" size="sm" className="h-11 justify-self-start px-3.5" onClick={onBack} disabled={busy} icon={<Icon name="arrow-left" className="size-4" weight="bold" />}>
          {t('home.mode.back')}
        </Button>
        <span className="flex max-w-full min-w-0 items-center gap-2 justify-self-end rounded-full border-2 border-white/20 bg-white/10 py-1 pr-3 pl-1 font-extrabold text-cream lg:col-start-3 lg:row-start-1">
          <span
            className="flex size-8 shrink-0 items-center justify-center rounded-full border-2 border-ink bg-sun text-lg leading-none"
            style={EMOJI_FONT}
            aria-hidden
          >
            {avatar}
          </span>
          <span className="max-w-[9rem] truncate" aria-hidden>
            {name}
          </span>
          <Icon name="crown" fill="var(--color-sun)" className="size-5 shrink-0 text-cream" />
          <span className="sr-only">{t('home.mode.hostAs', { name })}</span>
        </span>

        <div className="col-span-2 text-center lg:col-span-1 lg:col-start-2 lg:row-start-1">
          <span className="label-mono inline-block -rotate-2 rounded-md border-2 border-ink bg-sun px-2 py-1 text-ink shadow-pop-sm">
            {t('home.mode.step')}
          </span>
          <h1
            ref={heading}
            id="home-mode-title"
            tabIndex={-1}
            className="text-outline mt-2 font-display text-[2.1rem] leading-none text-balance text-cream outline-none sm:text-5xl"
          >
            {t('home.mode.title')}
          </h1>
          <p className="mt-1.5 text-sm font-bold text-grape-200 sm:text-base">
            {t('home.mode.sub')}
          </p>
        </div>
      </div>

      <motion.div
        role="radiogroup"
        aria-label={t('home.mode.listLabel')}
        aria-required
        className="mt-5 flex flex-wrap justify-center gap-3 sm:gap-y-4"
        initial="hidden"
        animate="shown"
        variants={{ shown: { transition: { staggerChildren: 0.06, delayChildren: 0.22 } } }}
      >
        {THEMES.map((th, i) => (
          <ModeCard
            key={th}
            theme={th}
            selected={th === theme}
            photos={th === theme ? photos : THEME_DEFAULT_PHOTOS[th]}
            tabbable={theme === null ? i === 0 : th === theme}
            buttonRef={(el) => {
              cards.current[i] = el;
            }}
            onPick={() => onTheme(th)}
            onKeyDown={(e) => onCardKey(e, i)}
          />
        ))}
      </motion.div>

      <PhotosPicker theme={theme} photos={photos} onPhotos={onPhotos} />
      <p className="mt-3 flex items-center justify-center gap-1.5 text-center text-sm font-bold text-grape-300">
        <Icon name="settings" className="size-4 shrink-0" />
        {t('home.mode.later')}
      </p>
    </motion.section>
  );
}

/** One big tappable mode sticker: illustration, photo count, name, pitch and an example question. */
function ModeCard({
  theme,
  selected,
  photos,
  tabbable,
  buttonRef,
  onPick,
  onKeyDown,
}: {
  theme: Theme;
  selected: boolean;
  photos: number;
  tabbable: boolean;
  buttonRef: Ref<HTMLButtonElement>;
  onPick: () => void;
  onKeyDown: (e: KeyboardEvent<HTMLButtonElement>) => void;
}) {
  const t = useT();
  const photosText = usePhotosText();
  const id = useId();
  return (
    <motion.div variants={CARD_VARIANTS} className="relative flex w-full min-w-0 sm:w-[calc(50%-0.375rem)] lg:w-[calc((100%-1.5rem)/3)]">
      <motion.button
        ref={buttonRef}
        type="button"
        role="radio"
        aria-checked={selected}
        aria-labelledby={`${id}-name`}
        aria-describedby={`${id}-desc ${id}-ask ${id}-photos`}
        tabIndex={tabbable ? 0 : -1}
        onClick={onPick}
        onKeyDown={onKeyDown}
        whileHover={selected ? undefined : { y: -3 }}
        whileTap={{ scale: 0.95 }}
        animate={selected ? { scale: [1, 1.04, 1], rotate: [0, -1.5, -0.6] } : { scale: 1, rotate: 0 }}
        transition={{ type: 'spring', stiffness: 520, damping: 16 }}
        className={cn(
          'relative flex w-full min-w-0 items-start gap-3 rounded-3xl border-3 border-ink p-3 text-left text-ink transition-[background-color,box-shadow] duration-200 sm:p-3.5',
          selected ? cn(THEME_BG[theme], 'z-10 shadow-pop') : 'bg-cream shadow-pop-sm hover:bg-white',
        )}
      >
        <AnimatePresence>
          {selected && (
            <motion.span
              key="check"
              initial={{ scale: 0, rotate: -45 }}
              animate={{ scale: 1, rotate: 0 }}
              exit={{ scale: 0, transition: { duration: 0.12 } }}
              transition={{ type: 'spring', stiffness: 600, damping: 14 }}
              className="absolute top-2.5 right-2.5 flex size-7 items-center justify-center rounded-full border-2 border-ink bg-ink text-cream"
              aria-hidden
            >
              <Icon name="check" className="size-4" weight="bold" />
            </motion.span>
          )}
        </AnimatePresence>

        <motion.span
          className="relative size-14 shrink-0 min-[375px]:size-[4.5rem] sm:size-20"
          animate={selected ? { scale: [1, 1.18, 1], rotate: [0, -8, 0] } : { scale: 1, rotate: 0 }}
          transition={{ duration: 0.45 }}
          aria-hidden
        >
          <ThemeArt theme={theme} className="size-full" />
        </motion.span>

        <span className="min-w-0 flex-1">
          {/* Photo count as a micro-label above the name (pops when the count changes). */}
          <motion.span
            key={photos}
            id={`${id}-photos`}
            initial={selected ? { scale: 1.25, x: -4 } : false}
            animate={{ scale: 1, x: 0 }}
            transition={{ type: 'spring', stiffness: 520, damping: 14 }}
            className={cn('label-mono flex origin-left items-center gap-1 pt-1 pr-7 whitespace-nowrap', selected ? 'text-ink' : 'text-ink/65')}
          >
            <Icon name="images" className="size-3.5 shrink-0" weight="bold" />
            {photosText(photos)}
          </motion.span>
          <span id={`${id}-name`} className="mt-1 block pr-6 font-display text-xl leading-tight">
            {t(`common.theme.${theme}.name`)}
          </span>
          <span id={`${id}-desc`} className="mt-0.5 block text-sm leading-snug font-semibold text-ink/75">
            {t(`common.theme.${theme}.desc`)}
          </span>
          <Ask id={`${id}-ask`} kinds={ASKS[theme]} />
        </span>
      </motion.button>

      {/* The selected mode is "in focus": viewfinder brackets snap around it. */}
      <AnimatePresence>
        {selected && (
          <motion.div
            key="focus"
            className="pointer-events-none absolute inset-0 z-20"
            exit={{ opacity: 0, transition: { duration: 0.12 } }}
            aria-hidden
          >
            <Viewfinder className="absolute inset-0" color="var(--color-cream)" gap={8} length={20} thickness={3.5} snap />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

/** Speech bubble with the question players will get ("Whose mom is this?"), cycling when several. */
function Ask({ id, kinds }: { id: string; kinds: readonly PhotoKind[] }) {
  const t = useT();
  const reduce = useReducedMotion();
  const [index, setIndex] = useState(0);
  useEffect(() => {
    if (kinds.length < 2 || reduce) return;
    const timer = window.setInterval(() => setIndex((i) => (i + 1) % kinds.length), 2400);
    return () => window.clearInterval(timer);
  }, [kinds.length, reduce]);
  const kind = kinds[index % kinds.length];
  return (
    <span
      id={id}
      className="relative mt-2 inline-flex max-w-full rounded-2xl rounded-tl-md border-2 border-ink bg-white px-2.5 py-1 font-display text-sm leading-tight text-ink"
    >
      <span className="absolute -top-[6px] left-3 size-2.5 rotate-45 border-t-2 border-l-2 border-ink bg-white" aria-hidden />
      {/* Clipped, so a new question rolls in like a ticker instead of spilling out of the bubble. */}
      <span className="relative block min-w-0 overflow-hidden">
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.span
            key={kind}
            className="relative block"
            initial={{ opacity: 0, y: '100%' }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: '-100%' }}
            transition={{ duration: 0.22 }}
          >
            {t('home.mode.quote', { q: t(`common.whose.${kind}`) })}
          </motion.span>
        </AnimatePresence>
      </span>
    </span>
  );
}

/** 1 / 2 / 3 photos per player: jumps to the mode's default on every pick, then free to change. */
function PhotosPicker({ theme, photos, onPhotos }: { theme: Theme | null; photos: number; onPhotos: (n: number) => void }) {
  const t = useT();
  const off = theme === null;
  const help = off ? t('home.mode.photosHelpNone') : photos === 1 ? t('home.mode.photosHelpOne') : t('home.mode.photosHelpMany', { n: photos });
  return (
    <div
      className={cn(
        'mx-auto mt-6 w-full max-w-md rounded-3xl border-3 border-ink bg-cream p-4 text-ink shadow-pop transition-opacity lg:flex lg:max-w-3xl lg:items-center lg:gap-6 lg:py-3',
        off && 'opacity-60',
      )}
    >
      <div className="flex items-center justify-between gap-3 lg:shrink-0 lg:gap-4">
        <span id="home-mode-photos" className="flex items-center gap-1.5 font-extrabold">
          <Icon name="images" fill="var(--color-mint)" className="size-5 shrink-0" />
          {t('home.mode.photosLabel')}
        </span>
        <div
          role="radiogroup"
          aria-labelledby="home-mode-photos"
          aria-describedby="home-mode-photos-help"
          aria-disabled={off || undefined}
          className="grid w-32 shrink-0 grid-cols-3 gap-1 rounded-2xl border-3 border-ink bg-white p-1 min-[375px]:w-36"
        >
          {PHOTOS_PER_PLAYER_OPTIONS.map((n) => {
            const selected = !off && photos === n;
            return (
              <motion.button
                key={n}
                type="button"
                role="radio"
                aria-checked={selected}
                disabled={off}
                onClick={() => onPhotos(n)}
                whileTap={off ? undefined : { scale: 0.88 }}
                className={cn(
                  'relative h-10 min-w-0 rounded-xl font-display text-lg transition-colors',
                  selected ? 'text-ink' : 'text-ink/55 enabled:hover:bg-ink/5 enabled:hover:text-ink',
                )}
              >
                {selected && (
                  <motion.span
                    layoutId="home-photos-pill"
                    className="absolute inset-0 rounded-xl border-2 border-ink bg-mint shadow-pop-sm"
                    transition={{ type: 'spring', stiffness: 500, damping: 32 }}
                  />
                )}
                <span className="relative">{n}</span>
              </motion.button>
            );
          })}
        </div>
      </div>
      <AnimatePresence mode="wait" initial={false}>
        <motion.p
          key={help}
          id="home-mode-photos-help"
          className="mt-2 text-sm leading-snug font-semibold text-ink-soft lg:mt-0 lg:min-w-0 lg:flex-1"
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 4 }}
          transition={{ duration: 0.15 }}
        >
          {help}
        </motion.p>
      </AnimatePresence>
    </div>
  );
}

/**
 * Sticky confirm area of the mode step. Disabled until a mode is picked (the "mandatory" part),
 * with a hint that turns into a summary of the choice. Only opacity is animated on the fixed
 * wrapper: a transform would re-anchor the fixed BottomBar.
 */
export function ModeConfirmBar({
  theme,
  photos,
  loading,
  onConfirm,
  buttonRef,
}: {
  theme: Theme | null;
  photos: number;
  loading: boolean;
  onConfirm: () => void;
  buttonRef: Ref<HTMLButtonElement>;
}) {
  const t = useT();
  const photosText = usePhotosText();
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1, transition: { delay: 0.2 } }} exit={{ opacity: 0, transition: { duration: 0.15 } }}>
      <BottomBar className="flex-col gap-2">
        <motion.div
          className="flex w-full flex-col items-center gap-2"
          initial={{ y: 90 }}
          animate={{ y: 0, transition: { type: 'spring', stiffness: 380, damping: 26, delay: 0.22 } }}
          exit={{ y: 90, transition: { duration: 0.15 } }}
        >
          <div className="flex h-8 max-w-full items-center justify-center">
            <AnimatePresence mode="wait" initial={false}>
              {theme ? (
                <motion.span
                  key={theme}
                  className={cn(
                    'flex max-w-full items-center gap-1.5 truncate rounded-full border-2 border-ink py-0.5 pr-3 pl-1 font-display text-sm text-ink shadow-pop-sm',
                    THEME_BG[theme],
                  )}
                  initial={{ scale: 0.6, rotate: -6, opacity: 0 }}
                  animate={{ scale: 1, rotate: -1, opacity: 1 }}
                  exit={{ scale: 0.6, opacity: 0, transition: { duration: 0.1 } }}
                  transition={{ type: 'spring', stiffness: 600, damping: 18 }}
                >
                  <ThemeArt theme={theme} compact className="size-6 shrink-0" />
                  <span className="truncate">
                    {t(`common.theme.${theme}.name`)} · {photosText(photos)}
                  </span>
                </motion.span>
              ) : (
                <motion.span
                  key="none"
                  id="home-mode-hint"
                  className="flex items-center gap-1.5 rounded-full border-2 border-sun/50 bg-grape-950/90 px-3 py-1 text-sm font-extrabold text-sun"
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6, transition: { duration: 0.1 } }}
                >
                  <motion.span
                    className="inline-flex"
                    animate={{ y: [0, -4, 0] }}
                    transition={{ duration: 1.1, repeat: Infinity, ease: 'easeInOut' }}
                    aria-hidden
                  >
                    <Icon name="arrow-right" className="size-4 -rotate-90" weight="bold" />
                  </motion.span>
                  {t('home.mode.pickFirst')}
                </motion.span>
              )}
            </AnimatePresence>
          </div>
          {/* Solid backing: the dimmed (disabled) button must not show the cards through it. */}
          <div className="w-full rounded-3xl bg-grape-950">
            <Button
              ref={buttonRef}
              variant="primary"
              size="xl"
              block
              loading={loading}
              disabled={theme === null}
              aria-describedby={theme === null ? 'home-mode-hint' : undefined}
              onClick={onConfirm}
            >
              <span className="inline-flex items-center gap-3">
                {t('home.mode.confirm')}
                <Icon name="arrow-right" className="size-7" weight="bold" />
              </span>
            </Button>
          </div>
        </motion.div>
      </BottomBar>
    </motion.div>
  );
}
