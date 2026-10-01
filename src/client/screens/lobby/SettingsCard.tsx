import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import {
  PHOTOS_PER_PLAYER_OPTIONS,
  THEME_DEFAULT_BLUR,
  THEME_DEFAULT_PHOTOS,
  THEMES,
  VOTE_SECONDS_OPTIONS,
  type Settings,
  type Theme,
} from '../../../shared/protocol';
import { Icon, type IconName } from '../../components/Icon';
import { MarkerCheck, MarkerCircle } from '../../components/Marker';
import { NotebookCard } from '../../components/Paper';
import { ThemeArt } from '../../components/ThemeArt';
import { toast } from '../../components/Toast';
import { useT } from '../../i18n';
import { errorText } from '../../lib/errors';
import { sfx } from '../../lib/sfx';
import { api } from '../../lib/store';
import { cn } from '../../lib/util';
import { CardTitle } from './CardTitle';
import { THEME_PICKER_ID } from './look';

/** How long an acknowledged change may wait for the room state before we drop the local value. */
const CONFIRM_TIMEOUT_MS = 3000;

type Draft = Partial<Settings>;
type Key = keyof Settings;

/** Counts changes of `value` after mount (0 = never changed), to replay a highlight. `null` = not tracked. */
function useChangeCount(value: number | boolean | string | null): number {
  const prev = useRef(value);
  const [count, setCount] = useState(0);
  useEffect(() => {
    const before = prev.current;
    prev.current = value;
    if (before !== null && value !== null && before !== value) setCount((c) => c + 1);
  }, [value]);
  return count;
}

/**
 * Theme, photos per player, seconds per photo, blurry photos and anonymous votes, on a
 * notebook page. The host edits them
 * (applied locally right away, reconciled with the next room state); everyone else sees
 * them read-only, with a flash when the host changes something.
 */
