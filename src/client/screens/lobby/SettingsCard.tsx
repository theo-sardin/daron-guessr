import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import {
  PHOTOS_PER_PLAYER_OPTIONS,
  THEME_DEFAULT_PHOTOS,
  THEMES,
  VOTE_SECONDS_OPTIONS,
  type Settings,
  type Theme,
} from '../../../shared/protocol';
import { Card } from '../../components/Card';
import { toast } from '../../components/Toast';
import { useT } from '../../i18n';
import { errorText } from '../../lib/errors';
import { sfx } from '../../lib/sfx';
import { api } from '../../lib/store';
import { cn } from '../../lib/util';
import { glyphCount, THEME_BG, THEME_PICKER_ID } from './look';

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
 * Theme, photos per player, seconds per photo and anonymous votes. The host edits them
 * (applied locally right away, reconciled with the next room state); everyone else sees
 * them read-only, with a flash when the host changes something.
 */
export function SettingsCard({ settings, isHost, hostName }: { settings: Settings; isHost: boolean; hostName: string }) {
  const t = useT();
  const [draft, setDraft] = useState<Draft>({});
  const seq = useRef<Record<Key, number>>({ voteSeconds: 0, anonymousVotes: 0, theme: 0, photosPerPlayer: 0 });
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
    void change({ theme, photosPerPlayer: THEME_DEFAULT_PHOTOS[theme] }, { theme });
  };

  const themeFlash = useChangeCount(isHost ? null : settings.theme);
  const photosFlash = useChangeCount(isHost ? null : settings.photosPerPlayer);
  const timerFlash = useChangeCount(isHost ? null : settings.voteSeconds);
  const anonFlash = useChangeCount(isHost ? null : settings.anonymousVotes);
  const theme = effective.theme;
  const perPlayer = effective.photosPerPlayer;
  const secs = effective.voteSeconds;
  const anon = effective.anonymousVotes;
  const secondsLabel = (v: number) => (v === 0 ? '∞' : t('lobby.settings.seconds', { n: v }));

  return (
    <Card tone="white" className="@container p-4 sm:p-5">
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <h2 className="font-display text-2xl leading-none">
          <span aria-hidden>⚙️ </span>
          {t('lobby.settings.title')}
        </h2>
        <span className={cn('text-sm font-extrabold', isHost ? 'text-pink-dark' : 'text-ink-soft')}>
          {isHost ? `👑 ${t('lobby.settings.youPick')}` : `🔒 ${t('lobby.settings.hostPicks', { name: hostName })}`}
        </span>
      </div>

      {/* Theme */}
      <Row flash={themeFlash}>
        <div id={THEME_PICKER_ID} className="scroll-mt-28">
          <span className="font-extrabold">
            <span aria-hidden>🎭 </span>
            {t('lobby.settings.theme')}
          </span>
          {isHost ? (
            <>
              <div role="radiogroup" aria-label={t('lobby.settings.theme')} className="mt-2 grid grid-cols-2 gap-2 @sm:grid-cols-6">
                {THEMES.map((th, i) => (
                  <ThemeTile
                    key={th}
                    theme={th}
                    selected={th === theme}
                    className={cn(i < 3 ? '@sm:col-span-2' : '@sm:col-span-3', i === THEMES.length - 1 && 'col-span-2')}
                    onPick={() => pickTheme(th)}
                  />
                ))}
              </div>
              <Help id={theme}>{t(`common.theme.${theme}.desc`)}</Help>
            </>
          ) : (
            <ThemeSticker theme={theme} />
          )}
        </div>
      </Row>

      {/* Photos per player */}
      <Row flash={photosFlash} className="mt-4">
        <div className="flex items-center justify-between gap-3">
          <span className="font-extrabold">
            <span aria-hidden>🖼️ </span>
            {t('lobby.settings.photos')}
          </span>
          {isHost ? (
            <div
              role="radiogroup"
              aria-label={t('lobby.settings.photos')}
              className="grid w-32 shrink-0 grid-cols-3 gap-1 rounded-2xl border-3 border-ink bg-cream p-1"
            >
              {PHOTOS_PER_PLAYER_OPTIONS.map((n) => {
                const selected = perPlayer === n;
                return (
                  <motion.button
                    key={n}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    onClick={() => void change({ photosPerPlayer: n })}
                    whileTap={{ scale: 0.88 }}
                    className={cn(
                      'relative h-10 min-w-0 rounded-xl font-display text-lg transition-colors',
                      selected ? 'text-ink' : 'text-ink/55 hover:bg-ink/5 hover:text-ink',
                    )}
                  >
                    {selected && (
                      <motion.span
                        layoutId="lobby-photos-pill"
                        className="absolute inset-0 rounded-xl border-2 border-ink bg-mint shadow-pop-sm"
                        transition={{ type: 'spring', stiffness: 500, damping: 32 }}
                      />
                    )}
                    <span className="relative">{n}</span>
                  </motion.button>
                );
              })}
            </div>
          ) : (
            <ValueChip tone="bg-mint">{`📸 ${perPlayer}`}</ValueChip>
          )}
        </div>
        <Help id={`p${perPlayer}`}>
          {perPlayer === 1 ? t('lobby.settings.photosHelpOne') : t('lobby.settings.photosHelpMany', { n: perPlayer })}
        </Help>
      </Row>

      {/* Time per photo */}
      <Row flash={timerFlash} className="mt-4">
        <div className="flex items-center justify-between gap-3">
          <span className="font-extrabold">
            <span aria-hidden>⏱️ </span>
            {t('lobby.settings.timer')}
          </span>
          {!isHost && (
            <ValueChip tone={secs === 0 ? 'bg-lilac' : 'bg-sun'}>
              {secs === 0 ? `∞ ${t('lobby.settings.noTimer')}` : secondsLabel(secs)}
            </ValueChip>
          )}
        </div>
        {isHost && (
          <div
            role="radiogroup"
            aria-label={t('lobby.settings.timer')}
            className="mt-2 grid grid-cols-6 gap-1 rounded-2xl border-3 border-ink bg-cream p-1"
          >
            {VOTE_SECONDS_OPTIONS.map((v) => {
              const selected = secs === v;
              return (
                <motion.button
                  key={v}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  aria-label={v === 0 ? t('lobby.settings.noTimer') : secondsLabel(v)}
                  onClick={() => void change({ voteSeconds: v })}
                  whileTap={{ scale: 0.88 }}
                  className={cn(
                    'relative h-11 min-w-0 rounded-xl font-display text-base transition-colors sm:text-lg',
                    selected ? 'text-ink' : 'text-ink/55 hover:bg-ink/5 hover:text-ink',
                  )}
                >
                  {selected && (
                    <motion.span
                      layoutId="lobby-timer-pill"
                      className={cn('absolute inset-0 rounded-xl border-2 border-ink shadow-pop-sm', v === 0 ? 'bg-lilac' : 'bg-sun')}
                      transition={{ type: 'spring', stiffness: 500, damping: 32 }}
                    />
                  )}
                  <span className={cn('relative', v === 0 && 'text-2xl leading-none')}>{secondsLabel(v)}</span>
                </motion.button>
              );
            })}
          </div>
        )}
        <Help id={`t${secs === 0 ? 0 : 1}`}>
          {secs === 0 ? t('lobby.settings.noTimerHelp') : t('lobby.settings.timerHelp', { n: secs })}
        </Help>
      </Row>

      {/* Anonymous votes */}
      <Row flash={anonFlash} className="mt-4">
        <div className="flex items-center justify-between gap-3">
          <span className="font-extrabold">
            <span aria-hidden>{anon ? '🕵️ ' : '👀 '}</span>
            {t('lobby.settings.anonymous')}
          </span>
          {isHost ? (
            <Switch
              on={anon}
              label={t('lobby.settings.anonymous')}
              onLabel={t('lobby.settings.on')}
              offLabel={t('lobby.settings.off')}
              onToggle={() => void change({ anonymousVotes: !anon })}
            />
          ) : (
            <ValueChip tone={anon ? 'bg-mint' : 'bg-pink text-white'}>{anon ? t('lobby.settings.on') : t('lobby.settings.off')}</ValueChip>
          )}
        </div>
        <Help id={anon ? 'on' : 'off'}>{anon ? t('lobby.settings.anonymousOnHelp') : t('lobby.settings.anonymousOffHelp')}</Help>
      </Row>
    </Card>
  );
}

