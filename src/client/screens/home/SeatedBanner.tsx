import { motion } from 'motion/react';
import { Button } from '../../components/Button';
import { useT } from '../../i18n';

/** "You're still in room ABCD" — shown on the home page while this tab still holds a seat. */
export function SeatedBanner({
  code,
  onBack,
  onLeave,
  leaving,
  disabled,
}: {
  code: string;
  onBack: () => void;
  onLeave: () => void;
  leaving: boolean;
  disabled?: boolean;
}) {
  const t = useT();
  return (
    <motion.section
      layout
      initial={{ opacity: 0, y: -30, scale: 0.9, rotate: -3 }}
      animate={{ opacity: 1, y: 0, scale: 1, rotate: -1 }}
      exit={{ opacity: 0, y: -20, scale: 0.9, transition: { duration: 0.2 } }}
      transition={{ type: 'spring', stiffness: 380, damping: 18 }}
      className="relative mx-auto mb-6 w-full max-w-xl rounded-[var(--radius-blob)] border-3 border-ink bg-sun p-4 text-ink shadow-pop-lg sm:p-5"
      role="status"
    >
      <div className="flex items-center gap-3">
        <motion.span
          className="text-5xl leading-none"
          animate={{ rotate: [0, -12, 12, -8, 0], y: [0, -4, 0] }}
          transition={{ duration: 1.2, repeat: Infinity, repeatDelay: 1.6 }}
          aria-hidden
        >
          🏃
        </motion.span>
        <div className="min-w-0">
          <h2 className="font-display text-2xl leading-tight">{t('home.seated.title', { code })}</h2>
          <p className="font-bold text-balance text-ink-soft">{t('home.seated.body')}</p>
        </div>
      </div>
      <div className="mt-4 flex gap-3">
        <Button variant="primary" size="lg" className="flex-[2]" onClick={onBack} disabled={disabled || leaving} icon={<span aria-hidden>🚀</span>}>
          {t('home.seated.goBack')}
        </Button>
        <Button variant="secondary" size="lg" className="flex-1" onClick={onLeave} loading={leaving} disabled={disabled}>
          {t('home.seated.leave')}
        </Button>
      </div>
    </motion.section>
  );
}