export function SettingsCard({ settings, isHost, hostName }: { settings: Settings; isHost: boolean; hostName: string }) {
  const t = useT();
  const [draft, setDraft] = useState<Draft>({});
  const seq = useRef<Record<Key, number>>({ voteSeconds: 0, anonymousVotes: 0, theme: 0, photosPerPlayer: 0, blur: 0 });
  const timers = useRef<number[]>([]);
  const effective: Settings = { ...settings, ...draft };

  // The room state caught up: forget the local values it agrees with.
  useEffect(() => {
    setDraft((d) => {
      const keys = Object.keys(d) as Key[];
      const stale = keys.filter((k) => d[k] === settings[k]);
      if (!stale.length) return d;
      const next = { ...d };
      stale.forEach((k) => delete next[k]);
      return next;
    });
  }, [settings]);

  useEffect(() => {
    const list = timers.current;
    return () => list.forEach((id) => window.clearTimeout(id));
  }, []);

  const drop = (keys: Key[]) =>
    setDraft((d) => {
      const present = keys.filter((k) => k in d);
      if (!present.length) return d;
      const next = { ...d };
      present.forEach((k) => delete next[k]);
      return next;
    });

  /**
   * Applies `local` right away and sends `send` (defaults to `local`). `local` can hold more
   * than what is sent, for side effects the server applies itself (a theme switch resets
   * photosPerPlayer).
   */
  const change = async (local: Draft, send: Draft = local) => {
    const keys = (Object.keys(local) as Key[]).filter((k) => effective[k] !== local[k]);
    if (!isHost || !keys.length) return;
    const stamp = {} as Record<Key, number>;
    keys.forEach((k) => (stamp[k] = ++seq.current[k]));
    setDraft((d) => ({ ...d, ...local }));
    sfx.play('pop');
    const res = await api.updateSettings(send);
    const owned = () => keys.filter((k) => seq.current[k] === stamp[k]); // a newer change owns the others
    if (!res.ok) {
      const mine = owned();
      drop(mine);
      if (mine.length) toast(errorText(t, res.error), 'error');
      return;
    }
    timers.current.push(window.setTimeout(() => drop(owned()), CONFIRM_TIMEOUT_MS));
  };

  const pickTheme = (theme: Theme) => {
    if (theme === effective.theme) return;
    // The server resets photos per player and the blur option to the new theme's defaults.
    void change({ theme, photosPerPlayer: THEME_DEFAULT_PHOTOS[theme], blur: THEME_DEFAULT_BLUR[theme] }, { theme });
  };

  const themeFlash = useChangeCount(isHost ? null : settings.theme);
  const photosFlash = useChangeCount(isHost ? null : settings.photosPerPlayer);
  const timerFlash = useChangeCount(isHost ? null : settings.voteSeconds);
  const anonFlash = useChangeCount(isHost ? null : settings.anonymousVotes);
  const blurFlash = useChangeCount(isHost ? null : settings.blur);
  const theme = effective.theme;
  const perPlayer = effective.photosPerPlayer;
  const secs = effective.voteSeconds;
  const anon = effective.anonymousVotes;
  const blur = effective.blur;
  const secondsLabel = (v: number) => (v === 0 ? t('lobby.settings.noTimer') : t('lobby.settings.seconds', { n: v }));
  const infinity = <span className="font-heavy text-[1.9rem] leading-none">∞</span>;

  return (
    <NotebookCard tilt={-0.4} tape seed="settings" className="@container pt-4 pr-4 pb-6 sm:pr-5 sm:pb-7">
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <CardTitle>{t('lobby.settings.title')}</CardTitle>
        <span className={cn('text-pen flex items-center gap-1.5 text-[1.15rem]', !isHost && 'text-ink-soft')}>
          <Icon name={isHost ? 'crown' : 'lock'} fill={isHost ? 'var(--color-yellow)' : undefined} className="size-4.5 shrink-0 text-ink" />
          {isHost ? t('lobby.settings.youPick') : t('lobby.settings.hostPicks', { name: hostName })}
        </span>
      </div>

      {/* Theme */}
      <Row flash={themeFlash}>
        <div id={THEME_PICKER_ID} className="scroll-mt-28">
          <Label icon="film">{t('lobby.settings.theme')}</Label>
          {isHost ? (
            <>
              <div role="radiogroup" aria-label={t('lobby.settings.theme')} className="mt-3 grid grid-cols-3 gap-x-2 gap-y-2.5 @md:gap-x-3">
                {THEMES.map((th, i) => (
                  <ThemeTile key={th} theme={th} index={i} selected={th === theme} onPick={() => pickTheme(th)} />
                ))}
              </div>
              <Help id={theme} className="mt-3">
                {t(`common.theme.${theme}.desc`)}
              </Help>
            </>
          ) : (
            <ThemeSticker theme={theme} />
          )}
        </div>
      </Row>

      {/* Photos per player */}
      <Row flash={photosFlash} className="mt-6">
        {/* The dial drops under the label on very narrow phones. */}
        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
          <Label icon="images">{t('lobby.settings.photos')}</Label>
          {isHost ? (
            <Dial
              label={t('lobby.settings.photos')}
              options={PHOTOS_PER_PLAYER_OPTIONS}
              value={perPlayer}
              className="shrink-0"
              onPick={(n) => void change({ photosPerPlayer: n })}
            />
          ) : (
            <Value key={perPlayer}>{perPlayer}</Value>
          )}
        </div>
        <Help id={`p${perPlayer}`}>
          {perPlayer === 1 ? t('lobby.settings.photosHelpOne') : t('lobby.settings.photosHelpMany', { n: perPlayer })}
        </Help>
      </Row>

      {/* Time per photo */}
      <Row flash={timerFlash} className="mt-6">
        <div className="flex items-center justify-between gap-3">
          <Label icon="clock">{t('lobby.settings.timer')}</Label>
          {isHost ? (
            <span className="label-type" aria-hidden>
              {t('lobby.settings.secUnit')}
            </span>
          ) : secs === 0 ? (
            <Value key={0} srLabel={t('lobby.settings.noTimer')}>
              {infinity}
            </Value>
          ) : (
            <Value key={secs} unit={t('lobby.settings.secUnit')}>
              {secs}
            </Value>
          )}
        </div>
        {isHost && (
          <Dial
            label={t('lobby.settings.timer')}
            options={VOTE_SECONDS_OPTIONS}
            value={secs}
            className="mt-1.5 w-full justify-between"
            ariaFor={secondsLabel}
            render={(v) => (v === 0 ? infinity : undefined)}
            onPick={(v) => void change({ voteSeconds: v })}
          />
        )}
        <Help id={`t${secs === 0 ? 0 : 1}`}>{secs === 0 ? t('lobby.settings.noTimerHelp') : t('lobby.settings.timerHelp', { n: secs })}</Help>
      </Row>

      {/* Blurry photos + speed bonus */}
      <Row flash={blurFlash} className="mt-6">
        <div className="flex items-center justify-between gap-3">
          <Label icon={blur ? 'eye-off' : 'eye'}>{t('lobby.settings.blur')}</Label>
          {isHost ? (
            <Switch
              on={blur}
              label={t('lobby.settings.blur')}
              onLabel={t('lobby.settings.on')}
              offLabel={t('lobby.settings.off')}
              onToggle={() => void change({ blur: !blur })}
            />
          ) : (
            <Value key={String(blur)} word dim={!blur}>
              {blur ? t('lobby.settings.on') : t('lobby.settings.off')}
            </Value>
          )}
        </div>
        <Help id={blur ? 'blur-on' : 'blur-off'}>{blur ? t('lobby.settings.blurOnHelp') : t('lobby.settings.blurOffHelp')}</Help>
      </Row>

      {/* Anonymous votes */}
      <Row flash={anonFlash} className="mt-6">
        <div className="flex items-center justify-between gap-3">
          <Label icon={anon ? 'mask' : 'eye'}>{t('lobby.settings.anonymous')}</Label>
          {isHost ? (
            <Switch
              on={anon}
              label={t('lobby.settings.anonymous')}
              onLabel={t('lobby.settings.on')}
              offLabel={t('lobby.settings.off')}
              onToggle={() => void change({ anonymousVotes: !anon })}
            />
          ) : (
            <Value key={String(anon)} word dim={!anon}>
              {anon ? t('lobby.settings.on') : t('lobby.settings.off')}
            </Value>
          )}
        </div>
        <Help id={anon ? 'on' : 'off'}>{anon ? t('lobby.settings.anonymousOnHelp') : t('lobby.settings.anonymousOffHelp')}</Help>
      </Row>
    </NotebookCard>
  );
}