/** One tappable theme sticker in the host's picker. */
function ThemeTile({ theme, selected, className, onPick }: { theme: Theme; selected: boolean; className?: string; onPick: () => void }) {
  const t = useT();
  const emoji = t(`common.theme.${theme}.emoji`);
  return (
    <motion.button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onPick}
      whileHover={selected ? undefined : { y: -2, rotate: -1 }}
      whileTap={{ scale: 0.92 }}
      animate={selected ? { rotate: [0, -3, 2, -1] } : { rotate: 0 }}
      transition={{ type: 'spring', stiffness: 500, damping: 18 }}
      className={cn(
        'relative flex min-h-[5.25rem] min-w-0 flex-col items-center justify-center gap-1 rounded-2xl border-ink px-2 py-2 text-center text-ink transition-colors',
        selected
          ? cn('border-3 shadow-pop-sm', THEME_BG[theme])
          : 'border-2 border-dashed border-ink/25 bg-cream hover:border-ink/50 hover:bg-white',
        className,
      )}
    >
      {selected && (
        <motion.span
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 600, damping: 14 }}
          className="absolute -top-2 -right-2 flex size-6 items-center justify-center rounded-full border-2 border-ink bg-white text-xs font-black"
          aria-hidden
        >
          ✓
        </motion.span>
      )}
      <motion.span
        className={cn('leading-none', glyphCount(emoji) > 1 ? 'text-2xl' : 'text-3xl', !selected && 'opacity-80 grayscale-[35%]')}
        animate={selected ? { scale: [1, 1.3, 1] } : { scale: 1 }}
        transition={{ duration: 0.4 }}
        aria-hidden
      >
        {emoji}
      </motion.span>
      <span className="font-display text-sm leading-tight">{t(`common.theme.${theme}.name`)}</span>
    </motion.button>
  );
}

