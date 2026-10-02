import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { useEffect, useId, useRef, useState, type KeyboardEvent, type ReactNode, type Ref } from 'react';
import { PHOTOS_PER_PLAYER_OPTIONS, THEME_DEFAULT_PHOTOS, THEMES, type PhotoKind, type Theme } from '../../../shared/protocol';
import { Button } from '../../components/Button';
import { BottomBar } from '../../components/Layout';
import { useT } from '../../i18n';
import { cn } from '../../lib/util';
import { glyphCount, THEME_BG } from '../lobby/look';
import { EMOJI_FONT } from './helpers';

/** Example question shown in each mode's speech bubble (several cycle like a ticker). */
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
      {/* Phones: Back + profile, title below. Desktop: one row, title in the middle. */}
      <div className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-x-3 gap-y-3 lg:grid-cols-[1fr_auto_1fr]">
        <Button variant="ghost" size="sm" className="justify-self-start" onClick={onBack} disabled={busy} icon={<span aria-hidden>←</span>}>
          {t('home.mode.back')}
        </Button>
        <HostChip name={name} avatar={avatar} selfie={selfie} />

        <div className="col-span-2 text-center lg:col-span-1 lg:col-start-2 lg:row-start-1">
          <span className="inline-block -rotate-2 rounded-lg border-2 border-ink bg-sun px-2 py-0.5 font-display text-xs tracking-wider text-ink uppercase shadow-pop-sm">
            {t('home.mode.step')}
          </span>
          <h1
            ref={heading}
            id="home-mode-title"
            tabIndex={-1}
            className="text-outline mt-2 font-display text-[2.1rem] leading-none text-cream outline-none sm:text-5xl"
          >
            {t('home.mode.title')}
          </h1>
          <p className="mt-1.5 text-sm font-bold text-grape-200 sm:text-base">
            {t('home.mode.sub')} <span aria-hidden>📸</span>
          </p>
        </div>
      </div>

      <motion.div
        role="radiogroup"
        aria-label={t('home.mode.listLabel')}
        aria-required
        className="mt-7 flex flex-wrap justify-center gap-x-3 gap-y-5"
        initial="hidden"
        animate="shown"
        variants={{ shown: { transition: { staggerChildren: 0.045, delayChildren: 0.22 } } }}
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

      <HouseRules theme={theme} photos={photos} blur={blur} onPhotos={onPhotos} onBlur={onBlur} />
    </motion.section>
  );
}

/** "Hosting as": the player's bubble (selfie or emoji) and name on a glass pill, with a crown. */
function HostChip({ name, avatar, selfie }: { name: string; avatar: string; selfie: string | null }) {
  const t = useT();
  return (
    <span className="flex max-w-full min-w-0 items-center gap-2 justify-self-end rounded-full border-2 border-white/20 bg-white/10 py-1 pr-3 pl-1 font-extrabold text-cream lg:col-start-3 lg:row-start-1">
      <span
        className="flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-ink bg-sun text-lg leading-none"
        style={EMOJI_FONT}
        aria-hidden
      >
        {selfie ? <img src={selfie} alt="" draggable={false} className="size-full object-cover" /> : avatar}
      </span>
      <span className="max-w-[9rem] min-w-0 truncate" aria-hidden>
        {name}
      </span>
      <span aria-hidden>👑</span>
      <span className="sr-only">{t('home.mode.hostAs', { name })}</span>
    </span>
  );
}