/** A setting's name with its icon. */
function Label({ icon, children }: { icon: IconName; children: ReactNode }) {
  return (
    <span className="flex min-w-0 items-center gap-2 font-display text-[1.02rem] leading-tight">
      <Icon name={icon} className="size-5 shrink-0" />
      <span className="min-w-0">{children}</span>
    </span>
  );
}

/**
 * A row of big bold numbers on the notebook page; the chosen one circled in red marker (the
 * loop draws itself when the host picks another).
 */
function Dial<T extends number>({
  label,
  options,
  value,
  className,
  ariaFor,
  render,
  onPick,
}: {
  label: string;
  options: readonly T[];
  value: T;
  className?: string;
  /** Accessible name of an option (default: the number). */
  ariaFor?: (v: T) => string;
  /** Custom face for an option; undefined = the number. */
  render?: (v: T) => ReactNode;
  onPick: (v: T) => void;
}) {
  return (
    <div role="radiogroup" aria-label={label} className={cn('flex items-center gap-1', className)}>
      {options.map((v) => {
        const selected = v === value;
        return (
          <motion.button
            key={v}
            type="button"
            role="radio"
            aria-checked={selected}
            aria-label={ariaFor?.(v)}
            onClick={() => onPick(v)}
            whileTap={{ scale: 0.88 }}
            className={cn(
              'relative flex h-11 min-w-11 items-center justify-center px-1 transition-colors',
              selected ? 'text-ink' : 'text-ink-faint hover:text-ink',
            )}
          >
            <MarkerCircle show={selected} pad={5} strokeWidth={3.2} seed={`dial-${v}`}>
              <span className="block px-1 font-num text-[1.7rem]">{render?.(v) ?? v}</span>
            </MarkerCircle>
          </motion.button>
        );
      })}
    </div>
  );
}

/** Read-only value (guests): big and bold on a stroke of highlighter. */
function Value({
  children,
  unit,
  word = false,
  dim = false,
  srLabel,
}: {
  children: ReactNode;
  unit?: string;
  /** A short word (ON / OFF) rather than a number. */
  word?: boolean;
  /** An "off" value: no highlighter. */
  dim?: boolean;
  /** Spoken instead of the face (e.g. "No timer" for ∞). */
  srLabel?: string;
}) {
  return (
    <motion.span
      initial={{ scale: 1.4, rotate: -6 }}
      animate={{ scale: 1, rotate: -2 }}
      transition={{ type: 'spring', stiffness: 500, damping: 14 }}
      className={cn('flex h-10 shrink-0 items-baseline gap-1 px-2 pt-1', !dim && 'bg-yellow/80 [clip-path:polygon(2%_10%,98%_0,100%_88%,0_100%)]')}
    >
      <span aria-hidden={srLabel ? true : undefined} className={cn(word ? 'font-wide text-base uppercase' : 'font-num text-[1.8rem]', dim && 'text-ink-faint')}>
        {children}
      </span>
      {srLabel && <span className="sr-only">{srLabel}</span>}
      {unit && <span className="label-type">{unit}</span>}
    </motion.span>
  );
}

