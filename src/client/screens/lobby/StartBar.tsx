import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useRef, useState } from 'react';
import { MIN_PHOTO_OWNERS, type PublicPlayer, type RoomView } from '../../../shared/protocol';
import { Avatar } from '../../components/Avatar';
import { Button } from '../../components/Button';
import { BottomBar } from '../../components/Layout';
import { ConfirmDialog } from '../../components/Modal';
import { toast } from '../../components/Toast';
import { useI18n } from '../../i18n';
import { errorText } from '../../lib/errors';
import { sfx } from '../../lib/sfx';
import { api } from '../../lib/store';
import { cn, vibrate } from '../../lib/util';

function listNames(names: string[], lang: string): string {
  try {
    return new Intl.ListFormat(lang, { style: 'long', type: 'conjunction' }).format(names);
  } catch {
    return names.join(', ');
  }
}

/** Host: the big start button (with readiness helper). Everyone else: a "waiting for the host" pill. */
export function StartBar({ view }: { view: RoomView }) {
  const isHost = view.hostId === view.meId;
  const host = view.players.find((p) => p.id === view.hostId) ?? null;
  return <BottomBar className="flex-col gap-2">{isHost ? <HostStart view={view} /> : <WaitingPill host={host} />}</BottomBar>;
}

function HostStart({ view }: { view: RoomView }) {
  const { t, lang } = useI18n();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [starting, setStarting] = useState(false);
  const startingRef = useRef(false);
  const readyCount = view.players.filter((p) => p.ready).length;
  const missing = Math.max(0, MIN_PHOTO_OWNERS - readyCount);
  const canStart = missing === 0;
  const notReady = view.players.filter((p) => !p.ready);

  // Celebrate the moment the room becomes startable (not when the screen opens that way).
  const wasStartable = useRef(canStart);
  const [cheer, setCheer] = useState(0);
  useEffect(() => {
    if (canStart && !wasStartable.current) {
      sfx.play('success');
      vibrate([15, 50, 15]);
      setCheer((c) => c + 1);
    }
    wasStartable.current = canStart;
  }, [canStart]);

  // Someone removed their photos while the confirmation was open.
  useEffect(() => {
    if (!canStart) setConfirmOpen(false);
  }, [canStart]);

  // Safety net: if the phase never switches after a successful start, unlock the button.
  useEffect(() => {
    if (!starting) return;
    const id = window.setTimeout(() => {
      startingRef.current = false;
      setStarting(false);
    }, 6000);
    return () => window.clearTimeout(id);
  }, [starting]);

  const start = async () => {
    if (startingRef.current) return;
    startingRef.current = true;
    setStarting(true);
    setConfirmOpen(false);
    const res = await api.start();
    if (!res.ok) {
      startingRef.current = false;
      setStarting(false);
      sfx.play('fail');
      toast(errorText(t, res.error), 'error');
    }
    // On success the room switches to the voting phase and this screen goes away.
  };

  const onStartClick = () => {
    if (!canStart || startingRef.current) return;
    if (notReady.length > 0) setConfirmOpen(true);
    else void start();
  };

  let helper: string;
  if (missing === 1) helper = t('lobby.start.needMoreOne');
  else if (missing > 1) helper = t('lobby.start.needMoreMany', { n: missing });
  else if (notReady.length > 0) helper = t('lobby.start.someReady', { ready: readyCount, total: view.players.length });
  else helper = t('lobby.start.allReady');

  const names = listNames(
    notReady.map((p) => p.name),
    lang,
  );

  return (
    <>
      {/* Keeps clear of the floating reaction button (bottom-right) on narrow screens. */}
      <div className="flex w-full justify-center pr-[72px] md:pr-0">
        <div className="flex max-w-full items-center gap-2 rounded-2xl border-2 border-white/15 bg-grape-950/75 py-1 pr-3 pl-1.5 backdrop-blur">
          <span className="flex gap-1" aria-hidden>
            {Array.from({ length: MIN_PHOTO_OWNERS }, (_, i) => {
              const filled = i < readyCount;
              return (
                <motion.span
                  key={i}
                  className={cn(
                    'flex size-6 shrink-0 items-center justify-center rounded-full border-2 text-xs',
                    filled ? 'border-ink bg-mint' : 'border-white/30 border-dashed bg-white/5',
                  )}
                  animate={filled ? { scale: [1.4, 1] } : { scale: 1 }}
                  transition={{ type: 'spring', stiffness: 500, damping: 12 }}
                >
                  {filled ? '📸' : ''}
                </motion.span>
              );
            })}
          </span>
          <AnimatePresence mode="wait" initial={false}>
            <motion.span
              key={helper}
              className={cn('min-w-0 text-xs leading-tight font-extrabold sm:text-sm', canStart ? 'text-mint' : 'text-grape-200')}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.18 }}
            >
              {helper}
            </motion.span>
          </AnimatePresence>
        </div>
      </div>

      <motion.div
        key={cheer}
        className="w-full"
        animate={cheer ? { scale: [1, 1.08, 0.97, 1], rotate: [0, -2, 2, 0] } : undefined}
        transition={{ duration: 0.6 }}
      >
        <Button
          size="xl"
          block
          variant="primary"
          loading={starting}
          disabled={!canStart}
          onClick={onStartClick}
          icon={starting ? undefined : <span aria-hidden>🚀</span>}
          className={cn(canStart && !starting && 'shadow-[0_8px_0_0_var(--color-ink),0_0_30px_6px_rgb(255_79_163/0.45)]')}
        >
          {t('lobby.start.button')}
        </Button>
      </motion.div>

      <ConfirmDialog
        open={confirmOpen}
        title={t('lobby.start.confirmTitle')}
        body={
          <span className="flex items-start gap-3">
            <span className="flex shrink-0 -space-x-2" aria-hidden>
              {notReady.slice(0, 3).map((p) => (
                <Avatar key={p.id} player={p} size="sm" crown={false} />
              ))}
            </span>
            <span>{t(notReady.length === 1 ? 'lobby.start.confirmBodyOne' : 'lobby.start.confirmBodyMany', { names })}</span>
          </span>
        }
        confirmLabel={t('lobby.start.confirmButton')}
        onCancel={() => setConfirmOpen(false)}
        onConfirm={() => void start()}
      />
    </>
  );
}

function WaitingPill({ host }: { host: PublicPlayer | null }) {
  const { t } = useI18n();
  return (
    <div className="flex w-full justify-center">
      <div className="flex h-14 max-w-full animate-pulse-soft items-center gap-2.5 rounded-full border-3 border-ink bg-cream py-1 pr-5 pl-1.5 text-ink shadow-pop">
        {host && <Avatar player={host} size="sm" crown={false} />}
        <span className="min-w-0 truncate font-display text-base sm:text-lg">
          {t('lobby.start.waiting', { name: host?.name ?? t('common.host') })}
        </span>
        <span className="flex shrink-0 gap-0.5" aria-hidden>
          {[0, 1, 2].map((i) => (
            <motion.span
              key={i}
              className="size-1.5 rounded-full bg-ink"
              animate={{ y: [0, -5, 0] }}
              transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.15 }}
            />
          ))}
        </span>
      </div>
    </div>
  );
}
