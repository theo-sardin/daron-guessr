import { AnimatePresence, motion } from 'motion/react';
import { useId, useRef, useState, type Ref } from 'react';
import { AVATARS, MAX_NAME_LENGTH } from '../../../shared/protocol';
import { AvatarPicker } from '../../components/AvatarPicker';
import { Button } from '../../components/Button';
import { Icon } from '../../components/Icon';
import { RoundButton } from '../../components/RoundButton';
import { Spinner } from '../../components/Spinner';
import { useT } from '../../i18n';
import { sfx } from '../../lib/sfx';
import { cn } from '../../lib/util';
import { FieldError } from './FieldError';
import { hasFinePointer } from './helpers';
import type { useSelfie } from './selfie';

/** Paper color of the profile disc (and of the picked sticker in the avatar picker). */
const DISC_COLOR = '#3ddc97';
const DISC_BG = 'var(--color-mint)';

export type SelfieState = ReturnType<typeof useSelfie>;

/**
 * Name + avatar (+ optional selfie) fields shared by the home screen and the join-by-link
 * screen: the avatar disc (tap: the emoji picker unfolds below), a round camera button to add
 * your face, and the red "HELLO! my name is…" name tag holding the nickname field.
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
  const cameraInput = useRef<HTMLInputElement>(null);
  const libraryInput = useRef<HTMLInputElement>(null);
  const [finePointer] = useState(hasFinePointer);
  const length = Array.from(name).length;
  const face = selfie.selfie;

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

  return (
    <div>
      <div className="flex items-center gap-3 min-[375px]:gap-4">
        {/* The disc (emoji or selfie) and its camera button. */}
        <div className="relative shrink-0 pt-1 pr-3">
          <motion.button
            type="button"
            onClick={() => {
              sfx.play('pop');
              setPickerOpen((o) => !o);
            }}
            whileHover={{ rotate: -6, scale: 1.04 }}
            whileTap={{ scale: 0.92 }}
            aria-label={t('home.profile.changeAvatar')}
            aria-expanded={pickerOpen}
            aria-controls={pickerId}
            title={t('home.profile.changeAvatar')}
            className="relative flex size-[5.25rem] items-center justify-center rounded-full"
            style={{ backgroundColor: DISC_BG, border: '6px solid #fff', boxShadow: '0 1px 1px rgb(40 25 10 / 0.25), 0 4px 10px -3px rgb(40 25 10 / 0.4)' }}
          >
            <AnimatePresence mode="popLayout" initial={false}>
              {face ? (
                <motion.img
                  key={face.slice(-24)}
                  src={face}
                  alt={t('home.selfie.alt')}
                  draggable={false}
                  className="size-full rounded-full object-cover"
                  initial={{ scale: 0.4, rotate: -20, opacity: 0 }}
                  animate={{ scale: 1, rotate: 0, opacity: 1 }}
                  exit={{ scale: 0.4, opacity: 0 }}
                  transition={{ type: 'spring', stiffness: 480, damping: 20 }}
                />
              ) : (
                <motion.span
                  key={avatar}
                  className="emoji text-[2.7rem] leading-none select-none"
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
            {/* With a selfie, the emoji rides on the rim (it is still the player's sticker). */}
            {face && (
              <span
                className="emoji absolute -bottom-2 -left-2 flex size-9 items-center justify-center rounded-full border-2 border-white text-lg"
                style={{ backgroundColor: DISC_BG, boxShadow: '0 1px 2px rgb(40 25 10 / 0.3)' }}
                aria-hidden
              >
                {avatar}
              </span>
            )}
            <span
              className={cn(
                'absolute -right-1 -bottom-1 flex size-7 items-center justify-center rounded-full border-2 border-paper text-[#fff6e0] shadow-[0_2px_4px_rgb(0_0_0/0.3)] transition-colors',
                pickerOpen ? 'bg-blue' : 'bg-ink',
              )}
              aria-hidden
            >
              <Icon name={pickerOpen ? 'check' : 'refresh'} className="size-4" weight="bold" />
            </span>
          </motion.button>

          <RoundButton
            label={face ? t('home.selfie.change') : t('home.selfie.add')}
            size={44}
            tilt={8}
            tone="blue"
            filled={!face}
            aria-describedby={noteId}
            disabled={selfie.busy}
            onClick={() => cameraInput.current?.click()}
            className="absolute -top-1 -right-2.5 z-10"
          >
            {selfie.busy ? <Spinner className="size-5" /> : <Icon name="camera" className="size-[1.35rem]" weight="bold" />}
          </RoundButton>
          <input
            ref={cameraInput}
            type="file"
            accept="image/*"
            capture="user"
            aria-label={face ? t('home.selfie.change') : t('home.selfie.add')}
            tabIndex={-1}
            className="sr-only"
            onChange={(e) => onFile(e.currentTarget)}
          />
          <input
            ref={libraryInput}
            type="file"
            accept="image/*"
            aria-label={t('home.selfie.pickLabel')}
            tabIndex={-1}
            className="sr-only"
            onChange={(e) => onFile(e.currentTarget)}
          />
        </div>

        {/* The name tag: "HELLO! my name is…" on red, the nickname written on the white band. */}
        <div ref={shakeRef} className="min-w-0 flex-1">
          <div className="rotate-[1.2deg] rounded-[13px] bg-red px-1.5 pb-2 shadow-[0_1px_1px_rgb(40_25_10/0.2),0_6px_12px_-5px_rgb(40_25_10/0.4)]">
            <label htmlFor={inputId} className="flex h-[2.1rem] items-baseline justify-center gap-2 pt-1.5 text-white">
              <span className="sr-only">{t('home.profile.nameLabel')}</span>
              <span className="font-wide text-[1.05rem] leading-none tracking-[0.04em] max-[374px]:text-[0.9rem]" aria-hidden>
                {t('home.profile.tagHello')}
              </span>
              <span className="text-hand truncate text-[1.25rem] leading-none" aria-hidden>
                {t('home.profile.tagName')}
              </span>
            </label>
            <div
              className={cn(
                'relative rounded-[7px] bg-sheet transition-shadow focus-within:shadow-[inset_0_0_0_3px_var(--color-blue)]',
                error && 'shadow-[inset_0_0_0_3px_var(--color-yellow)]',
              )}
            >
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
                  'h-[3.25rem] w-full -rotate-1 bg-transparent px-3 text-center leading-none text-ink caret-blue outline-none focus-visible:outline-none',
                  'placeholder:font-sans placeholder:text-base placeholder:font-bold placeholder:text-ink/40',
                  length > 11 ? 'text-[1.3rem]' : 'text-[1.7rem]',
                )}
                style={{ fontFamily: 'var(--font-marker)' }}
              />
              <span
                className={cn(
                  'pointer-events-none absolute right-2 bottom-1 font-mono text-[0.7rem] font-bold tabular-nums transition-opacity',
                  length >= MAX_NAME_LENGTH - 3 ? 'text-red-ink opacity-100' : 'opacity-0',
                )}
                aria-hidden
              >
                {length}/{MAX_NAME_LENGTH}
              </span>
            </div>
          </div>
        </div>
      </div>

      <FieldError id={errorId} message={error} />

      {/* Why the selfie, in ballpoint; "remove" once there is one. */}
      <div className="mt-2 flex min-h-11 flex-wrap items-center gap-x-2 pl-1">
        <p id={noteId} className="text-pen min-w-0 flex-1 text-[1.05rem] leading-[1.1] text-balance">
          <Icon name="arrow-left" className="mr-1 inline size-3.5 rotate-45 align-[0.05em]" weight="bold" />
          {selfie.busy ? t('home.selfie.processing') : face ? t('home.selfie.done') : t('home.selfie.why')}
        </p>
        {face ? (
          <Button variant="ghost" size="sm" className="-my-1" onClick={selfie.remove} aria-label={t('home.selfie.removeLabel')} icon={<Icon name="trash" className="size-4" weight="bold" />}>
            {t('home.selfie.remove')}
          </Button>
        ) : (
          !finePointer && (
            <button
              type="button"
              onClick={() => libraryInput.current?.click()}
              disabled={selfie.busy}
              className="text-pen min-h-11 px-1 text-[1.05rem] underline decoration-1 underline-offset-4"
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
            className="-mx-2 overflow-hidden px-2"
          >
            <div className="pt-2 pb-1">
              <div className="mb-2 flex items-center justify-between gap-2">
                <p className="font-display text-lg">{t('home.profile.avatarTitle')}</p>
                <div className="flex gap-2">
                  <Button variant="sky" size="sm" onClick={randomize} icon={<Icon name="dice" className="size-5" />}>
                    {t('home.profile.randomAvatar')}
                  </Button>
                  <Button variant="mint" size="sm" onClick={() => setPickerOpen(false)}>
                    {t('home.profile.done')}
                  </Button>
                </div>
              </div>
              <AvatarPicker value={avatar} onChange={onAvatarChange} color={DISC_COLOR} className="pb-1" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