/** Read-only current theme for everyone but the host: big, since it says what to upload. */
function ThemeSticker({ theme }: { theme: Theme }) {
  const t = useT();
  const first = useRef(true);
  useEffect(() => {
    first.current = false;
  }, []);
  const emoji = t(`common.theme.${theme}.emoji`);
  return (
    <motion.div
      key={theme}
      initial={first.current ? false : { scale: 0.8, rotate: -6 }}
      animate={{ scale: 1, rotate: -1 }}
      transition={{ type: 'spring', stiffness: 520, damping: 16 }}
      className={cn('mt-2 flex items-center gap-3 rounded-2xl border-3 border-ink p-3 text-ink shadow-pop-sm', THEME_BG[theme])}
      aria-live="polite"
    >
      <span
        className={cn(
          'flex h-14 min-w-14 shrink-0 items-center justify-center rounded-xl border-2 border-ink bg-white px-1 leading-none',
          glyphCount(emoji) > 1 ? 'text-2xl' : 'text-4xl',
        )}
        aria-hidden
      >
        {emoji}
      </span>
      <span className="min-w-0">
        <span className="block font-display text-xl leading-tight">{t(`common.theme.${theme}.name`)}</span>
        <span className="block text-sm leading-snug font-semibold text-ink/80">{t(`common.theme.${theme}.desc`)}</span>
      </span>
    </motion.div>
  );
}

function Row({ children, flash, className }: { children: ReactNode; flash: number; className?: string }) {
  return (
    <div className={cn('relative rounded-2xl', className)}>
      {flash > 0 && (
        <motion.span
          key={flash}
          className="pointer-events-none absolute -inset-2 rounded-2xl bg-sun"
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

function Help({ id, children }: { id: string; children: ReactNode }) {
  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.p
        key={id}
        className="mt-1.5 text-sm leading-snug text-ink-soft"
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

function ValueChip({ children, tone }: { children: ReactNode; tone: string }) {
  return (
    <motion.span
      key={String(children)}
      initial={{ scale: 1.4, rotate: -6 }}
      animate={{ scale: 1, rotate: 0 }}
      transition={{ type: 'spring', stiffness: 500, damping: 14 }}
      className={cn('shrink-0 rounded-full border-2 border-ink px-3 py-1 font-display text-base whitespace-nowrap shadow-pop-sm', tone)}
    >
      {children}
    </motion.span>
  );
}

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
        'relative flex h-11 w-24 shrink-0 items-center rounded-full border-3 border-ink p-1 shadow-pop-sm transition-colors',
        on ? 'justify-end bg-mint' : 'justify-start bg-grape-200',
      )}
    >
      <span className={cn('absolute font-display text-sm text-ink', on ? 'left-3' : 'right-3')}>{on ? onLabel : offLabel}</span>
      <motion.span
        layout
        transition={{ type: 'spring', stiffness: 600, damping: 30 }}
        className="relative size-8 rounded-full border-2 border-ink bg-white shadow-pop-sm"
      />
    </motion.button>
  );
}
