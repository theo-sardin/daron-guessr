import { AnimatePresence, motion } from 'motion/react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { BLUR_BONUS_BY_STEP, type RoomView, type VotingView } from '../../../shared/protocol';
import { Button } from '../../components/Button';
import { BottomBar, ScreenShell } from '../../components/Layout';
import { Lightbox } from '../../components/Lightbox';
import { Spinner } from '../../components/Spinner';
import { toast } from '../../components/Toast';
import { useT, type TKey } from '../../i18n';
import { burst } from '../../lib/confetti';
import { errorText } from '../../lib/errors';
import { sfx } from '../../lib/sfx';
import { api, playersById } from '../../lib/store';
import { useServerNow } from '../../lib/time';
import { cn, vibrate } from '../../lib/util';
import { CandidateGrid } from './CandidateGrid';
import { IntroOverlay, type IntroStage } from './IntroOverlay';
import { MineBanner } from './MineBanner';
import { PhotoStage } from './PhotoStage';
import { Question, useQuestion } from './Question';
import { RoundTransition } from './RoundTransition';
import { useVote } from './useVote';
import { VoteHeader } from './VoteHeader';
import { useWaitingNote } from './VotersStrip';

/** How long "GO!" stays on screen after the first round opens. */
const GO_MS = 750;
/** Last seconds during which the screen pulses red if you have not voted yet. */
const URGENT_S = 5;

export function VotingScreen({ view }: { view: RoomView }) {
  if (!view.voting) {
    return (
      <ScreenShell className="flex justify-center">
        <Spinner className="size-10 text-sun" />
      </ScreenShell>
    );
  }
  return <Voting view={view} v={view.voting} />;
}

type StatusKey = keyof typeof STATUS_KEYS;
const STATUS_KEYS = {
  waiting: 'voting.status.waiting',
  pick: 'voting.status.pick',
  pickBlur: 'voting.status.pickBlur',
  hurry: 'voting.status.hurry',
  changeTimer: 'voting.status.changeTimer',
  changeNoTimer: 'voting.status.changeNoTimer',
  minePick: 'voting.status.minePick',
  bluff: 'voting.status.bluff',
  locked: 'voting.status.locked',
  missed: 'voting.status.missed',
} as const satisfies Record<string, TKey>;

