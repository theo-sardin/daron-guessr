import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useRef, useState } from 'react';
import { isValidRoomCode, ROOM_CODE_LENGTH, sanitizeName, THEME_DEFAULT_PHOTOS, type RoomSetup, type Theme } from '../../../shared/protocol';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
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
import { CodeInput } from './CodeInput';
import { FieldError } from './FieldError';
import { useDesktopAutoFocus, useFieldError, useProfileState, viewportOrigin, waitForConnection } from './helpers';
import { Hero, HowItWorks } from './Hero';
import { ModeConfirmBar, ModeStep } from './ModeStep';
import { ProfileFields } from './ProfileFields';
import { SeatedBanner } from './SeatedBanner';

type Action = 'create' | 'join';
type Busy = Action | 'leave' | null;
type Step = 'form' | 'mode';

/** `history.state` marker of the mode step, so the phone's back button closes it. */
const MODE_STATE_KEY = 'dgHomeStep';
const isModeEntry = () => (window.history.state as Record<string, unknown> | null)?.[MODE_STATE_KEY] === 'mode';

/**
 * Route "/": pick a name + avatar, then join a room with a code, or create one. Creating goes
 * through a mandatory second step where the host picks the game mode.
 * `initialStep` / `initialTheme` are for the dev previews.
 */
export function HomeScreen({ initialStep = 'form', initialTheme }: { initialStep?: Step; initialTheme?: Theme } = {}) {
  const { t, tpick } = useI18n();
  const session = useStore((s) => s.session);
  const { name, setName, avatar, setAvatar } = useProfileState();
  const nameField = useFieldError<HTMLDivElement>();
  const codeField = useFieldError<HTMLDivElement>();
  const nameInput = useRef<HTMLInputElement>(null);
  const codeInput = useRef<HTMLInputElement>(null);
  const createBtn = useRef<HTMLButtonElement>(null);
  const confirmBtn = useRef<HTMLButtonElement>(null);
  const joinBtn = useRef<HTMLButtonElement>(null);
  const [code, setCode] = useState('');
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
    if (step !== 'mode') return;
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
    // Every pick resets the photo count to the mode's default (still editable).
    setPhotos(THEME_DEFAULT_PHOTOS[next]);
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
      burst({ ...viewportOrigin(action === 'create' ? confirmBtn.current : joinBtn.current), particleCount: 90 });
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
    const setup: RoomSetup = { theme, photosPerPlayer: photos };
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
    toast(t('home.seated.left', { code: left }), 'info', { emoji: '👋' });
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
      <div className="grid">
        <motion.div
          className={cn('grid items-start gap-7 [grid-area:1/1] lg:grid-cols-2 lg:gap-14', formGone && 'hidden')}
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
          <div className="flex flex-col gap-7 lg:sticky lg:top-24 lg:pt-4">
            <Hero />
            <HowItWorks />
          </div>

          <div className="mx-auto flex w-full max-w-md flex-col">
            <Card
              initial={{ opacity: 0, y: 40, rotate: 2 }}
              animate={{ opacity: 1, y: 0, rotate: 0 }}
              transition={{ type: 'spring', stiffness: 260, damping: 20, delay: 0.15 }}
            >
              <h2 className="mb-3 font-display text-2xl leading-none">
                {t('home.profile.title')}{' '}
                <motion.span
                  className="inline-block origin-[70%_70%]"
                  animate={{ rotate: [0, 18, -8, 18, 0] }}
                  transition={{ duration: 1.1, delay: 1, repeat: Infinity, repeatDelay: 3 }}
                  aria-hidden
                >
                  👋
                </motion.span>
              </h2>
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
                onEnter={onNameEnter}
              />
            </Card>

            <motion.div
              className="mt-6"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ type: 'spring', stiffness: 320, damping: 16, delay: 0.3 }}
            >
              <Button
                ref={createBtn}
                variant="primary"
                size="xl"
                block
                disabled={busy !== null}
                sound={false}
                onClick={() => submit('create')}
                icon={<span aria-hidden>🎉</span>}
              >
                {t('home.actions.create')}
              </Button>
              <p className="mt-2.5 text-center text-sm font-bold text-grape-200">{t('home.actions.createHint')}</p>
            </motion.div>

            <div className="my-4 flex items-center gap-3" aria-hidden>
              <span className="h-0.5 flex-1 rounded-full bg-white/15" />
              <span className="font-display text-lg tracking-widest text-grape-300 uppercase">{t('home.actions.or')}</span>
              <span className="h-0.5 flex-1 rounded-full bg-white/15" />
            </div>

            <Card
              tone="lilac"
              initial={{ opacity: 0, y: 40, rotate: -2 }}
              animate={{ opacity: 1, y: 0, rotate: 0 }}
              transition={{ type: 'spring', stiffness: 260, damping: 20, delay: 0.4 }}
            >
              <div className="mb-3 flex items-center gap-3">
                <span className="text-4xl leading-none" aria-hidden>
                  🔑
                </span>
                <div className="min-w-0">
                  <h2 className="font-display text-2xl leading-tight">{t('home.actions.joinTitle')}</h2>
                  <p className="text-sm font-bold text-ink-soft">{t('home.actions.joinSub')}</p>
                </div>
              </div>
              <div ref={codeField.scope}>
                <CodeInput
                  value={code}
                  onChange={onCodeChange}
                  onSubmit={() => submit('join')}
                  label={t('home.actions.codeLabel')}
                  invalid={Boolean(codeField.error)}
                  inputRef={codeInput}
                  describedBy={codeField.error ? 'home-code-error' : undefined}
                />
              </div>
              <FieldError id="home-code-error" message={codeField.error} className="text-center" />
              <Button
                ref={joinBtn}
                variant="sun"
                size="lg"
                block
                className="mt-4"
                loading={busy === 'join'}
                disabled={busy !== null && busy !== 'join'}
                onClick={() => submit('join')}
                icon={<span aria-hidden>🚪</span>}
              >
                {t('home.actions.join')}
              </Button>
            </Card>
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
              theme={theme}
              photos={photos}
              onTheme={pickTheme}
              onPhotos={pickPhotos}
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
