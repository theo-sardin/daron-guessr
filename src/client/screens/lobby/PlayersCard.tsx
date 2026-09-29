import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useRef, useState } from 'react';
import { MAX_PLAYERS, type PublicPlayer, type RoomView } from '../../../shared/protocol';
import { Avatar } from '../../components/Avatar';
import { Card } from '../../components/Card';
import { Icon, type IconName } from '../../components/Icon';
import { IconBadge } from '../../components/IconBadge';
import { ConfirmDialog } from '../../components/Modal';
import { pad, Stamp } from '../../components/Stamp';
import { toast } from '../../components/Toast';
import { useI18n } from '../../i18n';
import { errorText } from '../../lib/errors';
import { sfx } from '../../lib/sfx';
import { api } from '../../lib/store';
import { cn, hashString } from '../../lib/util';
import { CardTitle } from './CardTitle';
import { useCopyInvite } from './InviteCard';
import { ProfileModal } from './ProfileModal';

/** How long a newcomer keeps its waving-hand badge. */
const FRESH_MS = 2600;

/** Stable little tilt per player so the tiles look like stickers slapped on a wall. */
const tiltOf = (id: string) => ((hashString(id) % 5) - 2) * 0.8;

/**
 * Tracks players that appeared after the first render (to celebrate them) and plays the
 * join sound. Never fires for players already there when the screen mounts.
 */
function useNewcomers(players: PublicPlayer[], meId: string): Set<string> {
  const t = useI18n().t;
  const known = useRef<Set<string> | null>(null);
  const [fresh, setFresh] = useState<Set<string>>(() => new Set());
  const timers = useRef<number[]>([]);

  useEffect(() => {
    const ids = players.map((p) => p.id);
    const prev = known.current;
    known.current = new Set(ids);
    if (!prev) return;
    const added = ids.filter((id) => !prev.has(id) && id !== meId);
    if (!added.length) return;
    sfx.play('join');
    for (const p of players.filter((pl) => added.includes(pl.id))) {
      toast(t('lobby.players.joined', { name: p.name }), 'info', { emoji: p.avatar, durationMs: 2200 });
    }
    setFresh((f) => new Set([...f, ...added]));
    timers.current.push(
      window.setTimeout(() => {
        setFresh((f) => {
          const next = new Set(f);
          added.forEach((id) => next.delete(id));
          return next;
        });
      }, FRESH_MS),
    );
  }, [players, meId, t]);

  useEffect(() => {
    const list = timers.current;
    return () => list.forEach((id) => window.clearTimeout(id));
  }, []);

  return fresh;
}

/** Players whose readiness just flipped to ready (for a little bounce + pop). */
function useJustReady(players: PublicPlayer[], meId: string): Set<string> {
  const prev = useRef<Map<string, boolean> | null>(null);
  const timer = useRef(0);
  const [bumped, setBumped] = useState<Set<string>>(() => new Set());
  useEffect(() => {
    const before = prev.current;
    prev.current = new Map(players.map((p) => [p.id, p.ready]));
    if (!before) return;
    const flipped = players.filter((p) => p.ready && before.get(p.id) === false).map((p) => p.id);
    if (!flipped.length) return;
    // My own upload already celebrated with its own sound.
    if (flipped.some((id) => id !== meId)) sfx.play('pop');
    setBumped(new Set(flipped));
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setBumped(new Set()), 900);
  }, [players, meId]);
  useEffect(() => () => window.clearTimeout(timer.current), []);
  return bumped;
}