function Voting({ view, v }: { view: RoomView; v: VotingView }) {
  const t = useT();
  const now = useServerNow(100);
  const players = useMemo(() => playersById(view), [view]);
  const isHost = view.meId === view.hostId;

  const started = now >= v.startsAt;
  const timeUp = v.endsAt !== null && now >= v.endsAt;
  const canVote = started && !timeUp;
  const secondsLeft = v.endsAt === null ? null : Math.ceil((v.endsAt - now) / 1000);

  // The intro only plays if this screen was mounted while it was running (not on a late rejoin).
  const [sawIntro] = useState(() => v.round === 0 && now < v.startsAt);
  const introStage = getIntroStage(v, now, sawIntro);
  const inTransition = v.round > 0 && !started;
  const photoVisible = started && introStage === null;

  const { selected, choose } = useVote(v);
  const urgent = canVote && secondsLeft !== null && secondsLeft <= URGENT_S && !selected;

  // Blur bonus kept: the step at which this browser last changed its vote (the server scores the same way).
  const [voteStep, setVoteStep] = useState<{ round: number; step: number } | null>(null);
  const keptBonus = v.blur && selected && voteStep?.round === v.round ? (BLUR_BONUS_BY_STEP[voteStep.step] ?? 0) : null;

  // Sound cues, each played once when it first shows up (a late mount stays silent).
  const cue =
    introStage === null ? (inTransition ? `t${v.round}` : timeUp ? `lock${v.round}` : null) : introStage === 'ready' ? null : `i${introStage}`;
  const lastCue = useRef(cue);
  useEffect(() => {
    if (cue === lastCue.current) return;
    lastCue.current = cue;
    if (!cue) return;
    if (cue === 'igo') {
      sfx.play('go');
      burst({ particleCount: 90, y: 0.5 });
      vibrate([20, 40, 30]);
    } else if (cue.startsWith('i')) sfx.play('countdown');
    else if (cue.startsWith('t')) sfx.play('whoosh');
    else if (cue.startsWith('lock')) sfx.play('tock');
  }, [cue]);

  // A sharper blur step: a soft click.
  const blurStep = v.blur?.step ?? null;
  const lastStep = useRef(blurStep);
  useEffect(() => {
    if (blurStep !== null && lastStep.current !== null && blurStep > lastStep.current) sfx.play('tick');
    lastStep.current = blurStep;
  }, [blurStep]);

  const onPick = useCallback(
    (id: string, el: HTMLElement) => {
      if (!canVote) return;
      if (!choose(id)) return;
      if (v.blur) setVoteStep({ round: v.round, step: v.blur.step });
      sfx.play('vote');
      vibrate(15);
      const rect = el.getBoundingClientRect();
      const color = players.get(id)?.color;
      burst({
        particleCount: 28,
        x: (rect.left + rect.width / 2) / window.innerWidth,
        y: (rect.top + rect.height / 2) / window.innerHeight,
        colors: v.isMine ? ['#b388ff', '#ff8c42', '#fff8ec'] : [color ?? '#ffd23f', '#ffd23f', '#fff8ec'],
      });
    },
    [canVote, choose, players, v.blur, v.round, v.isMine],
  );

  // Lightbox follows the photo: a new round closes it by itself. A blurred photo only opens once
  // it is fully sharp (the lightbox would show it sharp).
  const [zoomedId, setZoomedId] = useState<string | null>(null);
  const closeZoom = useCallback(() => setZoomedId(null), []);
  const zoomable = !v.blur || v.blur.step >= v.blur.steps - 1;

  // Host skip, guarded per round against double taps.
  const [skipping, setSkipping] = useState<number | null>(null);
  const skipRef = useRef<number | null>(null);
  const skip = async () => {
    const round = v.round;
    if (skipRef.current === round) return;
    skipRef.current = round;
    setSkipping(round);
    const res = await api.skipRound(round);
    if (!res.ok) {
      skipRef.current = null;
      setSkipping(null);
      toast(errorText(t, res.error), 'error');
    }
  };

  const status: StatusKey = !started
    ? 'waiting'
    : timeUp
      ? selected
        ? 'locked'
        : 'missed'
      : v.isMine
        ? selected
          ? 'bluff'
          : 'minePick'
        : selected
          ? view.settings.voteSeconds > 0
            ? 'changeTimer'
            : 'changeNoTimer'
          : urgent
            ? 'hurry'
            : v.blur && v.blur.step < v.blur.steps - 1
              ? 'pickBlur'
              : 'pick';
  // Once you voted: who the round is still waiting for, under the status.
  const waitingNote = useWaitingNote(view.players, v.votedIds);
  const showWaiting = canVote && !!selected && waitingNote !== null;

  const question = useQuestion(v.photo.kind);

  return (
    <div className="w-full overflow-x-clip">
      <ScreenShell width="xl" className="pb-44!" style={{ paddingTop: 'calc(max(0.5rem, env(safe-area-inset-top)) + 4.25rem)' }}>
        <VoteHeader v={v} players={view.players} meId={view.meId} started={started} />

        {/* Phone: question, photo, banner, candidates stacked. Desktop: photo | the rest. */}
        <div className="mt-3 flex flex-col lg:mt-6 lg:grid lg:grid-cols-[auto_minmax(0,1fr)] lg:items-center lg:gap-x-12">
          <PhotoStage
            photo={v.photo}
            round={v.round}
            visible={photoVisible}
            locked={timeUp}
            compact={v.isMine}
            blur={v.blur}
            keptBonus={keptBonus}
            showBonus={!v.isMine}
            onZoom={() => zoomable && setZoomedId(v.photo.id)}
            className="order-2 mt-1 lg:col-start-1 lg:row-start-1 lg:mt-0"
          />

          <div className="contents lg:col-start-2 lg:row-start-1 lg:flex lg:flex-col">
            <AnimatePresence mode="wait" initial={false}>
              <Question key={`${v.photo.id}-q`} kind={v.photo.kind} className="order-1" />
            </AnimatePresence>

            <AnimatePresence initial={false}>
              {v.isMine && photoVisible && (
                <motion.div
                  key={`mine-${v.photo.id}`}
                  // Overlaps the bottom of the photo, except under a blurred one (its focus meter stays visible).
                  className={cn('relative z-10 order-3 px-1 lg:mt-6 lg:px-0', v.blur ? 'mt-1' : '-mt-9')}
                  exit={{ opacity: 0, scale: 0.9 }}
                >
                  <MineBanner kind={v.photo.kind} />
                </motion.div>
              )}
            </AnimatePresence>

            <div className={cn('relative order-4 lg:mt-7', v.isMine ? 'mt-4' : 'mt-5', timeUp && 'pointer-events-none')}>
              <CandidateGrid
                candidates={v.candidates}
                players={players}
                selected={selected}
                enabled={canVote}
                decoy={v.isMine}
                onPick={onPick}
              />
            </div>
          </div>
        </div>
      </ScreenShell>

      <BottomBar>
        <div className="flex min-h-12 min-w-0 flex-1 flex-col justify-center overflow-hidden rounded-2xl border-3 border-ink bg-cream px-3.5 py-1.5 text-ink shadow-pop-sm">
          <AnimatePresence mode="wait" initial={false}>
            <motion.p
              key={status}
              className={cn('text-sm leading-tight font-extrabold', status === 'hurry' && 'text-danger-dark')}
              initial={{ y: 14, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -14, opacity: 0 }}
              transition={{ duration: 0.16 }}
              aria-live="polite"
            >
              {t(STATUS_KEYS[status])}
            </motion.p>
          </AnimatePresence>
          {showWaiting && (
            <p className="mt-0.5 truncate text-xs leading-tight font-bold text-ink-soft">
              <span aria-hidden>⏳ </span>
              {waitingNote}
            </p>
          )}
        </div>
        {isHost && (
          <Button
            variant="secondary"
            size="md"
            icon={<span aria-hidden>⏭</span>}
            aria-label={t('voting.skipLabel')}
            title={t('voting.skipLabel')}
            disabled={!started || timeUp}
            loading={skipping === v.round}
            onClick={skip}
            className="shrink-0 px-4 max-[389px]:gap-0 max-[389px]:px-3"
          >
            {/* Emoji only on narrow phones, so the status keeps room (the name stays). */}
            <span className="max-[389px]:sr-only">{t('voting.skip')}</span>
          </Button>
        )}
      </BottomBar>

      <UrgentVignette show={urgent} />

      {createPortal(
        <AnimatePresence>
          {introStage !== null && (
            <IntroOverlay
              key="intro"
              stage={introStage}
              totalRounds={v.totalRounds}
              voteSeconds={view.settings.voteSeconds}
              theme={view.settings.theme}
              blur={view.settings.blur}
            />
          )}
          {inTransition && <RoundTransition key={`t-${v.round}`} round={v.round} total={v.totalRounds} kind={v.photo.kind} />}
        </AnimatePresence>,
        document.body,
      )}

      <Lightbox src={zoomedId === v.photo.id && zoomable ? v.photo.url : null} onClose={closeZoom} caption={question} />
    </div>
  );
}

function getIntroStage(v: VotingView, now: number, sawIntro: boolean): IntroStage | null {
  if (v.round !== 0) return null;
  const remaining = v.startsAt - now;
  if (remaining > 3000) return 'ready';
  if (remaining > 0) return Math.ceil(remaining / 1000) as 1 | 2 | 3;
  if (sawIntro && remaining > -GO_MS) return 'go';
  return null;
}

/** Red pulse around the screen during the last seconds when you still have not voted. */
function UrgentVignette({ show }: { show: boolean }) {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          aria-hidden
          className="pointer-events-none fixed inset-0 z-30"
          style={{ boxShadow: 'inset 0 0 70px 10px rgb(255 93 93 / 0.55)' }}
          initial={{ opacity: 0 }}
          animate={{ opacity: [0.35, 1, 0.35] }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.9, repeat: Infinity, ease: 'easeInOut' }}
        />
      )}
    </AnimatePresence>
  );
}
