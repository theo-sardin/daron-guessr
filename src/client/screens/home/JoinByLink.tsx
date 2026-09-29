import { motion } from 'motion/react';
import { useRef, useState } from 'react';
import { sanitizeName } from '../../../shared/protocol';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { Icon } from '../../components/Icon';
import { IconBadge } from '../../components/IconBadge';
import { BottomBar, ScreenShell, ScreenTitle } from '../../components/Layout';
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
import { usePeek } from './usePeek';

/**
 * Route "/:code" when this browser has no seat in that room: peek at the room, then ask for
 * a name + avatar. Once the join succeeds, RoomScreen adopts the session and takes over.
 */
export function JoinByLink({ code, notice }: { code: string; notice?: string | null }) {
  const { t, tpick } = useI18n();
  const { state, checking, refresh } = usePeek(code);
  const { name, setName, avatar, setAvatar } = useProfileState();
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
      <ScreenTitle sub={<span className="block text-balance">{t('home.join.sub')}</span>}>
        {t('home.join.title')}
      </ScreenTitle>

      <RoomTicket code={code} peek={peek} loading={state.status === 'loading'} />

      {state.status === 'offline' && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-4 flex items-center gap-3 rounded-2xl border-2 border-white/20 bg-white/10 p-3 text-sm font-bold text-cream backdrop-blur"
        >
          <IconBadge name="wifi" tone="ink" size="sm" shadow={false} />
          <p className="min-w-0 flex-1">{t('home.join.offline', { code })}</p>
          <Button variant="ghost" size="sm" loading={checking} onClick={() => refresh()} className="h-11">
            {t('home.join.checkAgain')}
          </Button>
        </motion.div>
      )}

      {notice && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9, rotate: 2 }}
          animate={{ opacity: 1, scale: 1, rotate: 1 }}
          className="mb-4 flex items-start gap-2 rounded-2xl border-3 border-ink bg-tangerine p-3 font-bold text-ink shadow-pop-sm"
          role="status"
        >
          <IconBadge name="alert" tone="cream" size="xs" shadow={false} />
          <p className="min-w-0 pt-0.5 leading-6">{notice}</p>
        </motion.div>
      )}

      <Card
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 260, damping: 20, delay: 0.25 }}
      >
        <h2 className="mb-3 font-display text-2xl leading-none">{t('home.profile.title')}</h2>
        <ProfileFields
          name={name}
          onNameChange={(v) => {
            setName(v);
            nameField.clear();
          }}
          avatar={avatar}
          onAvatarChange={setAvatar}
          error={nameField.error}
          shakeRef={nameField.scope}
          inputRef={nameInput}
          onEnter={() => void join()}
        />
      </Card>

      <div className="mt-5 flex justify-center">
        <button
          type="button"
          onClick={goHome}
          className="min-h-11 rounded-xl px-3 text-sm font-bold text-grape-200 underline decoration-2 underline-offset-4 hover:text-cream"
        >
          {t('home.join.notYourRoom')} {t('common.backHome')}
        </button>
      </div>

      <BottomBar>
        <Button
          ref={joinBtn}
          variant="primary"
          size="xl"
          block
          loading={busy}
          onClick={() => void join()}
          icon={<Icon name="arrow-right" className="size-7" weight="bold" />}
        >
          {t('home.join.button')}
        </Button>
      </BottomBar>
    </ScreenShell>
  );
}
