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
  size = 'lg',
  className,
}: {
  value: string;
  onChange: (code: string) => void;
  onSubmit?: () => void;
  label: string;
  invalid?: boolean;
  inputRef?: Ref<HTMLInputElement>;
  describedBy?: string;
  /** lg: four big tiles; sm: the little letter boxes drawn on the "I've got a code" kraft strip. */
  size?: 'sm' | 'lg';
  className?: string;
}) {
  const sm = size === 'sm';
  const [focused, setFocused] = useState(false);
  const active = Math.min(value.length, ROOM_CODE_LENGTH - 1);

  return (
    <div className={cn('relative', sm && 'shrink-0', className)}>
      <div className={cn('grid grid-cols-4', sm ? 'gap-1.5' : 'gap-2 sm:gap-3')} aria-hidden>
        {Array.from({ length: ROOM_CODE_LENGTH }, (_, i) => {
          const ch = value[i] ?? '';
          const bad = ch !== '' && !ROOM_CODE_ALPHABET.includes(ch);
          const isActive = focused && i === active;
          return (
            <div
              key={i}
              style={{ rotate: `${ch ? TILTS[i] : 0}deg` }}
              className={cn(
                // Letter boxes drawn on the kraft: a typed letter is a white paper tile in bold ink.
                'relative flex items-center justify-center rounded-[4px] font-num leading-none transition-[background-color,border-color,rotate,box-shadow] duration-200',
                sm ? 'h-11 w-[2.15rem] text-[1.45rem] max-[374px]:w-[1.9rem]' : 'h-14 text-[2.1rem] sm:h-16',
                bad
                  ? 'border-2 border-red-ink bg-red text-white shadow-paper-sm'
                  : ch
                    ? 'border-2 border-transparent bg-sheet text-ink shadow-paper-sm'
                    : invalid
                      ? 'border-2 border-dashed border-red-ink bg-sheet/40 text-ink'
                      : 'border-2 border-ink/70 bg-sheet/35 text-ink',
                isActive && !ch && 'border-solid border-blue bg-sheet',
                isActive && 'shadow-[0_0_0_3px_rgb(35_68_200_/_0.35)]',
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
                    className={cn('w-[3px] rounded-full bg-blue', sm ? 'h-6' : 'h-8')}
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
        className="absolute inset-0 h-full w-full cursor-text rounded-[4px] border-0 bg-transparent text-transparent caret-transparent opacity-[0.01] outline-none selection:bg-transparent"
      />
    </div>
  );
}
