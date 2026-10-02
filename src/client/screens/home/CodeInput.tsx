import { AnimatePresence, motion } from 'motion/react';
import { useState, type Ref } from 'react';
import { ROOM_CODE_ALPHABET, ROOM_CODE_LENGTH } from '../../../shared/protocol';
import { cn } from '../../lib/util';
import { extractCode } from './helpers';

const TILTS = [-4, 3, -2, 4];

/**
 * Four big letter tiles backed by one real, transparent <input> laid over them, so typing,
 * backspace, autofill and pasting a whole invite link all behave natively.
 */
export function CodeInput({
  value,
  onChange,
  onSubmit,
  label,
  invalid,
  inputRef,
  describedBy,
}: {
  value: string;
  onChange: (code: string) => void;
  onSubmit?: () => void;
  label: string;
  invalid?: boolean;
  inputRef?: Ref<HTMLInputElement>;
  describedBy?: string;
}) {
  const [focused, setFocused] = useState(false);
  const active = Math.min(value.length, ROOM_CODE_LENGTH - 1);

  return (
    <div className="relative">
      <div className="grid grid-cols-4 gap-2 sm:gap-3" aria-hidden>
        {Array.from({ length: ROOM_CODE_LENGTH }, (_, i) => {
          const ch = value[i] ?? '';
          const bad = ch !== '' && !ROOM_CODE_ALPHABET.includes(ch);
          const isActive = focused && i === active;
          return (
            <div
              key={i}
              style={{ rotate: `${ch ? TILTS[i] : 0}deg` }}
              className={cn(
                'relative flex h-16 items-center justify-center rounded-2xl border-3 font-display text-4xl transition-[background-color,border-color,rotate,box-shadow] duration-200',
                bad
                  ? 'border-ink bg-danger text-white shadow-pop-sm'
                  : ch
                    ? 'border-ink bg-sun text-ink shadow-pop-sm'
                    : invalid
                      ? 'border-danger bg-white/90 text-ink'
                      : 'border-ink/25 border-dashed bg-white/90 text-ink',
                isActive && !ch && 'border-solid border-pink bg-white',
                isActive && 'ring-4 ring-pink/50',
              )}
            >
              <AnimatePresence mode="popLayout" initial={false}>
                {ch ? (
                  <motion.span
                    key={`${i}-${ch}`}
                    initial={{ scale: 0.2, y: 12, opacity: 0 }}
                    animate={{ scale: 1, y: 0, opacity: 1 }}
                    exit={{ scale: 0.3, opacity: 0 }}
                    transition={{ type: 'spring', stiffness: 700, damping: 20 }}
                  >
                    {ch}
                  </motion.span>
                ) : isActive ? (
                  <motion.span
                    key="caret"
                    className="h-8 w-1 rounded-full bg-pink"
                    animate={{ opacity: [1, 0.15, 1] }}
                    transition={{ duration: 1, repeat: Infinity }}
                  />
                ) : null}
              </AnimatePresence>
            </div>
          );
        })}
      </div>
      <input
        ref={inputRef}
        value={value}
        onChange={(e) => onChange(extractCode(e.target.value))}
        onPaste={(e) => {
          const text = e.clipboardData.getData('text');
          if (!text) return;
          e.preventDefault();
          onChange(extractCode(text));
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
            e.preventDefault();
            onSubmit?.();
          }
        }}
        onFocus={(e) => {
          setFocused(true);
          // Keep the caret at the end: the tiles only make sense typed left to right.
          const el = e.currentTarget;
          requestAnimationFrame(() => el.setSelectionRange(el.value.length, el.value.length));
        }}
        onBlur={() => setFocused(false)}
        aria-label={label}
        aria-invalid={invalid ? true : undefined}
        aria-describedby={describedBy}
        inputMode="text"
        autoCapitalize="characters"
        autoComplete="off"
        autoCorrect="off"
        spellCheck={false}
        enterKeyHint="go"
        className="absolute inset-0 h-full w-full cursor-text rounded-2xl border-0 bg-transparent text-transparent caret-transparent opacity-[0.01] outline-none selection:bg-transparent"
      />
    </div>
  );
}