export function PlayersCard({ view }: { view: RoomView }) {
  const { t, tpick } = useI18n();
  const isHost = view.hostId === view.meId;
  const fresh = useNewcomers(view.players, view.meId);
  const bumped = useJustReady(view.players, view.meId);
  const [kickTarget, setKickTarget] = useState<PublicPlayer | null>(null);
  const [kicking, setKicking] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const copyInvite = useCopyInvite(view.code);
  const firstRender = useRef(true);
  useEffect(() => {
    firstRender.current = false;
  }, []);

  // The player left (or lost the crown on our side) while the dialog was open.
  const targetGone = kickTarget !== null && (!isHost || !view.players.some((p) => p.id === kickTarget.id));
  useEffect(() => {
    if (targetGone) setKickTarget(null);
  }, [targetGone]);

  const count = view.players.length;
  const full = count >= MAX_PLAYERS;
  const readyCount = view.players.filter((p) => p.ready).length;
  const me = view.players.find((p) => p.id === view.meId) ?? null;

  const confirmKick = async () => {
    const target = kickTarget;
    if (!target || kicking) return;
    setKicking(true);
    const res = await api.kick(target.id);
    setKicking(false);
    setKickTarget(null);
    if (!res.ok) toast(errorText(t, res.error), 'error');
    else {
      sfx.play('whoosh');
      toast(t('lobby.players.kicked', { name: target.name }), 'info', { icon: 'leave' });
    }
  };

  return (
    <Card tone="cream" className="@container p-4 sm:p-5">
      {/* Narrow card: title + capacity on the first row, the ready count under the title. */}
      <div className="mb-5 flex flex-wrap items-center gap-x-2.5 gap-y-2">
        <CardTitle icon="users" tone="mint" className="mr-auto">
          {t('lobby.players.title')}
        </CardTitle>
        <span
          className={cn(
            'order-last flex h-7 items-center gap-1 rounded-full border-2 px-2 text-xs font-extrabold @sm:order-none',
            readyCount ? 'border-ink bg-mint' : 'border-ink/30 text-ink-soft',
          )}
        >
          <Icon name="check" weight="bold" className="size-3.5" />
          {t('lobby.players.readyCount', { n: readyCount })}
        </span>
        <motion.span
          key={count}
          initial={{ scale: 1.6, rotate: -8 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: 'spring', stiffness: 500, damping: 14 }}
          className="flex items-center gap-1.5"
        >
          {full && <span className="label-mono rounded-[5px] bg-ink px-1.5 py-1 text-cream">{t('lobby.players.full')}</span>}
          <Stamp glow={false} size="md" ariaLabel={t('lobby.players.capacity', { count, max: MAX_PLAYERS })}>
            {t('lobby.players.capacity', { count: pad(count), max: MAX_PLAYERS })}
          </Stamp>
        </motion.span>
      </div>

      <ul className="grid grid-cols-3 gap-x-2 gap-y-3 sm:gap-x-3">
        <AnimatePresence initial={true}>
          {view.players.map((p, i) => (
            <PlayerTile
              key={p.id}
              player={p}
              isMe={p.id === view.meId}
              isFresh={fresh.has(p.id)}
              bumped={bumped.has(p.id)}
              enterDelay={firstRender.current ? 0.1 + i * 0.05 : 0}
              canKick={isHost && p.id !== view.meId}
              onKick={() => setKickTarget(p)}
              onEdit={() => setEditOpen(true)}
            />
          ))}
          {!full && (
            <motion.li
              key="__seat"
              layout
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ type: 'spring', stiffness: 400, damping: 26 }}
            >
              <motion.button
                type="button"
                onClick={copyInvite}
                whileTap={{ scale: 0.94 }}
                aria-label={t('lobby.players.inviteSeat')}
                className="group flex h-full min-h-28 w-full flex-col items-center justify-center gap-1.5 rounded-2xl border-3 border-dashed border-ink/30 px-1.5 py-2 text-center text-ink-soft transition-colors hover:border-ink/60 hover:bg-ink/5"
              >
                <span className="flex size-12 shrink-0 animate-pulse-soft items-center justify-center rounded-full border-3 border-dashed border-ink/35 transition-transform group-hover:scale-110">
                  <Icon name="plus" weight="bold" className="size-5" />
                </span>
                <span className="text-xs leading-tight font-extrabold">
                  {tpick('lobby.players.waitingSeat', hashString(view.code) + count)}
                </span>
              </motion.button>
            </motion.li>
          )}
        </AnimatePresence>
      </ul>

      <ConfirmDialog
        open={kickTarget !== null}
        danger
        title={t('lobby.players.kickTitle', { name: kickTarget?.name ?? '' })}
        body={t('lobby.players.kickBody', { name: kickTarget?.name ?? '' })}
        confirmLabel={t('lobby.players.kickConfirm')}
        onCancel={() => setKickTarget(null)}
        onConfirm={() => void confirmKick()}
      />
      {me && <ProfileModal open={editOpen} me={me} onClose={() => setEditOpen(false)} />}
    </Card>
  );
}

