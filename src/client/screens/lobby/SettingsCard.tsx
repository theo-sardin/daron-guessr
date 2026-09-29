import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { VOTE_SECONDS_OPTIONS, type Settings } from '../../../shared/protocol';
import { Card } from '../../components/Card';
import { toast } from '../../components/Toast';
import { useT } from '../../i18n';
import { errorText } from '../../lib/errors';
import { sfx } from '../../lib/sfx';
import { api } from '../../lib/store';
import { cn } from '../../lib/util';

/** How long an acknowledged change may wait for the room state before we drop the local value. */
const CONFIRM_TIMEOUT_MS = 3000;

type Draft = Partial<Settings>;

/** Counts changes of `value` after mount (0 = never changed), to replay a highlight. `null` = not tracked. */
function useChangeCount(value: number | boolean | null): number {
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
 * Seconds per photo and anonymous votes. The host edits them (applied locally right away,
 * reconciled with the next room state); everyone else sees them read-only, with a flash
 * when the host changes something.
 */
export function SettingsCard({ settings, isHost, hostName }: { settings: Settings; isHost: boolean; hostName: string }) {
  const t = useT();
  const [draft, setDraft] = useState<Draft>({});
  const seq = useRef<Record<keyof Settings, number>>({ voteSeconds: 0, anonymousVotes: 0 });
  const timers = useRef<number[]>([]);
  const effective: Settings = { ...settings, ...draft };

  // The room state caught up: forget the local values it agrees with.
  useEffect(() => {
    setDraft((d) => {
      const keys = Object.keys(d) as (keyof Settings)[];
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

  const drop = (key: keyof Settings) =>
    setDraft((d) => {
      if (!(key in d)) return d;
      const next = { ...d };
      delete next[key];
      return next;
    });

  const change = async <K extends keyof Settings>(key: K, value: Settings[K]) => {
    if (!isHost || effective[key] === value) return;
    const n = ++seq.current[key];
    setDraft((d) => ({ ...d, [key]: value }));
    sfx.play('pop');
    const res = await api.updateSettings({ [key]: value } as Partial<Settings>);
    if (seq.current[key] !== n) return; // a newer change owns this key now
    if (!res.ok) {
      drop(key);
      toast(errorText(t, res.error), 'error');
      return;
    }
    timers.current.push(window.setTimeout(() => seq.current[key] === n && drop(key), CONFIRM_TIMEOUT_MS));
  };

  const timerFlash = useChangeCount(isHost ? null : settings.voteSeconds);
  const anonFlash = useChangeCount(isHost ? null : settings.anonymousVotes);
  const secs = effective.voteSeconds;
  const anon = effective.anonymousVotes;
  const secondsLabel = (v: number) => (v === 0 ? '∞' : t('lobby.settings.seconds', { n: v }));

  return (
    <Card tone="white" className="p-4 sm:p-5">
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <h2 className="font-display text-2xl leading-none">
          <span aria-hidden>⚙️ </span>
          {t('lobby.settings.title')}
        </h2>
        <span className={cn('text-sm font-extrabold', isHost ? 'text-pink-dark' : 'text-ink-soft')}>
          {isHost ? `👑 ${t('lobby.settings.youPick')}` : `🔒 ${t('lobby.settings.hostPicks', { name: hostName })}`}
        </span>
      </div>

      {/* Time per photo */}
      <Row flash={timerFlash}>
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
                  onClick={() => void change('voteSeconds', v)}
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
      <Row flash={anonFlash} className="mt-3">
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
              onToggle={() => void change('anonymousVotes', !anon)}
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
