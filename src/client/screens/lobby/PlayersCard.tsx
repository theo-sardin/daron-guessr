import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useRef, useState } from 'react';
import { MAX_PLAYERS, type PublicPlayer, type RoomView } from '../../../shared/protocol';
import { Avatar } from '../../components/Avatar';
import { Button } from '../../components/Button';
import { DymoLabel } from '../../components/DymoLabel';
import { Icon, type IconName } from '../../components/Icon';
import { IconBadge } from '../../components/IconBadge';
import { MarkerCheck } from '../../components/Marker';
import { ConfirmDialog } from '../../components/Modal';
import { Paper, PostIt } from '../../components/Paper';
import { RubberStamp } from '../../components/RubberStamp';
import { toast } from '../../components/Toast';
import { useI18n } from '../../i18n';
import { errorText } from '../../lib/errors';
import { sfx } from '../../lib/sfx';
import { api } from '../../lib/store';
import { cn, hashString } from '../../lib/util';
import { CardTitle } from './CardTitle';
import { useCopyInvite } from './InviteCard';
import { ProfileModal } from './ProfileModal';
import { useSelfie } from './selfie';

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
    <Paper surface="grain" torn="b" tilt={0.5} tape="pink" seed="players" className="@container p-4 pb-6 sm:p-5 sm:pb-7">
      {/* Title, then "5/12" big and bold; the ready count scribbled under the title. */}
      <div className="mb-5 flex items-start gap-2.5">
        <div className="mr-auto min-w-0">
          <CardTitle>{t('lobby.players.title')}</CardTitle>
          <p className={cn('text-pen mt-1 -rotate-1 text-[1.15rem] leading-none', !readyCount && 'text-ink-faint')}>
            {t('lobby.players.readyCount', { n: readyCount })}
          </p>
        </div>
        <motion.span
          key={count}
          initial={{ scale: 1.6, rotate: -8 }}
          animate={{ scale: 1, rotate: -2 }}
          transition={{ type: 'spring', stiffness: 500, damping: 14 }}
          className="flex shrink-0 flex-col items-end gap-1"
        >
          <span className="flex items-baseline font-num" role="img" aria-label={t('lobby.players.capacity', { count, max: MAX_PLAYERS })}>
            <span className="text-[2.1rem]">{count}</span>
            <span className="text-[1.25rem] text-ink-soft">/{MAX_PLAYERS}</span>
          </span>
          {full && (
            <RubberStamp size="xs" tilt={-6}>
              {t('lobby.players.full')}
            </RubberStamp>
          )}
        </motion.span>
      </div>

      <ul className="grid grid-cols-3 gap-x-2 gap-y-6 sm:gap-x-3">
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
                className="group flex h-full min-h-28 w-full flex-col items-center justify-start gap-1.5 px-1 pt-1.5 pb-1 text-center text-ink-soft"
              >
                <span className="flex size-16 shrink-0 items-center justify-center rounded-full border-2 border-dashed border-ink/40 transition-all group-hover:scale-105 group-hover:border-ink group-hover:text-ink">
                  <Icon name="plus" weight="bold" className="size-6" />
                </span>
                <span className="text-pen text-[1.1rem] leading-[0.95]">{tpick('lobby.players.waitingSeat', hashString(view.code) + count)}</span>
              </motion.button>
            </motion.li>
          )}
        </AnimatePresence>
      </ul>

      {me && <SelfieNudge me={me} code={view.code} />}

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
    </Paper>
  );
}

/** Session key remembering that this player dismissed the selfie nudge in this room. */
const nudgeKey = (code: string) => `dg:selfieNudge:${code}`;

/**
 * "Add your face so people can compare!": a post-it for players without a selfie. The button
 * opens the front camera right away; "Later" hides it for this room (this tab).
 */
