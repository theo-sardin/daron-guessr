import { AnimatePresence, motion } from 'motion/react';
import { memo, useCallback, useEffect, useMemo, useRef, useState, type RefObject } from 'react';
import { POINTS_PER_CORRECT, type PublicPlayer, type RevealView, type RoomView } from '../../../shared/protocol';
import { Avatar } from '../../components/Avatar';
import { Button } from '../../components/Button';
import { BottomBar, ScreenShell } from '../../components/Layout';
import { Lightbox } from '../../components/Lightbox';
import { Spinner } from '../../components/Spinner';
import { toast } from '../../components/Toast';
import { useI18n } from '../../i18n';
import { errorText } from '../../lib/errors';
import { api, playersById } from '../../lib/store';
import { useElapsedSince } from '../../lib/time';
import { cn, seeded } from '../../lib/util';
import { useRevealEffects, type PersonalResult } from './effects';
import { Feedback, PersonalBadge } from './Feedback';
import { Headline } from './Headline';
import { Intro } from './Intro';
import { CAPTION_GROUP, SCENE } from './kinds';
import { PhotoCard } from './PhotoCard';
import { MAX_SUSPECTS, type Suspect } from './scenes';
import { ScoreStrip } from './ScoreStrip';
import { VoteBars } from './VoteBars';
import {
  computeOutcome,
  NEXT_ENABLED_AT_MS,
  pendingGains,
  playerOrGhost,
  reached,
  SETTLED_AT_MS,
  stageAt,
  tallyRows,
  type OutcomeInfo,
  type Row,
  type Stage,
} from './timeline';

/**
 * Reveal phase: photo by photo, the votes grow as bars, a drum roll, then the owner is
 * revealed with confetti and a caption that fits the result, their face slid next to the
 * photo with the touch of the photo's mode (resemblance gauge, then vs now, detective board,
 * crush poster, magnifier…). The whole sequence is driven by the time elapsed since
 * `reveal.startedAt` (server clock), so every screen stays in sync.
 */