/** One big tappable mode sticker: emoji, name, pitch, an example question and the photo count. */
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
  const emoji = t(`common.theme.${theme}.emoji`);
  return (
    <motion.div variants={CARD_VARIANTS} className="flex w-full min-w-0 sm:w-[calc(50%-0.375rem)] lg:w-[calc((100%-1.5rem)/3)]">
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
        animate={selected ? { scale: [1, 1.05, 1], rotate: [0, -2, -0.8] } : { scale: 1, rotate: 0 }}
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
              className="absolute -top-2.5 -left-2.5 z-10 flex size-8 items-center justify-center rounded-full border-3 border-ink bg-white text-base font-black"
              aria-hidden
            >
              ✓
            </motion.span>
          )}
        </AnimatePresence>

        {/* Photo count, as a tag clipped on the top edge (the default one until the mode is picked). */}
        <motion.span
          key={photos}
          id={`${id}-photos`}
          initial={selected ? { scale: 1.35, rotate: -8 } : false}
          animate={{ scale: 1, rotate: 3 }}
          transition={{ type: 'spring', stiffness: 520, damping: 14 }}
          className="absolute -top-3 right-4 rounded-full border-2 border-ink bg-white px-2 py-0.5 text-xs font-extrabold whitespace-nowrap shadow-pop-sm"
        >
          <span className="mr-1" style={EMOJI_FONT} aria-hidden>
            📸
          </span>
          {photosText(photos)}
        </motion.span>

        <span
          className={cn(
            'flex size-14 shrink-0 items-center justify-center rounded-2xl border-3 border-ink leading-none shadow-pop-sm transition-colors sm:size-16',
            selected ? 'bg-white' : THEME_BG[theme],
          )}
          aria-hidden
        >
          <motion.span
            className={cn('whitespace-nowrap', glyphCount(emoji) > 1 ? 'text-lg tracking-[-0.12em] sm:text-xl' : 'text-3xl sm:text-4xl')}
            style={EMOJI_FONT}
            animate={selected ? { scale: [1, 1.4, 1], rotate: [0, -14, 0] } : { scale: 1, rotate: 0 }}
            transition={{ duration: 0.45 }}
          >
            {emoji}
          </motion.span>
        </span>

        <span className="min-w-0 flex-1">
          <span id={`${id}-name`} className="block pr-2 font-display text-xl leading-tight">
            {t(`common.theme.${theme}.name`)}
          </span>
          <span id={`${id}-desc`} className="mt-0.5 block text-sm leading-snug font-semibold text-ink/75">
            {t(`home.mode.pitch.${theme}`)}
          </span>
          <Ask id={`${id}-ask`} kinds={ASKS[theme]} />
        </span>
      </motion.button>
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
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span
          key={kind}
          className="relative"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.2 }}
        >
          {t('home.mode.quote', { q: t(`common.whose.${kind}`) })}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}

