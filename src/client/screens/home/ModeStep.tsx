import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { useEffect, useId, useRef, useState, type KeyboardEvent, type Ref } from 'react';
import { PHOTOS_PER_PLAYER_OPTIONS, THEME_DEFAULT_PHOTOS, THEMES, type PhotoKind, type Theme } from '../../../shared/protocol';
import { Button } from '../../components/Button';
import { Icon } from '../../components/Icon';
import { BottomBar } from '../../components/Layout';
import { Annotation, MarkerCheck, MarkerCircle } from '../../components/Marker';
import { NotebookCard } from '../../components/Paper';
import { Tape } from '../../components/Tape';
import { themeColor, ThemeArt } from '../../components/ThemeArt';
import { TornPaper } from '../../components/TornPaper';
import { useT } from '../../i18n';
import { cn } from '../../lib/util';

/** Example question of each mode's card (several cycle like a ticker). */
const ASKS: Record<Theme, readonly PhotoKind[]> = {
  parents: ['daronne'],
  family: ['sister'],
  childhood: ['kid'],
  pick: ['pick'],
  roll: ['roll'],
  crush: ['crush'],
  whois: ['me'],
  body: ['ear', 'hand', 'knee', 'navel'],
  mix: ['pet', 'kid', 'crush', 'daron', 'pick'],
};

/** Little deterministic tilts so the grid looks pinned by hand, not printed. */
const TILTS = [-1.4, 1.1, 0.7, -0.9, 1.3, -0.6, -1.1, 0.9, 0.4];

/** Card entrance, staggered by the radiogroup. */
const CARD_VARIANTS = {
  hidden: { opacity: 0, y: 22, scale: 0.9 },
  shown: { opacity: 1, y: 0, scale: 1, transition: { type: 'spring' as const, stiffness: 420, damping: 22 } },
};

function usePhotosText() {
  const t = useT();
  return (n: number) => (n === 1 ? t('home.mode.photosOne') : t('home.mode.photosMany', { n }));
}

/**
 * Second step of "Create a room": the host must pick a game mode (nothing is preselected), then
 * can tweak the house rules (photos per player, blurry photos). The confirm button lives in
 * `ModeConfirmBar`, rendered outside this (transformed) step so its fixed position holds.
 */
