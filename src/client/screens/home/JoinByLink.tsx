import { motion } from 'motion/react';
import { useRef, useState } from 'react';
import { sanitizeName } from '../../../shared/protocol';
import { Button } from '../../components/Button';
import { Icon } from '../../components/Icon';
import { BottomBar, ScreenShell, ScreenTitle } from '../../components/Layout';
import { PostIt } from '../../components/Paper';
import { toast } from '../../components/Toast';
import { useI18n } from '../../i18n';
import { burst } from '../../lib/confetti';
import { errorText } from '../../lib/errors';
import { navigate } from '../../lib/router';
import { saveProfile } from '../../lib/session';
import { sfx } from '../../lib/sfx';
import { api } from '../../lib/store';
import { useDesktopAutoFocus, useFieldError, useProfileState, viewportOrigin, waitForConnection } from './helpers';
import { ProfileFields } from './ProfileFields';
import { ProblemCard, RoomTicket, type Problem } from './RoomTicket';
import { uploadStoredSelfie, useSelfie } from './selfie';
import { usePeek } from './usePeek';

/**
 * Route "/:code" when this browser has no seat in that room: peek at the room, then ask for
 * a name + avatar. Once the join succeeds, RoomScreen adopts the session and takes over.
 */
export function JoinByLink({ code, notice }: { code: string; notice?: string | null }) {
  const { t, tpick } = useI18n();
  const { state, checking, refresh } = usePeek(code);
  const { name, setName, avatar, setAvatar } = useProfileState();
  const selfie = useSelfie(t('home.selfie.unreadable'));
  const nameField = useFieldError<HTMLDivElement>();
  const nameInput = useRef<HTMLInputElement>(null);
  const joinBtn = useRef<HTMLButtonElement>(null);
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  const misses = useRef(0);
  useDesktopAutoFocus(nameInput);

  const peek = state.status === 'ok' ? state.peek : null;
  const problem: Problem | null = !peek
    ? null
    : !peek.exists
      ? 'notFound'
      : peek.joinable === false
        ? peek.phase && peek.phase !== 'lobby'
          ? 'inProgress'
          : 'full'
        : null;

  const join = async () => {
    if (busyRef.current) return;
    const clean = sanitizeName(name);
    if (!clean) {
      nameField.flag(tpick('home.profile.nameMissing', misses.current++));
      nameInput.current?.focus();
      return;
    }
    busyRef.current = true;
    setBusy(true);
    if (clean !== name) setName(clean);
    saveProfile({ name: clean, avatar });
    await waitForConnection();
    const res = await api.joinRoom(code, clean, avatar);
    if (res.ok) {
      // RoomScreen switches to the lobby as soon as the session is adopted; stay busy until then.
      sfx.play('join');
      burst({ ...viewportOrigin(joinBtn.current), particleCount: 110 });
      // The selfie follows in the background: the lobby never waits for it.
      void uploadStoredSelfie(t('home.selfie.uploadFailed'));
      return;
    }
    busyRef.current = false;
    setBusy(false);
    toast(errorText(t, res.error), 'error');
    if (res.error === 'NAME_TAKEN' || res.error === 'INVALID_NAME') nameField.flag(errorText(t, res.error));
    if (res.error === 'ROOM_NOT_FOUND' || res.error === 'ROOM_FULL' || res.error === 'GAME_IN_PROGRESS') refresh();
  };

  const goHome = () => navigate('/');

  if (problem) {
    return (
      <ScreenShell width="sm" className="pb-12!">
        <ProblemCard problem={problem} code={code} checking={checking} onRetry={() => refresh()} onHome={goHome} />
      </ScreenShell>
    );
  }

  return (
    <ScreenShell width="sm">
      <ScreenTitle cutout cutoutSize="sm" sub={<span className="text-pen block text-[1.25rem] leading-tight text-balance">{t('home.join.sub')}</span>}>
        {t('home.join.title')}
      </ScreenTitle>

      <RoomTicket code={code} peek={peek} loading={state.status === 'loading'} />

      {state.status === 'offline' && (
        <PostIt color="pink" tilt={1} slap tape="cream" wrapperClassName="mb-5" className="flex items-center gap-3 px-3.5 pt-3.5 pb-3">
          <Icon name="wifi" className="size-6 shrink-0" />
          <p className="min-w-0 flex-1 text-sm leading-snug font-bold">{t('home.join.offline', { code })}</p>
          <Button variant="outline" size="sm" loading={checking} onClick={() => refresh()} className="shrink-0">
            {t('home.join.checkAgain')}
          </Button>
        </PostIt>
      )}

      {notice && (
        <PostIt tilt={-1} slap tape="cream" wrapperClassName="mb-5" className="flex items-start gap-2 px-3.5 pt-3.5 pb-3 font-bold" role="status">
          <Icon name="alert" className="mt-0.5 size-5 shrink-0" weight="bold" />
          <p className="min-w-0 leading-6">{notice}</p>
        </PostIt>
      )}

      <motion.section
        aria-labelledby="join-profile-title"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 260, damping: 20, delay: 0.25 }}
        className="mt-2"
      >
        <h2 id="join-profile-title" className="sr-only">
          {t('home.profile.title')}
        </h2>
        <ProfileFields
          name={name}
          onNameChange={(v) => {
            setName(v);
            nameField.clear();
          }}
          avatar={avatar}
          onAvatarChange={setAvatar}
          selfie={selfie}
          error={nameField.error}
          shakeRef={nameField.scope}
          inputRef={nameInput}
          onEnter={() => void join()}
        />
      </motion.section>

      <div className="mt-6 flex justify-center">
        <button type="button" onClick={goHome} className="text-pen min-h-11 px-3 text-[1.15rem] underline decoration-1 underline-offset-4 hover:text-ink">
          {t('home.join.notYourRoom')} {t('common.backHome')}
        </button>
      </div>

      <BottomBar>
        <Button ref={joinBtn} variant="primary" size="xl" block arrow tape loading={busy} onClick={() => void join()}>
          {t('home.join.button')}
        </Button>
      </BottomBar>
    </ScreenShell>
  );
}
