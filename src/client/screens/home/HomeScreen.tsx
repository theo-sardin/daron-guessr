import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useRef, useState } from 'react';
import { isValidRoomCode, ROOM_CODE_LENGTH, sanitizeName, THEME_DEFAULT_BLUR, THEME_DEFAULT_PHOTOS, type RoomSetup, type Theme } from '../../../shared/protocol';
import { Button } from '../../components/Button';
import { ScreenShell } from '../../components/Layout';
import { ConfirmDialog } from '../../components/Modal';
import { toast } from '../../components/Toast';
import { useI18n } from '../../i18n';
import { burst } from '../../lib/confetti';
import { errorText } from '../../lib/errors';
import { navigate, roomPath } from '../../lib/router';
import { saveProfile } from '../../lib/session';
import { sfx } from '../../lib/sfx';
import { api, useStore } from '../../lib/store';
import { cn, vibrate } from '../../lib/util';
import { useDesktopAutoFocus, useFieldError, useProfileState, viewportOrigin, waitForConnection } from './helpers';
import { Hero, HowItWorks } from './Hero';
import { JoinCode } from './JoinCode';
import { ModeConfirmBar, ModeStep } from './ModeStep';
import { ProfileFields } from './ProfileFields';
import { SeatedBanner } from './SeatedBanner';
import { uploadStoredSelfie, useSelfie } from './selfie';

type Action = 'create' | 'join';
type Busy = Action | 'leave' | null;
type Step = 'form' | 'mode';

/** `history.state` marker of the mode step, so the phone's back button closes it. */
const MODE_STATE_KEY = 'dgHomeStep';
const isModeEntry = () => (window.history.state as Record<string, unknown> | null)?.[MODE_STATE_KEY] === 'mode';
/** Removes the marker from the current history entry (same URL, rest of the state kept). */
const clearModeEntry = () => {
  try {
    const state = { ...(window.history.state as Record<string, unknown> | null) };
    delete state[MODE_STATE_KEY];
    window.history.replaceState(state, '', window.location.href);
  } catch {
    // ignore
  }
};

/**
 * Route "/": the zine's cover (collage, logo, how it works), then pick a name + avatar (+ an
 * optional selfie) and create a room or join one with a code. Creating goes through a mandatory
 * second step where the host picks the game mode.
 * `initialStep` / `initialTheme` / `initialCode` are for the dev previews.
 */
