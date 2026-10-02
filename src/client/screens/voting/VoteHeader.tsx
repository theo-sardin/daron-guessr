import { motion } from 'motion/react';
import type { PublicPlayer, VotingView } from '../../../shared/protocol';
import { TimerRing } from '../../components/TimerRing';
import { useT } from '../../i18n';
import { cn } from '../../lib/util';
import { VotersStrip } from './VotersStrip';

/**
 * Top strip: "Photo n/total" with a segmented progress bar, the round timer and the
 * "who voted" avatars. Only *whether* someone voted is shown, never for whom.
 */
export function VoteHeader({
  v,
  players,
  meId,
  started,
}: {
  v: VotingView;
  players: PublicPlayer[];
  meId: string;
  started: boolean;
}) {
  const t = useT();
  const n = v.round + 1;
  return (
    <div className="flex items-center gap-3 rounded-3xl border-2 border-white/15 bg-grape-950/60 px-3 py-2.5 sm:px-4">
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <div className="flex items-center gap-3">
          <motion.span
            key={v.round}
            initial={{ scale: 0.6, rotate: -8, opacity: 0 }}
            animate={{ scale: 1, rotate: 0, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 500, damping: 18 }}
            className="text-outline-sm shrink-0 font-display text-xl leading-none text-sun sm:text-2xl"
          >
            {t('voting.photoCount', { n, total: v.totalRounds })}
          </motion.span>
          <ProgressBar round={v.round} total={v.totalRounds} label={t('voting.progressLabel', { n, total: v.totalRounds })} />
        </div>
        <VotersStrip players={players} votedIds={v.votedIds} meId={meId} active={started} />
      </div>
      <TimerRing startsAt={v.startsAt} endsAt={v.endsAt} size={60} className="shrink-0" />
    </div>
  );
}

function ProgressBar({ round, total, label }: { round: number; total: number; label: string }) {
  return (
    <div className="flex h-3 min-w-0 flex-1 gap-[3px]" role="progressbar" aria-valuemin={1} aria-valuemax={total} aria-valuenow={round + 1} aria-label={label}>
      {Array.from({ length: total }, (_, i) => (
        <span
          key={i}
          className={cn(
            'relative h-full min-w-0 flex-1 overflow-hidden rounded-full border-ink',
            i < round && 'border-2 bg-mint',
            i === round && 'border-2 bg-cream',
            i > round && 'bg-white/15',
          )}
        >
          {i === round && (
            <motion.span
              className="absolute inset-0 bg-sun"
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              style={{ originX: 0 }}
              transition={{ duration: 0.6, ease: 'easeOut' }}
            />
          )}
        </span>
      ))}
    </div>
  );
}
