import { motion } from 'motion/react';
import { Button } from '../../components/Button';
import { DymoLabel } from '../../components/DymoLabel';
import { PostIt } from '../../components/Paper';
import { useT } from '../../i18n';

/** Placeholder swapped for the code label (never typed by anyone, never in a translation). */
const CODE_SLOT = '\u0000';

/** "You're still in room ABCD" — a post-it on the cover while this tab still holds a seat. */
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
  // The code is set as a red Dymo label inside the sentence (like the TopBar's room label).
  const [before, after = ''] = t('home.seated.title', { code: CODE_SLOT }).split(CODE_SLOT);
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -30, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -20, scale: 0.9, transition: { duration: 0.2 } }}
      transition={{ type: 'spring', stiffness: 380, damping: 18 }}
      className="mx-auto mb-8 w-full max-w-xl"
    >
      <PostIt tilt={-1} tape="cream" role="status" className="px-4 pt-5 pb-5 sm:px-5">
        <h2 className="text-[1.45rem] leading-[1.25] font-black tracking-[-0.015em]" style={{ fontStretch: '108%' }}>
          {before}
          <DymoLabel text={code} tone="red" size="sm" tilt={-2} className="mx-1 align-[0.1em]" label={code.split('').join(' ')} />
          {after}
        </h2>
        <p className="text-pen mt-1 text-[1.2rem] leading-tight">{t('home.seated.body')}</p>
        <div className="mt-4 flex gap-3">
          <Button variant="primary" size="lg" arrow className="min-w-0 flex-[2] max-[374px]:px-3!" onClick={onBack} disabled={disabled || leaving}>
            {t('home.seated.goBack')}
          </Button>
          <Button variant="outline" size="lg" className="min-w-0 flex-1 max-[374px]:px-3!" onClick={onLeave} loading={leaving} disabled={disabled}>
            {t('home.seated.leave')}
          </Button>
        </div>
      </PostIt>
    </motion.div>
  );
}
