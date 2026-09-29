import { motion, useReducedMotion } from 'motion/react';
import { Button } from '../../components/Button';
import { Icon } from '../../components/Icon';
import { IconBadge } from '../../components/IconBadge';
import { useT } from '../../i18n';

/** Placeholder swapped for the code chip (never typed by anyone, never in a translation). */
const CODE_SLOT = '\u0000';

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
  const reduce = useReducedMotion();
  // The code is set as a glowing stamp inside the sentence (like the TopBar's room chip).
  const [before, after = ''] = t('home.seated.title', { code: CODE_SLOT }).split(CODE_SLOT);
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
          className="flex shrink-0"
          animate={reduce ? undefined : { rotate: [0, -10, 10, -6, 0], y: [0, -4, 0] }}
          transition={{ duration: 1.2, repeat: Infinity, repeatDelay: 1.6 }}
          aria-hidden
        >
          <IconBadge name="users" tone="cream" size="lg" tilt={-6} />
        </motion.span>
        <div className="min-w-0">
          <h2 className="font-display text-2xl leading-tight">
            {before}
            <span className="text-stamp mx-0.5 inline-block rounded-lg border-2 border-ink bg-ink py-1 pr-1 pl-1.5 align-[0.12em] font-mono text-[0.8em] leading-none font-bold tracking-[0.14em] whitespace-nowrap">
              {code}
            </span>
            {after}
          </h2>
          <p className="font-bold text-balance text-ink-soft">{t('home.seated.body')}</p>
        </div>
      </div>
      <div className="mt-4 flex gap-2 min-[375px]:gap-3">
        <Button variant="primary" size="lg" className="min-w-0 flex-[2] max-[374px]:px-3!" onClick={onBack} disabled={disabled || leaving} icon={<Icon name="arrow-right" className="size-5" weight="bold" />}>
          {t('home.seated.goBack')}
        </Button>
        <Button variant="secondary" size="lg" className="min-w-0 flex-1 max-[374px]:px-3!" onClick={onLeave} loading={leaving} disabled={disabled}>
          {t('home.seated.leave')}
        </Button>
      </div>
    </motion.section>
  );
}
