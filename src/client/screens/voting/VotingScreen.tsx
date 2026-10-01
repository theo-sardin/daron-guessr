import { AnimatePresence, motion } from 'motion/react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { BLUR_BONUS_BY_STEP, type RoomView, type VotingView } from '../../../shared/protocol';
import { Button } from '../../components/Button';
import { flashScreen } from '../../components/Flash';
import { Icon } from '../../components/Icon';
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
import { Question } from './Question';
import { RoundTransition } from './RoundTransition';
import { useVote } from './useVote';
import { VoteHeader } from './VoteHeader';
import { VotersStrip } from './VotersStrip';

/** How long "GO!" stays on screen after the first round opens. */
const GO_MS = 750;
/** Last seconds during which the screen pulses red if you have not voted yet. */
const URGENT_S = 5;

export function VotingScreen({ view }: { view: RoomView }) {
  if (!view.voting) {
    return (
      <ScreenShell className="flex justify-center">
        <Spinner className="size-10 text-red" />
      </ScreenShell>
    );
  }
  return <Voting view={view} v={view.voting} />;
}

type Note = { key: TKey; tone: 'pen' | 'marker' };

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
      // The self-timer fires: shutter + flash, on top of the "go" beep.
      sfx.play('go');
      flashScreen();
      burst({ particleCount: 90, y: 0.5 });
      vibrate([20, 40, 30]);
    } else if (cue.startsWith('i')) sfx.play('countdown');
    else if (cue.startsWith('t')) sfx.play('whoosh');
    else if (cue.startsWith('lock')) sfx.play('tock');
  }, [cue]);

  // A sharper step: a soft shutter click.
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
      burst({
        particleCount: 24,
        x: (rect.left + rect.width / 2) / window.innerWidth,
        y: (rect.top + rect.height / 2) / window.innerHeight,
        colors: v.isMine ? ['#f6a6c1', '#e3321f', '#fffdf6'] : ['#ffdf3d', '#e3321f', '#2344c8'],
      });
    },
    [canVote, choose, v.blur, v.round, v.isMine],
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

  const note: Note = !started
    ? { key: 'voting.status.waiting', tone: 'pen' }
    : timeUp
      ? { key: selected ? 'voting.status.locked' : 'voting.status.missed', tone: 'pen' }
      : v.isMine
        ? { key: selected ? 'voting.changeHint.bluff' : 'voting.status.minePick', tone: 'pen' }
        : selected
          ? { key: view.settings.voteSeconds > 0 ? 'voting.changeHint.timer' : 'voting.changeHint.noTimer', tone: 'pen' }
          : urgent
            ? { key: 'voting.status.hurry', tone: 'marker' }
            : { key: 'voting.status.pick', tone: 'pen' };

  const question = t(`common.whose.${v.photo.kind}`);
  const zoomable = !v.blur || v.blur.step >= v.blur.steps - 1;

  return (
    <div className="w-full overflow-x-clip">
      <ScreenShell width="xl" className="pb-36! lg:pb-32!">
        <VoteHeader v={v} />

        {/* Phone: question, photo, banner, candidates stacked. Desktop: photo | the rest. */}
        <div className="mt-2 flex flex-col lg:mt-4 lg:grid lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)] lg:items-center lg:gap-x-10">
          <div className="order-2 lg:col-start-1 lg:row-span-3 lg:row-start-1">
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
            />
            <AnimatePresence initial={false}>
              {v.isMine && photoVisible && (
                <motion.div
                  key={`mine-${v.photo.id}`}
                  className={cn('relative z-10 ml-auto w-[min(100%,21rem)] pr-1 lg:mr-6', v.blur ? 'mt-1' : '-mt-6 lg:-mt-10')}
                  exit={{ opacity: 0, scale: 0.9 }}
                >
                  <MineBanner kind={v.photo.kind} />
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <AnimatePresence mode="wait" initial={false}>
            <Question key={v.photo.id} kind={v.photo.kind} photoId={v.photo.id} className="order-1 mt-2 lg:col-start-2 lg:row-start-1 lg:mt-0" />
          </AnimatePresence>

          <div className={cn('relative order-4 lg:col-start-2 lg:row-start-2 lg:mt-6', v.isMine ? 'mt-4' : 'mt-3', timeUp && 'pointer-events-none')}>
            <CandidateGrid candidates={v.candidates} players={players} selected={selected} enabled={canVote} decoy={v.isMine} onPick={onPick} />
          </div>

          <div className="order-5 mt-4 min-h-7 px-1 lg:col-start-2 lg:row-start-3 lg:mt-5">
            <AnimatePresence mode="wait" initial={false}>
              <motion.p
                key={note.key}
                className={cn(
                  'leading-[1.05]',
                  note.tone === 'marker' ? 'text-marker text-[1.45rem]' : 'text-pen text-[1.3rem] lg:text-[1.45rem]',
                )}
                initial={{ opacity: 0, x: -10, rotate: -2 }}
                animate={{ opacity: 1, x: 0, rotate: -1 }}
                exit={{ opacity: 0, transition: { duration: 0.12 } }}
                transition={{ duration: 0.2 }}
                aria-live="polite"
              >
                {t(note.key)}
              </motion.p>
            </AnimatePresence>
          </div>
        </div>
      </ScreenShell>

      <BottomBar className="max-w-5xl">
        <VotersStrip players={view.players} votedIds={v.votedIds} compact={isHost} className="flex-1" />
        {isHost && (
          <Button
            variant="secondary"
            size="md"
            icon={<Icon name="arrow-right" className="size-5" weight="bold" />}
            aria-label={t('voting.skipLabel')}
            title={t('voting.skipLabel')}
            disabled={!started || timeUp}
            loading={skipping === v.round}
            onClick={skip}
            className="shrink-0 px-4 max-[389px]:gap-0 max-[389px]:px-3"
          >
            {/* Icon only on narrow phones, so the voters strip keeps room (the name stays). */}
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

/** Red marker pulse around the screen during the last seconds when you still have not voted. */
function UrgentVignette({ show }: { show: boolean }) {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          aria-hidden
          className="pointer-events-none fixed inset-0 z-30"
          style={{ boxShadow: 'inset 0 0 60px 8px rgb(227 50 31 / 0.4)' }}
          initial={{ opacity: 0 }}
          animate={{ opacity: [0.35, 1, 0.35] }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.9, repeat: Infinity, ease: 'easeInOut' }}
        />
      )}
    </AnimatePresence>
  );
}
