import { motion } from 'motion/react';
import type { PhotoKind } from '../../../shared/protocol';
import { useT } from '../../i18n';
import { cn } from '../../lib/util';

/** Shown only to the photo's owner: their vote is a decoy, so bluff away. */
export function MineBanner({ kind, className }: { kind: PhotoKind; className?: string }) {
  const t = useT();
  return (
    <motion.div
      role="status"
      className={cn(
        'relative flex items-center gap-3 overflow-hidden rounded-3xl border-3 border-ink bg-tangerine px-3.5 py-2.5 text-ink shadow-pop',
        className,
      )}
      initial={{ scale: 0.5, rotate: -8, opacity: 0 }}
      animate={{ scale: 1, rotate: -1.2, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 420, damping: 14, delay: 0.25 }}
    >
      {/* Caution-tape stripes. */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-15"
        style={{ backgroundImage: 'repeating-linear-gradient(-45deg, #1b1036 0 10px, transparent 10px 22px)' }}
      />
      <motion.span
        aria-hidden
        className="relative shrink-0 text-4xl drop-shadow-[0_2px_0_rgba(27,16,54,0.5)]"
        animate={{ rotate: [0, -12, 10, -6, 0], scale: [1, 1.15, 1] }}
        transition={{ duration: 1.1, repeat: Infinity, repeatDelay: 1.6 }}
      >
        🤫
      </motion.span>
      <div className="relative min-w-0">
        <p className="font-display text-xl leading-tight sm:text-2xl">{t(`voting.mine.title.${kind}`)}</p>
        <p className="text-sm leading-snug font-bold">{t('voting.mine.body')}</p>
      </div>
    </motion.div>
  );
}
