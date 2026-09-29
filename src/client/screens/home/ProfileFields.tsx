import { AnimatePresence, motion } from 'motion/react';
import { useId, useState, type Ref } from 'react';
import { AVATARS, MAX_NAME_LENGTH } from '../../../shared/protocol';
import { AvatarPicker } from '../../components/AvatarPicker';
import { Icon } from '../../components/Icon';
import { useT } from '../../i18n';
import { sfx } from '../../lib/sfx';
import { cn } from '../../lib/util';
import { FieldError } from './FieldError';

/**
 * Name + avatar fields shared by the home screen and the join-by-link screen.
 * The avatar is a big tappable bubble that unfolds the picker below the name.
 */
export function ProfileFields({
  name,
  onNameChange,
  avatar,
  onAvatarChange,
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
  const length = Array.from(name).length;

  const randomize = () => {
    const others = AVATARS.filter((a) => a !== avatar);
    onAvatarChange(others[Math.floor(Math.random() * others.length)]);
    sfx.play('pop');
  };

  return (
    <div>
      <div className="flex items-center gap-3">
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
          className="relative flex size-16 shrink-0 items-center justify-center rounded-full border-3 border-ink bg-sun shadow-pop-sm"
        >
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.span
              key={avatar}
              className="text-4xl leading-none select-none"
              initial={{ scale: 0, rotate: -40 }}
              animate={{ scale: 1, rotate: 0 }}
              exit={{ scale: 0, rotate: 40 }}
              transition={{ type: 'spring', stiffness: 520, damping: 18 }}
              aria-hidden
            >
              {avatar}
            </motion.span>
          </AnimatePresence>
          <span
            className={cn(
              'absolute -right-1 -bottom-1 flex size-7 items-center justify-center rounded-full border-2 border-ink text-sm shadow-pop-sm transition-colors',
              pickerOpen ? 'bg-mint' : 'bg-white',
            )}
            aria-hidden
          >
            <Icon name={pickerOpen ? 'check' : 'edit'} className="size-4" weight="bold" />
          </span>
        </motion.button>

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
                    className="flex h-11 items-center gap-1.5 rounded-xl border-2 border-ink bg-lilac px-3 text-sm font-extrabold shadow-pop-sm"
                  >
                    <Icon name="dice" fill="#fff" className="size-5" /> {t('home.profile.randomAvatar')}
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
