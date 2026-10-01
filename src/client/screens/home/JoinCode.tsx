import { AnimatePresence, motion } from 'motion/react';
import type { Ref } from 'react';
import { Button } from '../../components/Button';
import { TornPaper } from '../../components/TornPaper';
import { useT } from '../../i18n';
import { CodeInput } from './CodeInput';
import { FieldError } from './FieldError';

/**
 * The kraft strip under the main button: "I've got a code" + four little letter boxes that ARE
 * the code field (it joins by itself on the 4th letter). The Join button only shows up once a
 * letter is in, for whoever prefers to tap.
 */
export function JoinCode({
  code,
  onChange,
  onSubmit,
  error,
  shakeRef,
  inputRef,
  buttonRef,
  loading,
  disabled,
}: {
  code: string;
  onChange: (code: string) => void;
  onSubmit: () => void;
  error: string | null;
  shakeRef: Ref<HTMLDivElement>;
  inputRef: Ref<HTMLInputElement>;
  buttonRef: Ref<HTMLButtonElement>;
  loading: boolean;
  disabled: boolean;
}) {
  const t = useT();
  return (
    <div>
      <div ref={shakeRef}>
        <TornPaper
          surface="kraft"
          edges="tb"
          amp={2.6}
          seed="home-code"
          tilt={0.6}
          className="flex min-h-[3.6rem] flex-wrap items-center justify-center gap-x-3 gap-y-1.5 px-4 py-2.5"
        >
          <span className="text-[1.05rem] font-extrabold tracking-[-0.01em] text-ink min-[375px]:text-[1.1rem]" aria-hidden>
            {t('home.actions.haveCode')}
          </span>
          <CodeInput
            size="sm"
            value={code}
            onChange={onChange}
            onSubmit={onSubmit}
            label={t('home.actions.codeLabel')}
            invalid={Boolean(error)}
            inputRef={inputRef}
            describedBy={error ? 'home-code-error' : undefined}
          />
        </TornPaper>
      </div>
      <FieldError id="home-code-error" message={error} className="text-center" />
      <AnimatePresence initial={false}>
        {code.length > 0 && (
          <motion.div
            key="join"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 420, damping: 34 }}
            className="-mx-3 overflow-hidden px-3"
          >
            <div className="pt-4 pb-2">
              <Button ref={buttonRef} variant="sun" size="md" block arrow loading={loading} disabled={disabled} onClick={onSubmit}>
                {t('home.actions.join')}
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