function PlayerTile({
  player,
  isMe,
  isFresh,
  bumped,
  enterDelay,
  canKick,
  onKick,
  onEdit,
}: {
  player: PublicPlayer;
  isMe: boolean;
  isFresh: boolean;
  bumped: boolean;
  enterDelay: number;
  canKick: boolean;
  onKick: () => void;
  onEdit: () => void;
}) {
  const t = useI18n().t;
  const offline = !player.connected;
  const tilt = tiltOf(player.id);
  const status: IconName = offline ? 'ghost' : player.ready ? 'check' : 'clock';

  const body = (
    <>
      <span className="relative shrink-0">
        {/* The host's crown comes with the Avatar (an icon on the rim). */}
        <Avatar player={player} size="md" />
      </span>
      <span className={cn('block w-full truncate text-sm leading-tight font-extrabold', offline && 'opacity-60')}>
        {player.name}
        {isMe && <span className="sr-only"> {t('common.youTag')}</span>}
        {player.isHost && <span className="sr-only"> ({t('common.host')})</span>}
      </span>
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={offline ? 'off' : player.ready ? 'ready' : 'wait'}
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: bumped ? [1.35, 1] : 1, opacity: 1 }}
          exit={{ scale: 0.5, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 500, damping: 18 }}
          className={cn(
            'inline-flex h-5.5 max-w-full items-center gap-1 rounded-full border-2 pr-1.5 pl-1 text-[11px] leading-none font-extrabold whitespace-nowrap sm:pr-2',
            offline
              ? 'border-ink/25 bg-ink/10 text-ink-soft'
              : player.ready
                ? 'border-ink bg-mint text-ink'
                : 'border-ink/30 bg-cream text-ink-soft',
          )}
        >
          <Icon name={status} weight={player.ready && !offline ? 'bold' : 'regular'} className="size-3 shrink-0" />
          <span className="truncate">
            {offline ? t('lobby.players.offline') : player.ready ? t('lobby.players.ready') : t('lobby.players.notReady')}
          </span>
        </motion.span>
      </AnimatePresence>
    </>
  );

  const tileClass = cn(
    'relative flex h-full w-full min-w-0 flex-col items-center gap-1 rounded-2xl border-3 border-ink px-1 pt-3.5 pb-2 text-center text-ink',
    isMe ? 'shadow-pop' : 'bg-white shadow-pop-sm',
  );

  return (
    <motion.li
      layout
      className="relative min-w-0"
      initial={{ opacity: 0, scale: 0.3, rotate: -14, y: 20 }}
      animate={{ opacity: 1, scale: 1, rotate: tilt, y: 0 }}
      exit={{ opacity: 0, scale: 0.3, rotate: 20, transition: { duration: 0.25 } }}
      transition={{ type: 'spring', stiffness: 460, damping: 17, delay: enterDelay }}
    >
      {isMe ? (
        <motion.button
          type="button"
          onClick={() => {
            sfx.play('click');
            onEdit();
          }}
          whileTap={{ scale: 0.96 }}
          whileHover={{ y: -2 }}
          aria-label={`${player.name} ${t('common.youTag')}. ${t('lobby.players.edit')}`}
          title={t('lobby.players.edit')}
          className={cn(tileClass, 'group')}
          style={{ backgroundColor: `color-mix(in srgb, ${player.color} 28%, white)` }}
        >
          {body}
          <span
            className="absolute -top-2.5 -left-2 -rotate-12 rounded-full border-2 border-ink bg-ink px-1.5 py-px font-display text-[11px] tracking-wider text-sun uppercase shadow-pop-sm"
            aria-hidden
          >
            {t('common.you')}
          </span>
          <span
            className="absolute -top-2.5 -right-2 flex size-8 items-center justify-center rounded-full border-2 border-ink bg-white text-ink shadow-pop-sm transition-colors group-hover:bg-sun"
            aria-hidden
          >
            <Icon name="edit" className="size-4" />
          </span>
        </motion.button>
      ) : (
        <div className={tileClass}>{body}</div>
      )}

      {canKick && (
        <motion.button
          type="button"
          onClick={() => {
            sfx.play('click');
            onKick();
          }}
          whileTap={{ scale: 0.85 }}
          whileHover={{ rotate: 12, scale: 1.1 }}
          aria-label={t('lobby.players.kick', { name: player.name })}
          title={t('lobby.players.kick', { name: player.name })}
          // 44px hit area around a 30px visual badge on the tile's corner.
          className="group absolute -top-3.5 -right-3 flex size-11 items-center justify-center"
        >
          {/* Ink, not red: a dozen red dots would shout over the players. It turns red on hover. */}
          <span className="flex size-7 items-center justify-center rounded-full border-2 border-ink bg-ink text-cream shadow-[0_2px_0_0_rgb(27_16_54/0.35)] transition-colors group-hover:bg-danger group-hover:text-ink">
            <Icon name="x" weight="bold" className="size-3.5" />
          </span>
        </motion.button>
      )}

      <AnimatePresence>
        {isFresh && (
          <motion.span
            className="pointer-events-none absolute -top-4 -left-1 z-10"
            initial={{ scale: 0, y: 10, rotate: -20 }}
            animate={{ scale: 1, y: 0, rotate: [-10, 10, -10, 0] }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 500, damping: 14, rotate: { duration: 0.8 } }}
            aria-hidden
          >
            <IconBadge name="hand" tone="sun" size="sm" />
          </motion.span>
        )}
      </AnimatePresence>
    </motion.li>
  );
}
