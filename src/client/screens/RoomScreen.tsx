import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useRef, useState } from 'react';
import type { Phase, RoomView } from '../../shared/protocol';
import { Button } from '../components/Button';
import { NotebookCard } from '../components/Paper';
import { ReactionBar, ReactionsLayer } from '../components/Reactions';
import { RubberStamp, type RubberStampTone } from '../components/RubberStamp';
import { Spinner } from '../components/Spinner';
import { toast } from '../components/Toast';
import { TornPaper } from '../components/TornPaper';
import { useI18n, useT, type Lang } from '../i18n';
import { errorText } from '../lib/errors';
import { navigate } from '../lib/router';
import { sfx } from '../lib/sfx';
import { api, useStore, type ExitReason } from '../lib/store';
import { JoinByLink } from './home/JoinByLink';
import { LobbyScreen } from './lobby/LobbyScreen';
import { ResultsScreen } from './results/ResultsScreen';
import { RevealScreen } from './reveal/RevealScreen';
import { VotingScreen } from './voting/VotingScreen';

type Stage = 'resuming' | 'join' | 'in-room';

/**
 * Everything under /:code. Resumes a stored session if there is one, otherwise shows the
 * join form; once in the room, renders the screen for the current phase.
 */
export function RoomScreen({ code }: { code: string }) {
  const t = useT();
  const status = useStore((s) => s.status);
  const session = useStore((s) => s.session);
  const view = useStore((s) => s.view);
  const exitReason = useStore((s) => s.exitReason);
  const [stage, setStage] = useState<Stage>(session?.code === code ? 'in-room' : 'resuming');
  const [joinNotice, setJoinNotice] = useState<string | null>(null);
  const attempted = useRef(false);

  // Leaving a room for another one: drop the old seat.
  useEffect(() => {
    if (session && session.code !== code) void api.leave();
  }, [session, code]);

  // First connection: try to resume a stored session for this room.
  useEffect(() => {
    if (attempted.current || status !== 'connected') return;
    if (session?.code === code) {
      setStage('in-room');
      return;
    }
    attempted.current = true;
    void api.resume(code).then((res) => {
      if (!res) setStage('join');
      else if (res.ok) setStage('in-room');
      else {
        if (res.error === 'SESSION_ACTIVE') setJoinNotice(errorText(t, res.error));
        setStage('join');
      }
    });
  }, [status, session, code, t]);

  useEffect(() => {
    if (session?.code === code) setStage('in-room');
  }, [session, code]);

  // Free hosting tiers (e.g. Render) put the server to sleep after ~15 min without HTTP
  // requests, and WebSocket frames may not count. A sleeping server loses every room, so
  // keep it awake with a tiny request while someone is in a room.
  useEffect(() => {
    if (stage !== 'in-room') return;
    const id = window.setInterval(() => void fetch('/api/health', { cache: 'no-store' }).catch(() => undefined), 4 * 60_000);
    return () => window.clearInterval(id);
  }, [stage]);

  // Connection feedback once we were in the room.
  const wasOffline = useRef(false);
  useEffect(() => {
    if (stage !== 'in-room') return;
    if (status === 'disconnected') wasOffline.current = true;
    if (status === 'connected' && wasOffline.current) {
      wasOffline.current = false;
      toast(t('common.reconnected'), 'success', { icon: 'wifi' });
    }
  }, [status, stage, t]);

  if (exitReason) return <ExitNotice code={code} reason={exitReason} />;

  if (stage === 'resuming' || (stage === 'in-room' && !view)) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-3">
        <Spinner className="size-12 text-blue" />
        <p className="text-pen -rotate-2 text-[1.6rem]">{status === 'connected' ? t('common.loading') : t('common.connecting')}</p>
      </div>
    );
  }

  if (stage === 'join' || !view) return <JoinByLink code={code} notice={joinNotice} />;

  return (
    <>
      <PhaseSwitch view={view} />
      <ReactionsLayer />
      <ReactionBar />
      <OfflineBanner show={status !== 'connected'} />
    </>
  );
}

/** Screens play their own entrance sounds (reveal drum roll, results fanfare); only voting needs one here. */
const PHASE_SOUNDS: Partial<Record<Phase, Parameters<typeof sfx.play>[0]>> = {
  voting: 'whoosh',
};