export function ModeStep({
  name,
  avatar,
  selfie,
  theme,
  photos,
  blur,
  onTheme,
  onPhotos,
  onBlur,
  onBack,
  busy,
  className,
}: {
  name: string;
  avatar: string;
  selfie: string | null;
  theme: Theme | null;
  photos: number;
  blur: boolean;
  onTheme: (theme: Theme) => void;
  onPhotos: (n: number) => void;
  onBlur: (on: boolean) => void;
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
      <div className="mx-auto max-w-3xl">
        <div className="flex items-center justify-between gap-3">
          <Button variant="outline" size="sm" onClick={onBack} disabled={busy} icon={<Icon name="arrow-left" className="size-4" weight="bold" />}>
            {t('home.mode.back')}
          </Button>
          <HostChip name={name} avatar={avatar} selfie={selfie} />
        </div>

        <div className="mt-5 text-center">
          <Annotation font="marker" rotate={-4} size={19} delay={0.3}>
            {t('home.mode.step')}
          </Annotation>
          <h1
            ref={heading}
            id="home-mode-title"
            tabIndex={-1}
            className="mt-1 text-[2.05rem] leading-[0.98] font-black tracking-[-0.02em] text-balance text-ink outline-none sm:text-5xl"
            style={{ fontStretch: '112%' }}
          >
            {t('home.mode.title')}
          </h1>
          <p className="text-pen mt-2 text-[1.2rem] leading-tight text-balance">{t('home.mode.sub')}</p>
        </div>

        <motion.div
          role="radiogroup"
          aria-label={t('home.mode.listLabel')}
          aria-required
          className="mt-6 grid grid-cols-2 gap-x-3 gap-y-4 sm:grid-cols-3 sm:gap-x-4 sm:gap-y-5"
          initial="hidden"
          animate="shown"
          variants={{ shown: { transition: { staggerChildren: 0.045, delayChildren: 0.2 } } }}
        >
          {THEMES.map((th, i) => (
            <ModeCard
              key={th}
              theme={th}
              index={i}
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

        <HouseRules theme={theme} photos={photos} blur={blur} onPhotos={onPhotos} onBlur={onBlur} />
      </div>
    </motion.section>
  );
}

/** "Hosting as": the player's disc (selfie or emoji) and name on a paper tag, with a crown. */
function HostChip({ name, avatar, selfie }: { name: string; avatar: string; selfie: string | null }) {
  const t = useT();
  return (
    <TornPaper surface="sheet" edges="lr" amp={2} seed="home-host" lift="sm" tilt={1.5} wrapperClassName="min-w-0" className="flex min-w-0 items-center gap-2 py-1.5 pr-3 pl-2">
      <span className="relative flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-white bg-mint shadow-paper-sm" aria-hidden>
        {selfie ? <img src={selfie} alt="" className="size-full object-cover" draggable={false} /> : <span className="emoji text-xl leading-none">{avatar}</span>}
      </span>
      <span className="max-w-[9rem] min-w-0 truncate font-extrabold" aria-hidden>
        {name}
      </span>
      <Icon name="crown" fill="var(--color-yellow)" className="size-5 shrink-0 text-ink" />
      <span className="sr-only">{t('home.mode.hostAs', { name })}</span>
    </TornPaper>
  );
}

/**
 * One mode, pinned like a scrap: its little collage, the name, a one-line pitch and the question
 * players will get, in ballpoint. "Anything goes" spans the whole row on phones (9 modes, 2 columns).
 */
function ModeCard({
  theme,
  index,
  selected,
  photos,
  tabbable,
  buttonRef,
  onPick,
  onKeyDown,
}: {
  theme: Theme;
  index: number;
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
  const wide = theme === 'mix';
  const tilt = TILTS[index % TILTS.length];
  return (
    <motion.div variants={CARD_VARIANTS} className={cn('relative flex min-w-0', wide && 'col-span-2 sm:col-span-1')}>
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
        whileHover={selected ? undefined : { y: -3, rotate: 0 }}
        whileTap={{ scale: 0.95 }}
        initial={false}
        animate={selected ? { rotate: tilt * 0.4, scale: 1.035, y: -2 } : { rotate: tilt, scale: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 520, damping: 18 }}
        className={cn(
          'group relative flex w-full min-w-0 text-left text-ink transition-shadow duration-200 focus-visible:outline-offset-4',
          selected ? 'z-10 shadow-paper-lg' : 'shadow-paper-sm',
        )}
      >
        <span
          className={cn(
            'relative flex w-full min-w-0 gap-x-3 p-2.5 pb-3 transition-colors duration-200',
            wide ? 'flex-row items-center max-sm:pr-3 sm:flex-col sm:items-stretch' : 'flex-col',
            selected ? '' : 'paper-sheet',
          )}
          style={selected ? { backgroundColor: themeColor(theme) } : undefined}
        >
          {/* The collage + the photo count, typed like a caption on the back of a print. */}
          <span className={cn('flex items-start justify-between gap-1', wide && 'max-sm:shrink-0')}>
            <motion.span
              className="-mt-0.5 -ml-0.5 flex"
              animate={selected ? { scale: [1, 1.14, 1], rotate: [0, -7, 0] } : { scale: 1, rotate: 0 }}
              transition={{ duration: 0.45 }}
              aria-hidden
            >
              <ThemeArt theme={theme} className="size-[3.9rem] min-[375px]:size-[4.4rem] sm:size-20" />
            </motion.span>
            <span id={`${id}-photos`} className={cn('pt-0.5 text-right font-[family-name:var(--font-type)] text-[0.68rem] leading-tight text-ink-soft', wide && 'max-sm:hidden')}>
              {photosText(photos)}
            </span>
          </span>
          <span className="mt-1 block min-w-0 flex-1">
            <span id={`${id}-name`} className="block text-[1.02rem] leading-[1.1] font-extrabold tracking-[-0.01em] min-[375px]:text-[1.08rem]">
              {t(`common.theme.${theme}.name`)}
            </span>
            <span id={`${id}-desc`} className="mt-0.5 block text-[0.8rem] leading-[1.25] font-medium text-ink-soft">
              {t(`home.mode.pitch.${theme}`)}
            </span>
            <Ask id={`${id}-ask`} kinds={ASKS[theme]} />
            {wide && (
              <span className="mt-0.5 block font-[family-name:var(--font-type)] text-[0.68rem] text-ink-soft sm:hidden" aria-hidden>
                {photosText(photos)}
              </span>
            )}
          </span>
        </span>

        {/* Picked: taped down, a marker tick in the corner. */}
        <AnimatePresence>
          {selected && (
            <motion.span key="picked" className="pointer-events-none absolute inset-0" exit={{ opacity: 0, transition: { duration: 0.12 } }} aria-hidden>
              <Tape tone="cream" width={58} height={20} rotate={-4} animate className="-top-2.5 left-1/2 -translate-x-1/2" />
              <MarkerCheck className="absolute -top-3 -right-2 size-9" strokeWidth={5} sound />
            </motion.span>
          )}
        </AnimatePresence>
      </motion.button>
    </motion.div>
  );
}

/** The question players will get ("Whose ear is this?"), in ballpoint; several cycle like a ticker. */
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
    <span id={id} className="relative mt-1.5 block overflow-hidden">
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span
          key={kind}
          className="text-pen block text-[1.08rem] leading-[1.02] min-[375px]:text-[1.14rem]"
          initial={{ opacity: 0, y: '100%' }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: '-100%' }}
          transition={{ duration: 0.22 }}
        >
          {t('home.mode.quote', { q: t(`common.whose.${kind}`) })}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}

/**
 * House rules, on a notebook page: photos per player (1 / 2 / 3, the picked number circled in red
 * marker) and the blurry photos switch. Both jump to the mode's defaults on every pick.
 */
function HouseRules({
  theme,
  photos,
  blur,
  onPhotos,
  onBlur,
}: {
  theme: Theme | null;
  photos: number;
  blur: boolean;
  onPhotos: (n: number) => void;
  onBlur: (on: boolean) => void;
}) {
  const t = useT();
  const off = theme === null;
  const photosHelp = off ? t('home.mode.photosHelpNone') : photos === 1 ? t('home.mode.photosHelpOne') : t('home.mode.photosHelpMany', { n: photos });
  return (
    <NotebookCard
      tilt={-0.5}
      tape
      margin={18}
      wrapperClassName={cn('mx-auto mt-8 w-full max-w-md transition-opacity lg:max-w-2xl', off && 'opacity-70')}
      className="pt-4 pr-4 pb-6"
    >
      <h2 className="font-[family-name:var(--font-type)] text-[0.8rem] tracking-[0.08em] text-ink-soft uppercase">{t('home.mode.settingsTitle')}</h2>

      <div className="mt-2 lg:grid lg:grid-cols-2 lg:gap-8">
        <div>
          <div className="flex items-center justify-between gap-3">
            <span id="home-mode-photos" className="font-extrabold">
              {t('home.mode.photosLabel')}
            </span>
            <div role="radiogroup" aria-labelledby="home-mode-photos" aria-describedby="home-mode-photos-help" aria-disabled={off || undefined} className="flex shrink-0 gap-1">
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
                    whileTap={off ? undefined : { scale: 0.86 }}
                    className={cn('flex size-11 items-center justify-center rounded-full font-num text-[1.6rem] leading-none transition-colors', selected ? 'text-ink' : 'text-ink/45 enabled:hover:text-ink')}
                  >
                    <MarkerCircle show={selected} pad={6} strokeWidth={3.2} seed={`photos-${n}`}>
                      <span className="block px-1">{n}</span>
                    </MarkerCircle>
                  </motion.button>
                );
              })}
            </div>
          </div>
          <Help id="home-mode-photos-help" text={photosHelp} />
        </div>

        <div className="mt-4 lg:mt-0">
          <div className="flex items-center justify-between gap-3">
            <span id="home-mode-blur" className="font-extrabold leading-tight">
              {t('home.mode.blurLabel')}
            </span>
            <PaperSwitch on={!off && blur} disabled={off} labelledBy="home-mode-blur" describedBy="home-mode-blur-help" onChange={onBlur} />
          </div>
          <Help id="home-mode-blur-help" text={blur ? t('home.mode.blurHelpOn') : t('home.mode.blurHelpOff')} />
        </div>
      </div>

      <p className="mt-3 flex items-center gap-1.5 text-[0.85rem] font-semibold text-ink-soft">
        <Icon name="settings" className="size-4 shrink-0" />
        {t('home.mode.later')}
      </p>
    </NotebookCard>
  );
}

