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
import { Icon, type IconName } from '../../components/Icon';
import { ThemeArt } from '../../components/ThemeArt';
import { toast } from '../../components/Toast';
import { Viewfinder } from '../../components/Viewfinder';
import { useT } from '../../i18n';
import { errorText } from '../../lib/errors';
import { sfx } from '../../lib/sfx';
import { api } from '../../lib/store';
import { cn } from '../../lib/util';
import { CardTitle } from './CardTitle';
import { THEME_PICKER_ID, themeBg } from './look';

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
  const secondsLabel = (v: number) => (v === 0 ? t('lobby.settings.noTimer') : t('lobby.settings.seconds', { n: v }));

  return (
    <Card tone="white" className="@container p-4 sm:p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
        <CardTitle icon="settings" tone="sun">
          {t('lobby.settings.title')}
        </CardTitle>
        <span className={cn('flex items-center gap-1.5 text-sm font-extrabold', isHost ? 'text-ink' : 'text-ink-soft')}>
          <Icon name={isHost ? 'crown' : 'lock'} fill={isHost ? 'var(--color-sun)' : undefined} className="size-4.5 shrink-0" />
          {isHost ? t('lobby.settings.youPick') : t('lobby.settings.hostPicks', { name: hostName })}
        </span>
      </div>

      {/* Theme */}
      <Row flash={themeFlash}>
        <div id={THEME_PICKER_ID} className="scroll-mt-28">
          <Label icon="film">{t('lobby.settings.theme')}</Label>
          {isHost ? (
            <>
              <div role="radiogroup" aria-label={t('lobby.settings.theme')} className="mt-2.5 grid grid-cols-2 gap-2.5 @sm:grid-cols-6">
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
              {/* A bit more air: the tiles above have shadows and wiggle when picked. */}
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
      <Row flash={photosFlash} className="mt-5">
        {/* The dial drops under the label on very narrow phones. */}
        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
          <Label icon="images">{t('lobby.settings.photos')}</Label>
          {isHost ? (
            <Dial
              label={t('lobby.settings.photos')}
              options={PHOTOS_PER_PLAYER_OPTIONS}
              value={perPlayer}
              layoutId="lobby-photos-pick"
              className="w-32 shrink-0"
              onPick={(n) => void change({ photosPerPlayer: n })}
            />
          ) : (
            <Lcd key={perPlayer}>{perPlayer}</Lcd>
          )}
        </div>
        <Help id={`p${perPlayer}`}>
          {perPlayer === 1 ? t('lobby.settings.photosHelpOne') : t('lobby.settings.photosHelpMany', { n: perPlayer })}
        </Help>
      </Row>

      {/* Time per photo */}
      <Row flash={timerFlash} className="mt-5">
        <div className="flex items-center justify-between gap-3">
          <Label icon="clock">{t('lobby.settings.timer')}</Label>
          {isHost ? (
            <span className="label-mono text-ink-soft" aria-hidden>
              {t('lobby.settings.secUnit')}
            </span>
          ) : secs === 0 ? (
            <Lcd key={0} face="custom" srLabel={t('lobby.settings.noTimer')}>
              <span className="font-display text-[1.75rem] leading-none">∞</span>
            </Lcd>
          ) : (
            <Lcd key={secs} unit={t('lobby.settings.secUnit')}>
              {secs}
            </Lcd>
          )}
        </div>
        {isHost && (
          <Dial
            label={t('lobby.settings.timer')}
            options={VOTE_SECONDS_OPTIONS}
            value={secs}
            layoutId="lobby-timer-pick"
            className="mt-2"
            ariaFor={secondsLabel}
            render={(v) => (v === 0 ? <span className="font-display text-[1.75rem] leading-none">∞</span> : undefined)}
            onPick={(v) => void change({ voteSeconds: v })}
          />
        )}
        <Help id={`t${secs === 0 ? 0 : 1}`}>
          {secs === 0 ? t('lobby.settings.noTimerHelp') : t('lobby.settings.timerHelp', { n: secs })}
        </Help>
      </Row>

      {/* Anonymous votes */}
      <Row flash={anonFlash} className="mt-5">
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
            <Lcd key={String(anon)} face="mono" dim={!anon}>
              {anon ? t('lobby.settings.on') : t('lobby.settings.off')}
            </Lcd>
          )}
        </div>
        <Help id={anon ? 'on' : 'off'}>{anon ? t('lobby.settings.anonymousOnHelp') : t('lobby.settings.anonymousOffHelp')}</Help>
      </Row>
    </Card>
  );
}

/** A setting's name with its icon. */
function Label({ icon, children }: { icon: IconName; children: ReactNode }) {
  return (
    <span className="flex min-w-0 items-center gap-2 font-extrabold">
      <Icon name={icon} className="size-5 shrink-0" />
      <span className="min-w-0">{children}</span>
    </span>
  );
}

/**
 * A camera-LCD selector: ink strip, the options as unlit digits, the chosen one lit in the
 * orange date-stamp color and framed by little viewfinder brackets that slide over.
 */
