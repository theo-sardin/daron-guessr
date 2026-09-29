import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useRef, useState } from 'react';
import type { Phase, RoomView } from '../../shared/protocol';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { Icon, type IconName } from '../components/Icon';
import { ReactionBar, ReactionsLayer } from '../components/Reactions';
import { Spinner } from '../components/Spinner';
import { toast } from '../components/Toast';
import { Viewfinder } from '../components/Viewfinder';
import { useT } from '../i18n';
import { errorText } from '../lib/errors';
import { navigate } from '../lib/router';
import { sfx } from '../lib/sfx';
import { api, useStore, type ExitReason } from '../lib/store';
import { cn } from '../lib/util';
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
      <div className="flex min-h-dvh flex-col items-center justify-center gap-3 text-grape-200">
        <Spinner className="size-10 text-sun" />
        <p className="font-bold">{status === 'connected' ? t('common.loading') : t('common.connecting')}</p>
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
          className="fixed inset-x-0 top-16 z-[65] flex justify-center px-4"
          initial={{ y: -30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -30, opacity: 0 }}
        >
          <div className="flex items-center gap-2 rounded-full border-3 border-ink bg-danger px-4 py-2 font-bold text-white shadow-pop-sm">
            <Spinner className="size-4" />
            {t('common.offline')}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/** Sticker + icon for each way out of a room. */
const EXIT_LOOK: Record<Exclude<ExitReason, null>, { icon: IconName; bg: string }> = {
  kicked: { icon: 'leave', bg: 'bg-danger' },
  replaced: { icon: 'phone', bg: 'bg-sky' },
  'room-gone': { icon: 'ghost', bg: 'bg-lilac' },
};

/** Exported for the dev gallery. */
export function ExitNotice({ code, reason }: { code: string; reason: Exclude<ExitReason, null> }) {
  const t = useT();
  const [busy, setBusy] = useState(false);
  const content = {
    kicked: { title: t('common.roomScreen.kickedTitle'), body: t('common.roomScreen.kickedBody', { code }) },
    replaced: { title: t('common.roomScreen.replacedTitle'), body: t('common.roomScreen.replacedBody') },
    'room-gone': { title: t('common.roomScreen.goneTitle'), body: t('common.roomScreen.goneBody', { code }) },
  }[reason];
  const look = EXIT_LOOK[reason];

  return (
    <div className="flex min-h-dvh items-center justify-center px-4">
      <Card className="w-full max-w-sm text-center" initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
        <Viewfinder className="mx-auto mt-2 mb-5 w-fit" color="var(--color-ink)" length={14} thickness={3} gap={12} snap={0.1}>
          <motion.span
            className={cn('flex size-20 items-center justify-center rounded-[1.6rem] border-3 border-ink text-ink shadow-pop', look.bg)}
            initial={{ rotate: -16, scale: 0.6 }}
            animate={{ rotate: -5, scale: 1 }}
            transition={{ type: 'spring', stiffness: 380, damping: 14 }}
          >
            <Icon name={look.icon} fill="#fff" className="size-11" strokeWidth={2.1} />
          </motion.span>
        </Viewfinder>
        <h1 className="font-display text-3xl leading-tight">{content.title}</h1>
        <p className="mt-2 mb-5 text-ink-soft">{content.body}</p>
        <div className="flex flex-col gap-3">
          {reason === 'replaced' && (
            <Button
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
            variant="secondary"
            onClick={() => {
              api.clearExitReason();
              navigate('/');
            }}
          >
            {t('common.backHome')}
          </Button>
        </div>
      </Card>
    </div>
  );
}