function Help({ id, text }: { id: string; text: string }) {
  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.p
        key={text}
        id={id}
        className="text-pen mt-1 text-[1.08rem] leading-[1.1]"
        initial={{ opacity: 0, y: -4 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 4 }}
        transition={{ duration: 0.15 }}
      >
        {text}
      </motion.p>
    </AnimatePresence>
  );
}

/** An on/off switch drawn on paper: ink outline, the knob slides onto a marker-red track. */
function PaperSwitch({
  on,
  disabled,
  labelledBy,
  describedBy,
  onChange,
}: {
  on: boolean;
  disabled: boolean;
  labelledBy: string;
  describedBy: string;
  onChange: (on: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-labelledby={labelledBy}
      aria-describedby={describedBy}
      disabled={disabled}
      onClick={() => onChange(!on)}
      className="relative flex h-11 w-[4.25rem] shrink-0 items-center"
    >
      <span className={cn('absolute inset-x-0 top-1/2 h-8 -translate-y-1/2 rounded-full border-[2.5px] border-ink transition-colors duration-200', on ? 'bg-red' : 'bg-sheet')} aria-hidden />
      <motion.span
        className="relative size-6 rounded-full border-[2.5px] border-ink bg-yellow shadow-paper-sm"
        initial={false}
        animate={{ x: on ? 38 : 6 }}
        transition={{ type: 'spring', stiffness: 600, damping: 30 }}
        aria-hidden
      />
    </button>
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
  blur,
  loading,
  onConfirm,
  buttonRef,
}: {
  theme: Theme | null;
  photos: number;
  blur: boolean;
  loading: boolean;
  onConfirm: () => void;
  buttonRef: Ref<HTMLButtonElement>;
}) {
  const t = useT();
  const photosText = usePhotosText();
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1, transition: { delay: 0.2 } }} exit={{ opacity: 0, transition: { duration: 0.15 } }}>
      <BottomBar className="flex-col gap-2.5">
        <motion.div
          className="flex w-full flex-col items-center gap-2.5"
          initial={{ y: 90 }}
          animate={{ y: 0, transition: { type: 'spring', stiffness: 380, damping: 26, delay: 0.22 } }}
          exit={{ y: 90, transition: { duration: 0.15 } }}
        >
          <div className="flex h-8 max-w-full items-center justify-center">
            <AnimatePresence mode="wait" initial={false}>
              {theme ? (
                <motion.span
                  key={theme}
                  className="flex max-w-full min-w-0 items-center gap-1.5 py-0.5 pr-3 pl-1 text-sm font-extrabold text-ink shadow-paper-sm"
                  style={{ backgroundColor: themeColor(theme) }}
                  initial={{ scale: 0.6, rotate: -6, opacity: 0 }}
                  animate={{ scale: 1, rotate: -1.5, opacity: 1 }}
                  exit={{ scale: 0.6, opacity: 0, transition: { duration: 0.1 } }}
                  transition={{ type: 'spring', stiffness: 600, damping: 18 }}
                >
                  <ThemeArt theme={theme} compact className="size-7 shrink-0" />
                  <span className="truncate">{t(`common.theme.${theme}.name`)}</span>
                  <span className="sr-only">
                    {' · '}
                    {photosText(photos)}
                    {blur && ` · ${t('home.mode.blurTag')}`}
                  </span>
                  <span className="ml-1 flex shrink-0 items-center gap-0.5 font-num text-[0.95rem]" aria-hidden>
                    <Icon name="images" className="size-4" weight="bold" />
                    {photos}
                  </span>
                  {blur && (
                    <span className="ml-1 flex shrink-0 items-center gap-0.5" aria-hidden>
                      <Icon name="eye-off" className="size-4" weight="bold" />
                      {t('home.mode.blurTag')}
                    </span>
                  )}
                </motion.span>
              ) : (
                <motion.span
                  key="none"
                  id="home-mode-hint"
                  className="text-marker flex items-center gap-1.5 text-[1.05rem] text-red-ink"
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6, transition: { duration: 0.1 } }}
                >
                  <motion.span className="inline-flex" animate={{ y: [0, -4, 0] }} transition={{ duration: 1.1, repeat: Infinity, ease: 'easeInOut' }} aria-hidden>
                    <Icon name="arrow-right" className="size-4 -rotate-90" weight="bold" />
                  </motion.span>
                  {t('home.mode.pickFirst')}
                </motion.span>
              )}
            </AnimatePresence>
          </div>
          <Button
            ref={buttonRef}
            variant="primary"
            size="xl"
            block
            arrow
            tape
            loading={loading}
            disabled={theme === null}
            aria-describedby={theme === null ? 'home-mode-hint' : undefined}
            onClick={onConfirm}
          >
            {t('home.mode.confirm')}
          </Button>
        </motion.div>
      </BottomBar>
    </motion.div>
  );
}
