import type { Ref } from 'react';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { useT } from '../../i18n';
import { CodeInput } from './CodeInput';
import { FieldError } from './FieldError';

/**
 * The "Got a code?" card under the main button: four big letter tiles (it joins by itself on the
 * 4th letter, typed or pasted) and a Join button for whoever prefers to tap.
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
      <div ref={shakeRef}>
        <CodeInput
          value={code}
          onChange={onChange}
          onSubmit={onSubmit}
          label={t('home.actions.codeLabel')}
          invalid={Boolean(error)}
          inputRef={inputRef}
          describedBy={error ? 'home-code-error' : undefined}
        />
      </div>
      <FieldError id="home-code-error" message={error} className="text-center" />
      <Button
        ref={buttonRef}
        variant="sun"
        size="lg"
        block
        className="mt-4"
        loading={loading}
        disabled={disabled}
        onClick={onSubmit}
        icon={<span aria-hidden>🚪</span>}
      >
        {t('home.actions.join')}
      </Button>
    </Card>
  );
}