/**
 * House rules: photos per player (1 / 2 / 3) and the blurry photos switch. Both jump to the
 * mode's defaults on every pick, then are free to change; locked until a mode is picked.
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
  const blurOn = !off && blur;
  return (
    <motion.div
      className="mx-auto mt-8 w-full max-w-md lg:max-w-3xl"
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 22, delay: 0.5 }}
    >
      <div className={cn('rounded-3xl border-3 border-ink bg-cream p-4 text-ink shadow-pop transition-opacity duration-200', off && 'opacity-60')}>
        <h2 className="font-display text-xl leading-none">
          <span aria-hidden>🏠 </span>
          {t('home.mode.settingsTitle')}
        </h2>

        <div className="mt-3 lg:grid lg:grid-cols-2 lg:gap-8">
          <div>
            <div className="flex items-center justify-between gap-3">
              <span className="font-extrabold">
                <span aria-hidden>🖼️ </span>
                {t('home.mode.photosLabel')}
              </span>
              <div
                role="radiogroup"
                aria-label={t('home.mode.photosLabel')}
                aria-describedby="home-mode-photos-help"
                aria-disabled={off || undefined}
                className="grid w-36 shrink-0 grid-cols-3 gap-1 rounded-2xl border-3 border-ink bg-white p-1"
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
            <Help id="home-mode-photos-help">{photosHelp}</Help>
          </div>

          <div className="mt-4 lg:mt-0">
            <div className="flex items-center justify-between gap-3">
              <span className="leading-tight font-extrabold">
                <span aria-hidden>🌫️ </span>
                {t('home.mode.blurLabel')}
              </span>
              <Switch on={blurOn} disabled={off} label={t('home.mode.blurLabel')} describedBy="home-mode-blur-help" onToggle={() => onBlur(!blur)} />
            </div>
            <Help id="home-mode-blur-help">{blurOn ? t('home.mode.blurHelpOn') : t('home.mode.blurHelpOff')}</Help>
          </div>
        </div>

        <p className="mt-4 border-t-2 border-dashed border-ink/20 pt-3 text-sm font-bold text-ink-soft">
          <span aria-hidden>🔧 </span>
          {t('home.mode.later')}
        </p>
      </div>
    </motion.div>
  );
}

function Help({ id, children }: { id: string; children: ReactNode }) {
  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.p
        key={String(children)}
        id={id}
        className="mt-1.5 text-sm leading-snug font-semibold text-ink-soft"
        initial={{ opacity: 0, y: -4 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 4 }}
        transition={{ duration: 0.15 }}
      >
        {children}
      </motion.p>
    </AnimatePresence>
  );
}

/** Chunky on/off switch (like the lobby's): the knob slides to the mint side when on. */
function Switch({ on, disabled, label, describedBy, onToggle }: { on: boolean; disabled: boolean; label: string; describedBy: string; onToggle: () => void }) {
  const t = useT();
  return (
    <motion.button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      aria-describedby={describedBy}
      disabled={disabled}
      onClick={onToggle}
      whileTap={disabled ? undefined : { scale: 0.92 }}
      className={cn(
        'relative flex h-11 w-24 shrink-0 items-center rounded-full border-3 border-ink p-1 shadow-pop-sm transition-colors',
        on ? 'justify-end bg-mint' : 'justify-start bg-grape-200',
      )}
    >
      <span className={cn('absolute font-display text-sm text-ink', on ? 'left-3' : 'right-3')} aria-hidden>
        {on ? t('home.mode.on') : t('home.mode.off')}
      </span>
      <motion.span
        layout
        transition={{ type: 'spring', stiffness: 600, damping: 30 }}
        className="relative size-8 rounded-full border-2 border-ink bg-white shadow-pop-sm"
      />
    </motion.button>
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
      {/* No reaction button before the room exists: the bar takes the full width on phones too. */}
      <BottomBar className="flex-col gap-2 pr-4!">
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
                    'flex max-w-full min-w-0 items-center gap-1.5 rounded-full border-2 border-ink px-3 py-1 font-display text-sm text-ink shadow-pop-sm',
                    THEME_BG[theme],
                  )}
                  initial={{ scale: 0.6, rotate: -6, opacity: 0 }}
                  animate={{ scale: 1, rotate: -1, opacity: 1 }}
                  exit={{ scale: 0.6, opacity: 0, transition: { duration: 0.1 } }}
                  transition={{ type: 'spring', stiffness: 600, damping: 18 }}
                >
                  <span className="shrink-0" style={EMOJI_FONT} aria-hidden>
                    {t(`common.theme.${theme}.emoji`)}
                  </span>
                  <span className="min-w-0 truncate">{t(`common.theme.${theme}.name`)}</span>
                  <span className="shrink-0 whitespace-nowrap">· {photosText(photos)}</span>
                  {blur && (
                    <span className="shrink-0 whitespace-nowrap">
                      · <span aria-hidden>🌫️ </span>
                      {t('home.mode.blurTag')}
                    </span>
                  )}
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
                    className="inline-block"
                    animate={{ y: [0, -5, 0] }}
                    transition={{ duration: 1.1, repeat: Infinity, ease: 'easeInOut' }}
                    aria-hidden
                  >
                    👆
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
              icon={<span aria-hidden>🚀</span>}
            >
              {t('home.mode.confirm')}
            </Button>
          </div>
        </motion.div>
      </BottomBar>
    </motion.div>
  );
}
