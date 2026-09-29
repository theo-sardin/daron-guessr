import { motion } from 'motion/react';
import type { PhotoKind } from '../../../shared/protocol';
import { IconBadge } from '../../components/IconBadge';
import { useT } from '../../i18n';
import { cn } from '../../lib/util';

/** Shown only to the photo's owner: their vote is a decoy, so bluff away. */
export function MineBanner({ kind, className }: { kind: PhotoKind; className?: string }) {
  const t = useT();
  return (
    <motion.div
      role="status"
      className={cn(
        'relative flex items-center gap-3 rounded-3xl border-3 border-ink bg-tangerine py-2.5 pr-3.5 pl-2.5 text-ink shadow-pop',
        className,
      )}
      initial={{ scale: 0.5, rotate: -8, opacity: 0 }}
      animate={{ scale: 1, rotate: -1.2, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 420, damping: 14, delay: 0.25 }}
    >
      {/* Caution-tape stripes. */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 rounded-[inherit] opacity-[0.12]"
        style={{ backgroundImage: 'repeating-linear-gradient(-45deg, #1b1036 0 10px, transparent 10px 22px)' }}
      />
      <motion.span
        aria-hidden
        className="relative shrink-0"
        animate={{ rotate: [-6, -18, 8, -12, -6], y: [0, -3, 0, -1, 0] }}
        transition={{ duration: 1.1, repeat: Infinity, repeatDelay: 1.6 }}
      >
        <IconBadge name="mask" tone="ink" size="lg" fill="var(--color-tangerine)" />
      </motion.span>
      {/* A lab label slapped over the top edge. */}
      <span className="label-mono absolute -top-3 right-5 rotate-3 rounded-[5px] border-2 border-ink bg-ink px-1.5 py-[3px] text-[10px] text-tangerine shadow-[0_2px_0_0_rgb(27_16_54_/_0.5)]">
        {t('voting.mine.tag')}
      </span>
      <div className="relative min-w-0">
        <p className="font-display text-[1.375rem] leading-[1.02] tracking-[-0.02em] [font-stretch:80%] sm:text-[1.75rem]">
          {t(`voting.mine.title.${kind}`)}
        </p>
        {/* Small phones: the title alone (the bottom bar already says "vote for someone else"),
            so the banner doesn't bury the print and the candidates. */}
        <p className="mt-0.5 text-sm leading-snug font-bold max-[359px]:hidden [@media(max-height:700px)]:hidden">{t('voting.mine.body')}</p>
      </div>
    </motion.div>
  );
}