function SelfieNudge({ me, code }: { me: PublicPlayer; code: string }) {
  const t = useI18n().t;
  const selfie = useSelfie();
  const [dismissed, setDismissed] = useState(() => {
    try {
      return sessionStorage.getItem(nudgeKey(code)) === '1';
    } catch {
      return false;
    }
  });
  const show = !me.selfieUrl && !dismissed;
  const later = () => {
    setDismissed(true);
    try {
      sessionStorage.setItem(nudgeKey(code), '1');
    } catch {
      // Private mode: it just comes back next time.
    }
  };
  return (
    <>
      <AnimatePresence initial={false}>
        {show && (
          <motion.div
            key="nudge"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="-mx-1 overflow-hidden px-1 pt-2 pb-1"
          >
            <PostIt tilt={-1.2} tape seed="selfie-nudge" className="mt-3 flex items-start gap-3 px-3 pt-3 pb-3.5">
              <span className="relative mt-0.5 shrink-0" aria-hidden>
                <Avatar player={me} size="md" crown={false} dimOffline={false} tilt={-6} />
                <span className="absolute -right-1.5 -bottom-1 flex size-6 items-center justify-center rounded-full bg-ink text-yellow">
                  <Icon name="camera" weight="bold" className="size-3.5" />
                </span>
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-heavy text-[1.05rem] leading-tight">{t('lobby.players.selfieNudge')}</p>
                <p className="mt-1 text-sm leading-snug">{t('lobby.players.selfieNudgeBody')}</p>
                <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1">
                  <Button
                    size="sm"
                    variant="primary"
                    loading={selfie.busy === 'upload'}
                    icon={<Icon name="camera" className="size-4.5" />}
                    onClick={selfie.take}
                  >
                    {t('lobby.players.selfieNudgeButton')}
                  </Button>
                  <button type="button" onClick={later} className="text-pen h-11 px-1 text-[1.15rem] underline decoration-2 underline-offset-4">
                    {t('lobby.players.selfieNudgeLater')}
                  </button>
                </div>
              </div>
            </PostIt>
          </motion.div>
        )}
      </AnimatePresence>
    </>
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

  const statusLabel = offline ? t('lobby.players.offline') : player.ready ? t('lobby.players.ready') : t('lobby.players.notReady');
  const body = (
    <>
      <span className="relative shrink-0">
        {/* The host's crown comes with the Avatar (an icon on the rim); selfies show the face. */}
        <Avatar player={player} size="lg" selfie tilt={tilt * 2} />
      </span>
      <span className={cn('block w-full truncate px-0.5 font-display text-[0.95rem] leading-tight', offline && 'opacity-60')}>
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
            'inline-flex max-w-full items-center gap-1 font-type text-[0.72rem] leading-none whitespace-nowrap',
            offline ? 'text-ink-faint' : player.ready ? 'text-ink' : 'text-ink-faint',
          )}
        >
          {player.ready && !offline ? (
            <MarkerCheck className="-mt-1 shrink-0" style={{ width: 17, height: 17 }} strokeWidth={4} animate={bumped} />
          ) : (
            <Icon name={status} className="size-3 shrink-0" />
          )}
          <span className="truncate">{statusLabel}</span>
        </motion.span>
      </AnimatePresence>
    </>
  );

  const tileClass = 'relative flex h-full w-full min-w-0 flex-col items-center gap-1 px-0.5 pt-2 pb-1.5 text-center text-ink';

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
          className={cn(tileClass, 'group isolate')}
        >
          {/* My tile: highlighted in yellow like a name in the class photo, "YOU" punched on a Dymo. */}
          <span className="absolute inset-0 -z-10 bg-yellow/70 [clip-path:polygon(3%_6%,97%_0,100%_94%,0_100%)]" aria-hidden />
          {body}
          <span className="absolute -bottom-3 left-1/2 z-10 -translate-x-1/2" aria-hidden>
            <DymoLabel text={t('common.you')} size="xs" tilt={-8} spacing={0.12} />
          </span>
          <span
            className="absolute -top-2 -right-1 z-10 flex size-8 items-center justify-center rounded-full border-2 border-blue bg-sheet text-blue shadow-paper-sm transition-colors group-hover:bg-yellow"
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
          className="group absolute -top-3.5 -right-2 z-10 flex size-11 items-center justify-center"
        >
          {/* Ink, not red: a dozen red dots would shout over the players. It turns red on hover. */}
          <span className="flex size-7 items-center justify-center rounded-full bg-ink text-sheet shadow-paper-sm transition-colors group-hover:bg-red">
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