export function RevealScreen({ view }: { view: RoomView }) {
  const r = view.reveal;
  const index = r?.index;
  // Players often scroll down to their result card: bring each new photo back into view.
  useEffect(() => {
    if (index !== undefined && index > 0) window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [index]);
  if (!r) {
    return (
      <ScreenShell>
        <div className="flex justify-center pt-24">
          <Spinner className="size-10 text-sun" />
        </div>
      </ScreenShell>
    );
  }
  // Keyed by photo index: every animation, effect and local state restarts for a new photo.
  return <Round key={r.index} view={view} reveal={r} />;
}

interface Model {
  byId: Map<string, PublicPlayer>;
  rowsHidden: Row[];
  rowsRevealed: Row[];
  owner: PublicPlayer;
  outcome: OutcomeInfo;
  personal: PersonalResult;
  /** Points the viewer earns on this photo (100 + the blur game's speed bonus when right). */
  points: number;
  picked: PublicPlayer | null;
  gains: Map<string, number>;
  host: PublicPlayer | null;
}

function buildModel(view: RoomView, reveal: RevealView): Model {
  const cur = reveal.current;
  const byId = playersById(view);
  const joinOrder = new Map(view.players.map((p, i) => [p.id, i]));
  const me = view.meId;
  let personal: PersonalResult;
  if (me === cur.ownerId) personal = cur.totalVotes > 0 && cur.correctVotes * 2 >= cur.totalVotes ? 'proud' : 'offended';
  else if (!cur.myVote) personal = 'none';
  else personal = cur.myVote === cur.ownerId ? 'right' : 'wrong';
  return {
    byId,
    rowsHidden: tallyRows(cur, joinOrder, false),
    rowsRevealed: tallyRows(cur, joinOrder, true),
    owner: playerOrGhost(byId, cur.ownerId),
    outcome: computeOutcome(cur, joinOrder),
    personal,
    points: personal === 'right' ? (cur.myPoints ?? POINTS_PER_CORRECT) : 0,
    picked: personal === 'wrong' && cur.myVote ? playerOrGhost(byId, cur.myVote) : null,
    gains: pendingGains(cur, me),
    host: byId.get(view.hostId) ?? null,
  };
}

function Round({ view, reveal }: { view: RoomView; reveal: RevealView }) {
  // The frame loop stops once the timeline is over (nothing changes after that).
  const [settled, setSettled] = useState(false);
  const elapsed = useElapsedSince(reveal.startedAt, !settled);
  useEffect(() => {
    if (!settled && elapsed >= SETTLED_AT_MS) setSettled(true);
  }, [elapsed, settled]);

  const stage = stageAt(elapsed);
  const introLeft = stage === 'intro' ? Math.max(1, Math.ceil(-elapsed / 1000)) : 0;
  const canNext = elapsed >= NEXT_ENABLED_AT_MS;
  const anchorRef = useRef<HTMLDivElement>(null);
  const model = useMemo(() => buildModel(view, reveal), [view, reveal]);

  useRevealEffects(elapsed, {
    rows: model.rowsHidden.length,
    outcome: model.outcome.outcome,
    ownerColor: model.owner.color,
    correct: reveal.current.correctVotes,
    total: reveal.current.totalVotes,
    personal: model.personal,
    anchor: anchorRef,
  });

  return (
    <RoundBody view={view} reveal={reveal} model={model} stage={stage} introLeft={introLeft} canNext={canNext} anchorRef={anchorRef} />
  );
}

interface BodyProps {
  view: RoomView;
  reveal: RevealView;
  model: Model;
  stage: Stage;
  introLeft: number;
  canNext: boolean;
  anchorRef: RefObject<HTMLDivElement | null>;
}

/** Everything visible for one photo. Memoized: re-renders on stage changes, not on every frame. */
const RoundBody = memo(function RoundBody({ view, reveal, model, stage, introLeft, canNext, anchorRef }: BodyProps) {
  const { t, tpick } = useI18n();
  const [zoom, setZoom] = useState(false);
  const cur = reveal.current;
  const kind = cur.photo.kind;
  const scene = SCENE[kind];
  const revealed = stage === 'owner';
  // Nothing about the owner is computed into the page before the reveal.
  const owner = revealed ? model.owner : null;
  const tilt = useMemo(() => Math.round((seeded(reveal.index * 31 + 7)() - 0.5) * 8), [reveal.index]);

  const caption = useMemo(() => {
    if (!owner) return null;
    const { outcome, wrongId, soloId } = model.outcome;
    const vars = {
      name: outcome === 'wrongMajority' && wrongId ? playerOrGhost(model.byId, wrongId).name : outcome === 'onlyOneNamed' && soloId ? playerOrGhost(model.byId, soloId).name : owner.name,
      owner: owner.name,
      who: t(`common.possessive.${kind}`, { name: owner.name }),
      of: t(`reveal.of.${kind}`, { name: owner.name }),
      yours: t(`common.yours.${kind}`),
    };
    return tpick(`reveal.caption.${outcome}.${CAPTION_GROUP[kind]}`, reveal.index, vars);
  }, [owner, model, kind, reveal.index, t, tpick]);

  const stamp = owner ? { kind: model.outcome.stamp, text: t(`reveal.stamp.${model.outcome.stamp}.${kind}`) } : null;
  const questionText = t(`common.whose.${kind}`);
  const photoLabel = owner ? t(`common.possessive.${kind}`, { name: owner.name }) : questionText;
  // The viewer's own pick is marked; the owner's decoy stops being marked once they are revealed.
  const myPickId = cur.myVote && !(revealed && view.meId === cur.ownerId) ? cur.myVote : null;

  // Detective board: the most voted candidates get pinned; the owner joins (or replaces the
  // last one) only once revealed, so the board never hints at them before.
  const suspects = useMemo<Suspect[]>(() => {
    const list = model.rowsHidden.slice(0, MAX_SUSPECTS).map((r) => ({ player: playerOrGhost(model.byId, r.id), votes: r.votes }));
    if (owner && !list.some((s) => s.player.id === owner.id)) {
      const ownerVotes = cur.tally[owner.id] ?? 0;
      if (list.length >= MAX_SUSPECTS) list[MAX_SUSPECTS - 1] = { player: owner, votes: ownerVotes };
      else list.push({ player: owner, votes: ownerVotes });
    }
    return list;
  }, [model, owner, cur.tally]);

  const resemblance = cur.totalVotes > 0 ? cur.correctVotes / cur.totalVotes : null;

  const onZoom = useCallback(() => setZoom(true), []);
  const closeZoom = useCallback(() => setZoom(false), []);

  return (
    <>
      {/* overflow-x-clip: pop-in scale animations must never cause a sideways scroll on phones. */}
      <ScreenShell width="xl" className="overflow-x-clip">
        <AnimatePresence mode="wait">
          {stage === 'intro' ? (
            <motion.div key="intro" exit={{ opacity: 0, scale: 0.85, y: -30 }} transition={{ duration: 0.25 }}>
              <Intro secondsLeft={introLeft} total={reveal.total} />
            </motion.div>
          ) : (
            <motion.div
              key="round"
              className="mx-auto w-full max-w-[60rem]"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.2 }}
            >
              <div className="mb-3 flex items-center justify-between gap-3">
                <span className="shrink-0 rounded-full border-2 border-ink bg-cream px-3 py-1 font-display text-base text-ink shadow-pop-sm">
                  📸 {t('reveal.photoOf', { i: reveal.index + 1, total: reveal.total })}
                </span>
                <ProgressDots index={reveal.index} total={reveal.total} label={t('reveal.progressLabel', { i: reveal.index + 1, total: reveal.total })} />
              </div>

              <Headline stage={stage} kind={kind} index={reveal.index} owner={owner} caption={caption} />

              <div className="flex flex-col items-center gap-6 md:flex-row md:items-start md:justify-center md:gap-8 lg:gap-10">
                <PhotoCard
                  src={cur.photo.url}
                  alt={photoLabel}
                  kind={kind}
                  scene={scene}
                  stage={stage}
                  tilt={tilt}
                  owner={owner}
                  stamp={stamp}
                  blur={view.settings.blur}
                  resemblance={resemblance}
                  suspects={suspects}
                  badge={revealed ? <PersonalBadge result={model.personal} points={model.points} /> : null}
                  zoomLabel={t('reveal.zoom')}
                  onZoom={onZoom}
                  anchorRef={anchorRef}
                />
                <AnimatePresence>
                  {reached(stage, 'bars') && (
                    <motion.div
                      key="side"
                      className="flex w-full max-w-md flex-col gap-3 md:pt-1"
                      initial={{ opacity: 0, y: 24 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ type: 'spring', stiffness: 260, damping: 24 }}
                    >
                      <VoteBars
                        rows={revealed ? model.rowsRevealed : model.rowsHidden}
                        stage={stage}
                        totalVotes={cur.totalVotes}
                        byId={model.byId}
                        meId={view.meId}
                        myPickId={myPickId}
                        ownerId={owner ? owner.id : null}
                      />
                      {revealed && (
                        <Feedback
                          result={model.personal}
                          kind={kind}
                          index={reveal.index}
                          picked={model.picked}
                          correct={cur.correctVotes}
                          total={cur.totalVotes}
                          points={model.points}
                        />
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* With anonymous votes the server keeps scores hidden until the results (score changes would reveal who voted what). */}
              {!view.settings.anonymousVotes && (
                <ScoreStrip players={view.players} meId={view.meId} gains={revealed ? model.gains : EMPTY} />
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </ScreenShell>

      <BottomBar>
        {view.meId === view.hostId ? (
          <NextButton index={reveal.index} isLast={reveal.index >= reveal.total - 1} enabled={canNext} />
        ) : (
          <WaitingPill host={model.host} />
        )}
      </BottomBar>

      <Lightbox src={zoom ? cur.photo.url : null} onClose={closeZoom} caption={photoLabel} />
    </>
  );
});

const EMPTY = new Map<string, number>();

function ProgressDots({ index, total, label }: { index: number; total: number; label: string }) {
  // Segments shrink to fit (24 photos still fit on one line on a phone).
  return (
    <div className="flex min-w-0 flex-1 items-center justify-end gap-1" role="img" aria-label={label}>
      {Array.from({ length: total }, (_, i) => (
        <motion.span
          key={i}
          className={cn(
            'block h-2.5 min-w-1 rounded-full',
            i === index ? 'max-w-5 flex-[2] border-2 border-ink bg-sun' : 'max-w-2.5 flex-1',
            i < index && 'border border-ink bg-mint',
            i > index && 'bg-white/20',
          )}
          initial={i === index ? { scale: 0 } : false}
          animate={i === index ? { scale: [1, 1.25, 1] } : { scale: 1 }}
          transition={i === index ? { duration: 1.2, repeat: Infinity } : undefined}
        />
      ))}
    </div>
  );
}

function NextButton({ index, isLast, enabled }: { index: number; isLast: boolean; enabled: boolean }) {
  const { t } = useI18n();
  const [busy, setBusy] = useState(false);
  const sending = useRef(false);

  const next = async () => {
    if (!enabled || sending.current) return;
    sending.current = true;
    setBusy(true);
    const res = await api.nextReveal(index);
    if (!res.ok) {
      toast(errorText(t, res.error), 'error');
      sending.current = false;
      setBusy(false);
      return;
    }
    // Success: the next photo remounts this screen. Unlock anyway if nothing comes.
    window.setTimeout(() => {
      sending.current = false;
      setBusy(false);
    }, 4000);
  };

  return (
    <motion.div
      className="w-full"
      animate={enabled ? { scale: [1, 1.08, 0.98, 1] } : { scale: 1 }}
      transition={{ duration: 0.45, ease: 'easeOut' }}
    >
      <Button block size="lg" variant={isLast ? 'sun' : 'primary'} disabled={!enabled} loading={busy} onClick={next}>
        {isLast ? t('reveal.results') : t('reveal.next')}
      </Button>
    </motion.div>
  );
}

function WaitingPill({ host }: { host: PublicPlayer | null }) {
  const { t } = useI18n();
  return (
    <div className="flex h-14 w-full min-w-0 items-center justify-center gap-2 rounded-2xl border-2 border-white/15 bg-grape-900/80 px-4 font-bold text-grape-200 backdrop-blur">
      {host && <Avatar player={host} size="xs" crown={false} selfie />}
      <span className="truncate">{t('reveal.waitingFor', { host: host?.name ?? '…' })}</span>
      <span className="flex gap-0.5" aria-hidden>
        {[0, 1, 2].map((i) => (
          <motion.span
            key={i}
            className="size-1.5 rounded-full bg-grape-200"
            animate={{ y: [0, -4, 0], opacity: [0.4, 1, 0.4] }}
            transition={{ duration: 0.9, repeat: Infinity, delay: i * 0.15 }}
          />
        ))}
      </span>
    </div>
  );
}
