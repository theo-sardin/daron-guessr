import { AnimatePresence, motion } from 'motion/react';
import { useId, useRef, useState, type Ref } from 'react';
import { AVATARS, MAX_NAME_LENGTH } from '../../../shared/protocol';
import { AvatarPicker } from '../../components/AvatarPicker';
import { Spinner } from '../../components/Spinner';
import { useT } from '../../i18n';
import { sfx } from '../../lib/sfx';
import { cn } from '../../lib/util';
import { FieldError } from './FieldError';
import { EMOJI_FONT, hasFinePointer } from './helpers';
import type { useSelfie } from './selfie';

export type SelfieState = ReturnType<typeof useSelfie>;

/**
 * Name + avatar (+ optional selfie) fields shared by the home screen and the join-by-link screen.
 * The avatar is a big tappable bubble that unfolds the picker below the name; the little camera
 * sticker on it adds your face (the bubble then shows the selfie, the emoji rides on its rim).
 */
export function ProfileFields({
  name,
  onNameChange,
  avatar,
  onAvatarChange,
  selfie,
  error,
  shakeRef,
  inputRef,
  onEnter,
  enterKeyHint = 'go',
}: {
  name: string;
  onNameChange: (name: string) => void;
  avatar: string;
  onAvatarChange: (avatar: string) => void;
  selfie: SelfieState;
  /** Validation message shown under the name (the field shakes when it is set). */
  error: string | null;
  /** Element that shakes on error (from useFieldError). */
  shakeRef: Ref<HTMLDivElement>;
  inputRef?: Ref<HTMLInputElement>;
  onEnter?: () => void;
  enterKeyHint?: 'go' | 'done' | 'next';
}) {
  const t = useT();
  const [pickerOpen, setPickerOpen] = useState(false);
  const inputId = useId();
  const errorId = useId();
  const pickerId = useId();
  const noteId = useId();
  const cameraBtn = useRef<HTMLButtonElement>(null);
  const cameraInput = useRef<HTMLInputElement>(null);
  const libraryInput = useRef<HTMLInputElement>(null);
  const [finePointer] = useState(hasFinePointer);
  const length = Array.from(name).length;
  const face = selfie.selfie;
  const cameraLabel = face ? t('home.selfie.change') : t('home.selfie.add');

  const randomize = () => {
    const others = AVATARS.filter((a) => a !== avatar);
    onAvatarChange(others[Math.floor(Math.random() * others.length)]);
    sfx.play('pop');
  };

  const onFile = (input: HTMLInputElement) => {
    const file = input.files?.[0];
    // Reset so picking the same file again still fires `change`.
    input.value = '';
    void selfie.pick(file);
  };

  const removeSelfie = () => {
    sfx.play('pop');
    selfie.remove();
    // The Remove button is gone: land on the camera sticker instead of nowhere.
    cameraBtn.current?.focus();
  };

  return (
    <div>
      <div className="flex items-center gap-3">
        <div className="relative shrink-0">
          <motion.button
            type="button"
            onClick={() => {
              sfx.play('pop');
              setPickerOpen((o) => !o);
            }}
            whileHover={{ rotate: -6, scale: 1.05 }}
            whileTap={{ scale: 0.9 }}
            aria-label={t('home.profile.changeAvatar')}
            aria-expanded={pickerOpen}
            aria-controls={pickerId}
            title={t('home.profile.changeAvatar')}
            className="relative flex size-16 items-center justify-center rounded-full border-3 border-ink bg-sun shadow-pop-sm"
          >
            <span className="absolute inset-0 flex items-center justify-center overflow-hidden rounded-full">
              <AnimatePresence mode="popLayout" initial={false}>
                {face ? (
                  <motion.img
                    key={face.slice(-24)}
                    src={face}
                    alt={t('home.selfie.alt')}
                    draggable={false}
                    className="size-full object-cover"
                    initial={{ scale: 0.3, rotate: -30, opacity: 0 }}
                    animate={{ scale: 1, rotate: 0, opacity: 1 }}
                    exit={{ scale: 0.3, opacity: 0 }}
                    transition={{ type: 'spring', stiffness: 480, damping: 18 }}
                  />
                ) : (
                  <motion.span
                    key={avatar}
                    className="text-4xl leading-none select-none"
                    style={EMOJI_FONT}
                    initial={{ scale: 0, rotate: -40 }}
                    animate={{ scale: 1, rotate: 0 }}
                    exit={{ scale: 0, rotate: 40 }}
                    transition={{ type: 'spring', stiffness: 520, damping: 18 }}
                    aria-hidden
                  >
                    {avatar}
                  </motion.span>
                )}
              </AnimatePresence>
            </span>
            {/* With a selfie, the emoji rides on the rim (it is still the player's sticker). */}
            <AnimatePresence>
              {face && (
                <motion.span
                  key={avatar}
                  className="absolute -bottom-1 -left-1.5 flex size-7 items-center justify-center rounded-full border-2 border-ink bg-sun text-sm leading-none shadow-pop-sm"
                  style={EMOJI_FONT}
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  exit={{ scale: 0 }}
                  transition={{ type: 'spring', stiffness: 600, damping: 16 }}
                  aria-hidden
                >
                  {avatar}
                </motion.span>
              )}
            </AnimatePresence>
            <span
              className={cn(
                'absolute -right-1 -bottom-1 flex size-7 items-center justify-center rounded-full border-2 border-ink text-sm shadow-pop-sm transition-colors',
                pickerOpen ? 'bg-mint' : 'bg-white',
              )}
              aria-hidden
            >
              {pickerOpen ? '✓' : '✏️'}
            </span>
          </motion.button>

          {/* The selfie camera, a little sticker on the bubble's top-right. */}
          <motion.button
            ref={cameraBtn}
            type="button"
            onClick={() => cameraInput.current?.click()}
            disabled={selfie.busy}
            whileHover={{ rotate: 12, scale: 1.1 }}
            whileTap={{ scale: 0.85 }}
            initial={{ rotate: 8 }}
            animate={{ rotate: 8 }}
            aria-label={cameraLabel}
            aria-describedby={noteId}
            title={cameraLabel}
            className={cn(
              'absolute -top-2 -right-2.5 z-10 flex size-9 items-center justify-center rounded-full border-2 border-ink text-base leading-none shadow-pop-sm transition-colors',
              face ? 'bg-white' : 'bg-sky',
            )}
          >
            {selfie.busy ? (
              <Spinner className="size-4 text-ink" />
            ) : (
              <span style={EMOJI_FONT} aria-hidden>
                📷
              </span>
            )}
          </motion.button>
          <input
            ref={cameraInput}
            type="file"
            accept="image/*"
            capture="user"
            aria-label={cameraLabel}
            // Driven by the camera sticker / "or pick a photo": no duplicate for screen readers.
            aria-hidden
            tabIndex={-1}
            className="sr-only"
            onChange={(e) => onFile(e.currentTarget)}
          />
          <input
            ref={libraryInput}
            type="file"
            accept="image/*"
            aria-label={t('home.selfie.pickLabel')}
            aria-hidden
            tabIndex={-1}
            className="sr-only"
            onChange={(e) => onFile(e.currentTarget)}
          />
        </div>

        <div ref={shakeRef} className="min-w-0 flex-1">
          <label htmlFor={inputId} className="sr-only">
            {t('home.profile.nameLabel')}
          </label>
          <div className="relative">
            <input
              id={inputId}
              ref={inputRef}
              value={name}
              onChange={(e) => onNameChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
                  e.preventDefault();
                  onEnter?.();
                }
              }}
              maxLength={MAX_NAME_LENGTH}
              placeholder={t('home.profile.namePlaceholder')}
              autoComplete="nickname"
              autoCorrect="off"
              spellCheck={false}
              enterKeyHint={enterKeyHint}
              aria-invalid={error ? true : undefined}
              aria-describedby={error ? errorId : undefined}
              className={cn(
                'h-14 w-full rounded-2xl border-3 bg-white pr-12 pl-4 font-display text-xl tracking-wide text-ink shadow-pop-sm outline-none',
                'placeholder:font-sans placeholder:text-base placeholder:font-bold placeholder:tracking-normal placeholder:text-ink/35',
                'transition-colors focus:border-pink focus-visible:outline-none',
                error ? 'border-danger bg-danger/5' : 'border-ink',
              )}
            />
            <span
              className={cn(
                'pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-xs font-extrabold tabular-nums transition-opacity',
                length >= MAX_NAME_LENGTH - 3 ? 'text-pink-dark opacity-100' : 'opacity-0',
              )}
              aria-hidden
            >
              {length}/{MAX_NAME_LENGTH}
            </span>
          </div>
        </div>
      </div>

      <FieldError id={errorId} message={error} />

      {/* Why the selfie; "Remove" once there is one ("or pick a photo" on phones, whose camera button opens the camera). */}
      <div className="mt-3 flex min-h-9 items-center gap-2">
        <p id={noteId} className="min-w-0 flex-1 text-sm leading-snug font-bold text-balance text-ink-soft" aria-live="polite">
          {selfie.busy ? t('home.selfie.processing') : face ? t('home.selfie.done') : t('home.selfie.why')}
        </p>
        {face ? (
          <motion.button
            type="button"
            whileTap={{ scale: 0.9 }}
            onClick={removeSelfie}
            disabled={selfie.busy}
            aria-label={t('home.selfie.removeLabel')}
            className="flex h-9 shrink-0 items-center gap-1 rounded-xl border-2 border-ink bg-white px-2.5 text-sm font-extrabold text-ink shadow-pop-sm"
          >
            <span style={EMOJI_FONT} aria-hidden>
              🗑️
            </span>
            {t('home.selfie.remove')}
          </motion.button>
        ) : (
          !finePointer && (
            <button
              type="button"
              onClick={() => libraryInput.current?.click()}
              disabled={selfie.busy}
              className="min-h-9 shrink-0 px-1 text-sm font-extrabold text-pink-dark underline decoration-2 underline-offset-4"
            >
              {t('home.selfie.pick')}
            </button>
          )
        )}
      </div>

      <AnimatePresence initial={false}>
        {pickerOpen && (
          <motion.div
            id={pickerId}
            key="picker"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 380, damping: 34 }}
            className="overflow-hidden"
          >
            <div className="pt-4">
              <div className="mb-2 flex items-center justify-between gap-2">
                <p className="font-display text-lg">{t('home.profile.avatarTitle')}</p>
                <div className="flex gap-2">
                  <motion.button
                    type="button"
                    whileTap={{ scale: 0.9, rotate: 90 }}
                    onClick={randomize}
                    className="flex h-11 items-center gap-1 rounded-xl border-2 border-ink bg-lilac px-3 text-sm font-extrabold shadow-pop-sm"
                  >
                    <span aria-hidden>🎲</span> {t('home.profile.randomAvatar')}
                  </motion.button>
                  <motion.button
                    type="button"
                    whileTap={{ scale: 0.9 }}
                    onClick={() => setPickerOpen(false)}
                    className="flex h-11 items-center rounded-xl border-2 border-ink bg-mint px-3 text-sm font-extrabold shadow-pop-sm"
                  >
                    {t('home.profile.done')}
                  </motion.button>
                </div>
              </div>
              <AvatarPicker value={avatar} onChange={onAvatarChange} className="pb-1" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