function Dial<T extends number>({
  label,
  options,
  value,
  layoutId,
  className,
  ariaFor,
  render,
  onPick,
}: {
  label: string;
  options: readonly T[];
  value: T;
  layoutId: string;
  className?: string;
  /** Accessible name of an option (default: the number). */
  ariaFor?: (v: T) => string;
  /** Custom face for an option; undefined = the number in DSEG7. */
  render?: (v: T) => ReactNode;
  onPick: (v: T) => void;
}) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className={cn('grid gap-0.5 rounded-2xl border-3 border-ink bg-ink p-1 shadow-pop-sm', className)}
      style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}
    >
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
              'relative flex h-11 min-w-0 items-center justify-center rounded-xl transition-colors',
              selected ? 'text-stamp' : 'text-cream/40 hover:bg-white/5 hover:text-cream/75',
            )}
          >
            {selected && (
              <motion.span
                layoutId={layoutId}
                className="absolute inset-0 rounded-xl bg-white/8"
                transition={{ type: 'spring', stiffness: 500, damping: 34 }}
              >
                <Viewfinder className="absolute inset-0" color="var(--color-cream)" gap={-3} length={8} thickness={2} radius={2} />
              </motion.span>
            )}
            <span className="relative">{render?.(v) ?? <span className="font-stamp7 text-xl tracking-[0.06em]">{v}</span>}</span>
          </motion.button>
        );
      })}
    </div>
  );
}

/** Read-only value on a little camera LCD (guests), lit like the host's dials and switch. */
function Lcd({
  children,
  unit,
  face = 'seg7',
  dim = false,
  srLabel,
}: {
  children: ReactNode;
  unit?: string;
  /** seg7: digits; mono: a short word (ON / OFF); custom: the children style themselves. */
  face?: 'seg7' | 'mono' | 'custom';
  /** Unlit (an "off" value). */
  dim?: boolean;
  /** Spoken instead of the face (e.g. "No timer" for ∞). */
  srLabel?: string;
}) {
  return (
    <motion.span
      initial={{ scale: 1.4, rotate: -6 }}
      animate={{ scale: 1, rotate: 0 }}
      transition={{ type: 'spring', stiffness: 500, damping: 14 }}
      className="flex h-10 shrink-0 items-center gap-1.5 rounded-xl border-2 border-ink bg-ink px-3 shadow-pop-sm"
    >
      <span
        aria-hidden={srLabel ? true : undefined}
        className={cn(
          dim ? 'text-cream/50' : 'text-stamp',
          face === 'seg7' && 'font-stamp7 text-xl tracking-[0.06em]',
          face === 'mono' && 'font-mono text-sm font-bold tracking-[0.14em] uppercase',
        )}
      >
        {children}
      </span>
      {srLabel && <span className="sr-only">{srLabel}</span>}
      {unit && <span className="label-mono text-cream/60">{unit}</span>}
    </motion.span>
  );
}

/** One tappable theme card in the host's picker. */
function ThemeTile({ theme, selected, className, onPick }: { theme: Theme; selected: boolean; className?: string; onPick: () => void }) {
  const t = useT();
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
        'relative flex min-h-[6.25rem] min-w-0 flex-col items-center justify-center gap-1.5 rounded-2xl border-ink px-2 pt-2 pb-2.5 text-center text-ink transition-colors',
        selected ? cn('border-3 shadow-pop-sm', themeBg(theme)) : 'border-2 border-dashed border-ink/25 bg-cream hover:border-ink/50 hover:bg-white',
        className,
      )}
    >
      {selected && (
        // Inside the tile: outside, they would run into the neighbours and the help line.
        <Viewfinder className="pointer-events-none absolute inset-0" color="var(--color-ink)" gap={-7} length={13} thickness={3} snap />
      )}
      <motion.span
        className={cn('flex', !selected && 'opacity-85 saturate-[0.6]')}
        animate={selected ? { scale: [1, 1.18, 1] } : { scale: 1 }}
        transition={{ duration: 0.4 }}
      >
        <ThemeArt theme={theme} className="size-14" />
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
  return (
    <motion.div
      key={theme}
      initial={first.current ? false : { scale: 0.8, rotate: -6 }}
      animate={{ scale: 1, rotate: -1 }}
      transition={{ type: 'spring', stiffness: 520, damping: 16 }}
      className={cn('mt-2.5 flex items-center gap-3 rounded-2xl border-3 border-ink p-3 text-ink shadow-pop-sm', themeBg(theme))}
      aria-live="polite"
    >
      <span className="flex size-16 shrink-0 items-center justify-center rounded-xl border-2 border-ink bg-cream" aria-hidden>
        <ThemeArt theme={theme} className="size-13" />
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

function Help({ id, children, className }: { id: string; children: ReactNode; className?: string }) {
  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.p
        key={id}
        className={cn('mt-1.5 text-sm leading-snug text-ink-soft', className)}
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

/** On / off as a camera toggle: lit like the LCD dials when on, a plain cream slot when off. */
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
        on ? 'justify-end bg-ink' : 'justify-start bg-cream',
      )}
    >
      <span
        className={cn(
          'absolute font-mono text-xs font-bold tracking-[0.12em] uppercase',
          on ? 'text-stamp left-3.5' : 'right-3 text-ink-soft',
        )}
      >
        {on ? onLabel : offLabel}
      </span>
      <motion.span
        layout
        transition={{ type: 'spring', stiffness: 600, damping: 30 }}
        className={cn('relative size-8 rounded-full border-2', on ? 'border-cream/80 bg-cream' : 'border-ink bg-white shadow-pop-sm')}
      />
    </motion.button>
  );
}