function PhaseSwitch({ view }: { view: RoomView }) {
  const prevPhase = useRef(view.phase);
  useEffect(() => {
    if (prevPhase.current !== view.phase) {
      const s = PHASE_SOUNDS[view.phase];
      if (s) sfx.play(s);
      prevPhase.current = view.phase;
      // Each phase starts at its top (the host may have scrolled down to the lobby settings).
      window.scrollTo({ top: 0, behavior: 'instant' });
    }
  }, [view.phase]);

  return (
    <AnimatePresence mode="wait">
      {/* Opacity only: a transform here would re-anchor every screen's position:fixed BottomBar mid-transition. */}
      <motion.div
        key={view.phase}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
      >
        {view.phase === 'lobby' && <LobbyScreen view={view} />}
        {view.phase === 'voting' && <VotingScreen view={view} />}
        {view.phase === 'reveal' && <RevealScreen view={view} />}
        {view.phase === 'results' && <ResultsScreen view={view} />}
      </motion.div>
    </AnimatePresence>
  );
}

function OfflineBanner({ show }: { show: boolean }) {
  const t = useT();
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          className="fixed inset-x-0 top-[calc(max(0.5rem,env(safe-area-inset-top))_+_4.25rem)] z-[65] flex justify-center px-4"
          initial={{ y: -30, opacity: 0, rotate: -6 }}
          animate={{ y: 0, opacity: 1, rotate: -1.5 }}
          exit={{ y: -30, opacity: 0 }}
        >
          <TornPaper surface="red" edges="tblr" amp={2.5} lift className="flex items-center gap-2.5 px-5 py-2.5 font-bold text-white">
            <Spinner className="size-5" />
            {t('common.offline')}
          </TornPaper>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/** The rubber stamp of each way out of a room (kept here: only this notice uses them). */
const EXIT_STAMP: Record<Exclude<ExitReason, null>, { tone: RubberStampTone; text: Record<Lang, string> }> = {
  kicked: { tone: 'red', text: { fr: 'Viré·e !', en: 'Kicked out' } },
  replaced: { tone: 'blue', text: { fr: 'Ailleurs', en: 'Elsewhere' } },
  'room-gone': { tone: 'ink', text: { fr: 'Fermé', en: 'Closed' } },
};

/** Exported for the dev gallery. */
export function ExitNotice({ code, reason }: { code: string; reason: Exclude<ExitReason, null> }) {
  const { t, lang } = useI18n();
  const [busy, setBusy] = useState(false);
  const content = {
    kicked: { title: t('common.roomScreen.kickedTitle'), body: t('common.roomScreen.kickedBody', { code }) },
    replaced: { title: t('common.roomScreen.replacedTitle'), body: t('common.roomScreen.replacedBody') },
    'room-gone': { title: t('common.roomScreen.goneTitle'), body: t('common.roomScreen.goneBody', { code }) },
  }[reason];
  const stamp = EXIT_STAMP[reason];

  return (
    <div className="flex min-h-dvh items-center justify-center px-5 pt-20 pb-10">
      <NotebookCard slap tilt={-1.5} tape="yellow" wrapperClassName="w-full max-w-sm" className="px-6 pt-9 pb-8 pl-10 text-center">
        <RubberStamp tone={stamp.tone} size="md" tilt={-8} animate={0.25} className="mb-5">
          {stamp.text[lang]}
        </RubberStamp>
        <h1 className="font-display text-[1.9rem] leading-[1.02]">{content.title}</h1>
        <p className="mt-3 mb-7 font-medium text-ink-soft">{content.body}</p>
        <div className="flex flex-col gap-4">
          {reason === 'replaced' && (
            <Button
              size="lg"
              block
              loading={busy}
              onClick={async () => {
                setBusy(true);
                const res = await api.takeBack(code);
                setBusy(false);
                if (!res.ok) toast(errorText(t, res.error), 'error');
              }}
            >
              {t('common.roomScreen.useHere')}
            </Button>
          )}
          <Button
            variant={reason === 'replaced' ? 'secondary' : 'primary'}
            size="lg"
            block
            onClick={() => {
              api.clearExitReason();
              navigate('/');
            }}
          >
            {t('common.backHome')}
          </Button>
        </div>
      </NotebookCard>
    </div>
  );
}
