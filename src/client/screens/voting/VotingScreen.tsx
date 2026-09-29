import { AnimatePresence, motion } from 'motion/react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { RoomView, VotingView } from '../../../shared/protocol';
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
import { RoundTransition } from './RoundTransition';
import { useVote } from './useVote';
import { VoteHeader } from './VoteHeader';

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

  const onPick = useCallback(
    (id: string, el: HTMLElement) => {
      if (!canVote) return;
      if (!choose(id)) return;
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
    [canVote, choose, players, v.isMine],
  );

  // Lightbox follows the photo: a new round closes it by itself.
  const [zoomedId, setZoomedId] = useState<string | null>(null);
  const closeZoom = useCallback(() => setZoomedId(null), []);

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
            : 'pick';

  // Keep French "?" / "!" glued to the previous word (no orphan punctuation on a new line).
  const question = t(`common.whose.${v.photo.kind}`).replace(/ ([?!:;])/g, '\u00a0$1');

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
            onZoom={() => setZoomedId(v.photo.id)}
            className="order-2 mt-1 lg:col-start-1 lg:row-start-1 lg:mt-0 lg:min-w-[min(46.4dvh,432px)]"
          />

          <div className="contents lg:col-start-2 lg:row-start-1 lg:flex lg:flex-col">
            <AnimatePresence mode="wait" initial={false}>
              <motion.h2
                key={`${v.photo.id}-q`}
                className="text-outline order-1 px-1 text-center font-display text-[clamp(1.5rem,8.4vw,2rem)] leading-[1.05] text-cream sm:text-4xl lg:text-5xl"
                initial={{ scale: 0.7, opacity: 0, rotate: -3 }}
                animate={{ scale: 1, opacity: 1, rotate: 0 }}
                exit={{ scale: 0.8, opacity: 0 }}
                transition={{ type: 'spring', stiffness: 420, damping: 18 }}
              >
                {question}
              </motion.h2>
            </AnimatePresence>

            <AnimatePresence initial={false}>
              {v.isMine && photoVisible && (
                <motion.div
                  key={`mine-${v.photo.id}`}
                  className="relative z-10 order-3 -mt-9 px-1 lg:mt-6 lg:px-0"
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
        <div className="flex min-h-12 min-w-0 flex-1 items-center overflow-hidden rounded-2xl border-3 border-ink bg-cream px-3.5 py-1.5 text-ink shadow-pop-sm">
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
            className="shrink-0 px-4"
          >
            {t('voting.skip')}
          </Button>
        )}
      </BottomBar>

      <UrgentVignette show={urgent} />

      {createPortal(
        <AnimatePresence>
          {introStage !== null && (
            <IntroOverlay key="intro" stage={introStage} totalRounds={v.totalRounds} voteSeconds={view.settings.voteSeconds} />
          )}
          {inTransition && <RoundTransition key={`t-${v.round}`} round={v.round} total={v.totalRounds} kind={v.photo.kind} />}
        </AnimatePresence>,
        document.body,
      )}

      <Lightbox src={zoomedId === v.photo.id ? v.photo.url : null} onClose={closeZoom} caption={question} />
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
