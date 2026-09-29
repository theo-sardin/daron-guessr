import { motion } from 'motion/react';
import { POINTS_PER_CORRECT, type ParentKind, type PublicPlayer } from '../../../shared/protocol';
import { Avatar } from '../../components/Avatar';
import { Card } from '../../components/Card';
import { useI18n } from '../../i18n';
import { cn } from '../../lib/util';
import type { PersonalResult } from './effects';

/** The viewer's private verdict for this photo, shown once the owner is revealed. */
export function Feedback({
  result,
  kind,
  index,
  picked,
  correct,
  total,
}: {
  result: PersonalResult;
  kind: ParentKind;
  index: number;
  /** The candidate the viewer voted for (wrong answers). */
  picked: PublicPlayer | null;
  correct: number;
  total: number;
}) {
  const { t, tpick } = useI18n();
  const enter = {
    initial: { opacity: 0, y: 24, scale: 0.8, rotate: -3 },
    animate: { opacity: 1, y: 0, scale: 1, rotate: 0 },
    transition: { delay: 0.6, type: 'spring' as const, stiffness: 420, damping: 18 },
  };

  if (result === 'right') {
    return (
      <Card tone="mint" padded={false} className="flex items-center gap-3 px-4 py-3" {...enter}>
        <motion.span
          className="flex h-14 shrink-0 items-center justify-center rounded-2xl border-3 border-ink bg-white px-2.5 font-display text-3xl text-mint-dark shadow-pop-sm"
          initial={{ scale: 0, rotate: -30 }}
          animate={{ scale: [0, 1.3, 1], rotate: [-30, 8, -4] }}
          transition={{ delay: 0.85, duration: 0.5 }}
        >
          +{POINTS_PER_CORRECT}
        </motion.span>
        <div className="min-w-0">
          <p className="font-display text-2xl leading-tight">{tpick('reveal.me.rightTitle', index)}</p>
          <p className="text-sm font-bold opacity-75">{t('reveal.me.rightSub')}</p>
        </div>
      </Card>
    );
  }

  if (result === 'wrong') {
    return (
      <Card tone="pink" padded={false} className="flex items-center gap-3 px-4 py-3" {...enter}>
        {picked && (
          <motion.span
            className="shrink-0"
            animate={{ rotate: [0, -12, 12, -8, 0] }}
            transition={{ delay: 1, duration: 0.5 }}
          >
            <Avatar player={picked} size="md" crown={false} dimOffline={false} />
          </motion.span>
        )}
        <div className="min-w-0">
          <p className="font-display text-2xl leading-tight break-words">{t('reveal.me.wrongTitle', { name: picked?.name ?? '???' })}</p>
          <p className="text-sm font-bold opacity-85">{tpick('reveal.me.wrongSub', index)}</p>
        </div>
      </Card>
    );
  }

  if (result === 'proud' || result === 'offended') {
    const line = total > 0 ? t(`reveal.me.mineCount.${kind}`, { correct, total }) : t(`reveal.me.mineNoVotes.${kind}`);
    const mood = result === 'proud' ? tpick('reveal.me.mineProud', index) : tpick('reveal.me.mineOffended', index);
    return (
      <Card tone="sun" padded={false} className="flex items-center gap-3 px-4 py-3" {...enter}>
        <motion.span
          className="shrink-0 text-5xl leading-none"
          initial={{ scale: 0 }}
          animate={result === 'proud' ? { scale: [0, 1.3, 1], rotate: [0, -10, 0] } : { scale: [0, 1.3, 1], x: [0, -4, 4, -4, 0] }}
          transition={{ delay: 0.85, duration: 0.6 }}
          aria-hidden
        >
          {result === 'proud' ? '😎' : '😤'}
        </motion.span>
        <div className="min-w-0">
          <p className="font-display text-2xl leading-tight">{t(`reveal.me.mineTitle.${kind}`)}</p>
          <p className="text-sm font-extrabold">{line}</p>
          <p className="text-xs font-bold opacity-70">{mood}</p>
        </div>
      </Card>
    );
  }

  return (
    <Card tone="glass" padded={false} className="flex items-center gap-3 px-4 py-3" {...enter}>
      <motion.span
        className="shrink-0 text-4xl leading-none"
        animate={{ rotate: [0, -8, 0, 8, 0], y: [0, -2, 0] }}
        transition={{ duration: 2.4, repeat: Infinity }}
        aria-hidden
      >
        💤
      </motion.span>
      <div className="min-w-0">
        <p className="font-display text-xl leading-tight">{t('reveal.me.noneTitle')}</p>
        <p className="text-sm font-bold text-grape-200">{t('reveal.me.noneSub')}</p>
      </div>
    </Card>
  );
}

const BADGE_STYLE: Record<PersonalResult, string> = {
  right: 'bg-mint text-ink px-2.5 text-2xl',
  wrong: 'bg-pink text-white size-12 text-2xl',
  proud: 'bg-sun size-12 text-3xl',
  offended: 'bg-sun size-12 text-3xl',
  none: 'bg-cream size-12 text-3xl',
};

/** Compact verdict slapped on the photo corner (phones), so it is visible without scrolling. */
export function PersonalBadge({ result }: { result: PersonalResult }) {
  const content = { right: `+${POINTS_PER_CORRECT}`, wrong: '❌', proud: '😎', offended: '😤', none: '💤' }[result];
  return (
    <motion.span
      className={cn(
        'flex h-12 items-center justify-center rounded-2xl border-3 border-ink font-display leading-none shadow-pop-sm',
        BADGE_STYLE[result],
      )}
      initial={{ scale: 0, rotate: 40 }}
      animate={{ scale: 1, rotate: -10 }}
      transition={{ type: 'spring', stiffness: 500, damping: 13, delay: 0.75 }}
      aria-hidden
    >
      {content}
    </motion.span>
  );
}