export function HomeScreen({ initialStep = 'form', initialTheme, initialCode = '' }: { initialStep?: Step; initialTheme?: Theme; initialCode?: string } = {}) {
  const { t, tpick } = useI18n();
  const session = useStore((s) => s.session);
  const { name, setName, avatar, setAvatar } = useProfileState();
  const selfie = useSelfie(t('home.selfie.unreadable'));
  const nameField = useFieldError<HTMLDivElement>();
  const codeField = useFieldError<HTMLDivElement>();
  const nameInput = useRef<HTMLInputElement>(null);
  const codeInput = useRef<HTMLInputElement>(null);
  const createBtn = useRef<HTMLButtonElement>(null);
  const confirmBtn = useRef<HTMLButtonElement>(null);
  const joinBtn = useRef<HTMLButtonElement>(null);
  const [code, setCode] = useState(initialCode);
  const [busy, setBusy] = useState<Busy>(null);
  const busyRef = useRef(false);
  /** Action waiting for "leave your current room first?" confirmation. */
  const [pending, setPending] = useState<{ action: Action; code: string; setup?: RoomSetup } | null>(null);
  const misses = useRef(0);
  const [step, setStep] = useState<Step>(initialStep);
  /** The form stays mounted (no replayed intro) but leaves the layout once it has slid away. */
  const [formGone, setFormGone] = useState(initialStep === 'mode');
  const formScroll = useRef(0);
  // Nothing preselected: picking a mode is the point of the step.
  const [theme, setTheme] = useState<Theme | null>(initialTheme ?? null);
  const [photos, setPhotos] = useState(initialTheme ? THEME_DEFAULT_PHOTOS[initialTheme] : 2);
  const [blur, setBlur] = useState(initialTheme ? THEME_DEFAULT_BLUR[initialTheme] : false);
  // Returning to "/" while seated: the banner matters more than the form.
  useDesktopAutoFocus(nameInput, session === null);

  const checkName = (): string | null => {
    const clean = sanitizeName(name);
    if (clean) return clean;
    nameField.flag(tpick('home.profile.nameMissing', misses.current++));
    nameInput.current?.focus();
    return null;
  };

  const checkCode = (value: string): boolean => {
    if (value.length < ROOM_CODE_LENGTH) {
      codeField.flag(t('home.actions.codeIncomplete'));
      codeInput.current?.focus();
      return false;
    }
    if (!isValidRoomCode(value)) {
      codeField.flag(t('home.actions.codeInvalid'));
      return false;
    }
    return true;
  };

  const openMode = () => {
    formScroll.current = window.scrollY;
    sfx.play('whoosh');
    setStep('mode');
    try {
      window.history.pushState({ ...(window.history.state as object | null), [MODE_STATE_KEY]: 'mode' }, '', window.location.href);
    } catch {
      // ignore: the Back button still works
    }
  };

  const closeMode = () => {
    setFormGone(false);
    setStep('form');
  };

  const back = () => {
    if (busyRef.current) return;
    // Pops our history entry; the popstate listener below closes the step.
    if (isModeEntry()) window.history.back();
    else closeMode();
  };

  // The phone's back button (or the browser's) closes the mode step instead of leaving the site.
  useEffect(() => {
    if (step !== 'mode') {
      // A marker under the form is stale (a reload on the mode step, or "forward" into it). Left
      // there, the next Back would land on it and leave the step open: drop it.
      if (isModeEntry()) clearModeEntry();
      const onFormPop = () => {
        if (isModeEntry()) clearModeEntry();
      };
      window.addEventListener('popstate', onFormPop);
      return () => window.removeEventListener('popstate', onFormPop);
    }
    const onPop = () => {
      if (!isModeEntry()) closeMode();
    };
    window.addEventListener('popstate', onPop);
    // We restore the form's scroll ourselves, once the step has slid away.
    const restoration = window.history.scrollRestoration;
    window.history.scrollRestoration = 'manual';
    return () => {
      window.removeEventListener('popstate', onPop);
      window.history.scrollRestoration = restoration;
    };
  }, [step]);

  const pickTheme = (next: Theme) => {
    sfx.play('pop');
    vibrate(12);
    setTheme(next);
    // Every pick resets the photo count and the blur to the mode's defaults (still editable).
    setPhotos(THEME_DEFAULT_PHOTOS[next]);
    setBlur(THEME_DEFAULT_BLUR[next]);
  };

  const toggleBlur = (on: boolean) => {
    sfx.play('pop');
    vibrate(8);
    setBlur(on);
  };

  const pickPhotos = (n: number) => {
    if (n === photos) return;
    sfx.play('pop');
    vibrate(8);
    setPhotos(n);
  };

  const run = async (action: Action, cleanName: string, joinCode: string, setup?: RoomSetup) => {
    if (busyRef.current) return;
    busyRef.current = true;
    setBusy(action);
    if (cleanName !== name) setName(cleanName);
    saveProfile({ name: cleanName, avatar });
    await waitForConnection();
    const res = action === 'create' ? await api.createRoom(cleanName, avatar, setup) : await api.joinRoom(joinCode, cleanName, avatar);
    if (res.ok) {
      // Stay "busy" until the route changes so nothing can fire twice.
      sfx.play('join');
      burst({ ...viewportOrigin(action === 'create' ? confirmBtn.current : (joinBtn.current ?? codeInput.current)), particleCount: 90 });
      // The selfie follows in the background: the room never waits for it.
      void uploadStoredSelfie(t('home.selfie.uploadFailed'));
      // The room takes the mode step's history entry: "back" from the room lands on the form.
      navigate(roomPath(res.session.code), { replace: isModeEntry() });
      return;
    }
    busyRef.current = false;
    setBusy(null);
    toast(errorText(t, res.error), 'error');
    if (res.error === 'NAME_TAKEN' || res.error === 'INVALID_NAME') {
      if (step === 'mode') back();
      nameField.flag(errorText(t, res.error));
    }
    if (action === 'join' && (res.error === 'ROOM_NOT_FOUND' || res.error === 'ROOM_FULL' || res.error === 'GAME_IN_PROGRESS')) {
      codeField.flag(errorText(t, res.error));
    }
  };

  const submit = (action: Action, joinCode = code) => {
    if (busyRef.current) return;
    if (action === 'join' && !checkCode(joinCode)) return;
    const clean = checkName();
    if (!clean) return;
    if (action === 'create') {
      if (clean !== name) setName(clean);
      openMode();
      return;
    }
    if (session) {
      setPending({ action, code: joinCode });
      return;
    }
    void run(action, clean, joinCode);
  };

  const confirmCreate = () => {
    if (busyRef.current || !theme) return;
    const clean = sanitizeName(name);
    if (!clean) {
      back();
      nameField.flag(tpick('home.profile.nameMissing', misses.current++));
      return;
    }
    const setup: RoomSetup = { theme, photosPerPlayer: photos, blur };
    if (session) {
      setPending({ action: 'create', code: '', setup });
      return;
    }
    void run('create', clean, '', setup);
  };

  const onCodeChange = (next: string) => {
    if (next !== code) codeField.clear();
    setCode(next);
    // Joins as soon as the 4th letter lands (typed or pasted).
    if (next.length === ROOM_CODE_LENGTH && next !== code) {
      if (isValidRoomCode(next)) submit('join', next);
      else codeField.flag(t('home.actions.codeInvalid'));
    }
  };

  const onNameEnter = () => {
    if (code.length === ROOM_CODE_LENGTH) submit('join');
    else if (code.length > 0) codeInput.current?.focus();
    else submit('create');
  };

  const leave = async () => {
    if (busyRef.current || !session) return;
    busyRef.current = true;
    setBusy('leave');
    const left = session.code;
    await api.leave();
    busyRef.current = false;
    setBusy(null);
    toast(t('home.seated.left', { code: left }), 'info', { icon: 'leave' });
  };

  const confirmSwitch = async () => {
    const next = pending;
    setPending(null);
    if (!next || busyRef.current) return;
    busyRef.current = true;
    setBusy('leave');
    await api.leave();
    busyRef.current = false;
    setBusy(null);
    const clean = sanitizeName(name);
    if (clean) void run(next.action, clean, next.code, next.setup);
  };

  const showBanner = session !== null && busy !== 'create' && busy !== 'join' && step === 'form';
  const onForm = step === 'form';

  return (
    <ScreenShell width="xl" bottomBar={!onForm} className="overflow-x-clip">
      <AnimatePresence>
        {showBanner && (
          <SeatedBanner
            key={session.code}
            code={session.code}
            onBack={() => navigate(roomPath(session.code))}
            onLeave={() => void leave()}
            leaving={busy === 'leave'}
          />
        )}
      </AnimatePresence>

      {/* Both steps share one grid cell, so they slide across each other. */}
      <div className="grid grid-cols-[minmax(0,1fr)]">
        <motion.div
          className={cn('grid min-w-0 grid-cols-[minmax(0,1fr)] items-start gap-6 [grid-area:1/1] sm:gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-14', formGone && 'hidden')}
          inert={!onForm}
          initial={false}
          animate={onForm ? { x: 0, opacity: 1 } : { x: -80, opacity: 0 }}
          transition={onForm ? { type: 'spring', stiffness: 360, damping: 30, delay: 0.16 } : { duration: 0.18, ease: 'easeIn' }}
          onAnimationComplete={() => {
            if (step !== 'mode' || formGone) return;
            setFormGone(true);
            window.scrollTo(0, 0);
          }}
        >
          <div className="flex flex-col gap-7 lg:sticky lg:top-24 lg:pt-2">
            <Hero />
            <HowItWorks />
          </div>

          <div className="mx-auto flex w-full max-w-md flex-col pt-1 lg:self-center lg:pt-0">
            <motion.section
              aria-labelledby="home-profile-title"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 22, delay: 0.25 }}
            >
              <h2 id="home-profile-title" className="sr-only">
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
                onEnter={onNameEnter}
              />
            </motion.section>

            <motion.div
              className="mt-7"
              initial={{ opacity: 0, scale: 0.85, rotate: 3 }}
              animate={{ opacity: 1, scale: 1, rotate: 0 }}
              transition={{ type: 'spring', stiffness: 340, damping: 18, delay: 0.35 }}
            >
              <Button ref={createBtn} variant="primary" size="xl" block tape arrow disabled={busy !== null} sound={false} onClick={() => submit('create')}>
                {t('home.actions.create')}
              </Button>
              <p className="text-pen mt-3 text-center text-[1.1rem] leading-tight text-balance">{t('home.actions.createHint')}</p>
            </motion.div>

            <motion.div
              className="mt-5"
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 22, delay: 0.45 }}
            >
              <JoinCode
                code={code}
                onChange={onCodeChange}
                onSubmit={() => submit('join')}
                error={codeField.error}
                shakeRef={codeField.scope}
                inputRef={codeInput}
                buttonRef={joinBtn}
                loading={busy === 'join'}
                disabled={busy !== null && busy !== 'join'}
              />
            </motion.div>
          </div>
        </motion.div>

        <AnimatePresence
          onExitComplete={() => {
            window.scrollTo(0, formScroll.current);
            createBtn.current?.focus({ preventScroll: true });
          }}
        >
          {step === 'mode' && (
            <ModeStep
              key="mode"
              className="[grid-area:1/1]"
              name={sanitizeName(name) || name}
              avatar={avatar}
              selfie={selfie.selfie}
              theme={theme}
              photos={photos}
              blur={blur}
              onTheme={pickTheme}
              onPhotos={pickPhotos}
              onBlur={toggleBlur}
              onBack={back}
              busy={busy !== null}
            />
          )}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {step === 'mode' && (
          <ModeConfirmBar
            key="mode-bar"
            theme={theme}
            photos={photos}
            blur={blur}
            loading={busy === 'create' || busy === 'leave'}
            onConfirm={confirmCreate}
            buttonRef={confirmBtn}
          />
        )}
      </AnimatePresence>

      <ConfirmDialog
        open={pending !== null}
        title={t('home.seated.switchTitle', { code: session?.code ?? '' })}
        body={t('home.seated.switchBody')}
        confirmLabel={t('home.seated.switchConfirm')}
        danger
        onCancel={() => setPending(null)}
        onConfirm={() => void confirmSwitch()}
      />
    </ScreenShell>
  );
}