/** One tappable theme in the host's picker: a little print of the theme's collage; the chosen one on yellow, ticked. */
function ThemeTile({ theme, index, selected, onPick }: { theme: Theme; index: number; selected: boolean; onPick: () => void }) {
  const t = useT();
  const tilt = selected ? -2 : index % 2 ? 1.2 : -1.2;
  return (
    <motion.button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onPick}
      whileHover={selected ? undefined : { y: -2, rotate: 0 }}
      whileTap={{ scale: 0.92 }}
      animate={selected ? { rotate: [tilt, -5, 1, tilt], scale: [1, 1.06, 1] } : { rotate: tilt, scale: 1 }}
      transition={{ type: 'spring', stiffness: 500, damping: 18 }}
      className={cn(
        'relative flex min-h-[6.5rem] min-w-0 flex-col items-center justify-start gap-1 px-1 pt-2 pb-2 text-center text-ink shadow-paper-sm transition-colors',
        selected ? 'paper-postit z-10' : 'paper-sheet hover:bg-paper',
      )}
    >
      {selected && <MarkerCheck className="absolute -top-2.5 -right-1.5 size-7" />}
      <span className={cn('flex', !selected && 'opacity-90 saturate-[0.7]')}>
        <ThemeArt theme={theme} className="size-13" />
      </span>
      <span className="font-display text-[0.8rem] leading-[1.05] [overflow-wrap:anywhere] @md:text-[0.88rem]">{t(`common.theme.${theme}.name`)}</span>
    </motion.button>
  );
}

/** Read-only current theme for everyone but the host: the collage + name + description. */
function ThemeSticker({ theme }: { theme: Theme }) {
  const t = useT();
  const first = useRef(true);
  useEffect(() => {
    first.current = false;
  }, []);
  return (
    <motion.div
      key={theme}
      initial={first.current ? false : { scale: 0.8, rotate: -6 }}
      animate={{ scale: 1, rotate: -1 }}
      transition={{ type: 'spring', stiffness: 520, damping: 16 }}
      className="paper-sheet mt-3 flex items-center gap-3 p-3 shadow-paper-sm"
      aria-live="polite"
    >
      <span className="shrink-0" aria-hidden>
        <ThemeArt theme={theme} className="size-16" />
      </span>
      <span className="min-w-0">
        <span className="block font-heavy text-lg leading-tight">{t(`common.theme.${theme}.name`)}</span>
        <span className="mt-0.5 block text-sm leading-snug text-ink-soft">{t(`common.theme.${theme}.desc`)}</span>
      </span>
    </motion.div>
  );
}

function Row({ children, flash, className }: { children: ReactNode; flash: number; className?: string }) {
  return (
    <div className={cn('relative', className)}>
      {flash > 0 && (
        <motion.span
          key={flash}
          className="pointer-events-none absolute -inset-2 bg-yellow"
          initial={{ opacity: 0.85, scale: 0.96 }}
          animate={{ opacity: 0, scale: 1.02 }}
          transition={{ duration: 1.1, ease: 'easeOut' }}
          aria-hidden
        />
      )}
      <div className="relative">{children}</div>
    </div>
  );
}

function Help({ id, children, className }: { id: string; children: ReactNode; className?: string }) {
  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.p
        key={id}
        className={cn('text-pen mt-1.5 text-[1.12rem] leading-[1.1]', className)}
        initial={{ opacity: 0, y: -4 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 4 }}
        transition={{ duration: 0.15 }}
        aria-live="polite"
      >
        {children}
      </motion.p>
    </AnimatePresence>
  );
}

/** On / off: an ink pill with the word in yellow type when on, a dashed pencil slot when off. */
function Switch({
  on,
  label,
  onLabel,
  offLabel,
  onToggle,
}: {
  on: boolean;
  label: string;
  onLabel: string;
  offLabel: string;
  onToggle: () => void;
}) {
  return (
    <motion.button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      onClick={onToggle}
      whileTap={{ scale: 0.92 }}
      className={cn(
        'relative flex h-11 w-24 shrink-0 items-center rounded-full p-1 transition-colors',
        on ? 'justify-end bg-ink shadow-paper-sm' : 'justify-start border-2 border-dashed border-ink/50 bg-sheet',
      )}
    >
      <span className={cn('absolute font-type text-[0.8rem] tracking-[0.1em] uppercase', on ? 'left-3.5 text-yellow' : 'right-3 text-ink-soft')}>
        {on ? onLabel : offLabel}
      </span>
      <motion.span
        layout
        transition={{ type: 'spring', stiffness: 600, damping: 30 }}
        className={cn('relative size-8 rounded-full', on ? 'bg-yellow' : 'bg-ink/80')}
      />
    </motion.button>
  );
}
