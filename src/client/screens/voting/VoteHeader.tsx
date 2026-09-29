import { AnimatePresence, motion } from 'motion/react';
import type { PublicPlayer, VotingView } from '../../../shared/protocol';
import { Avatar } from '../../components/Avatar';
import { TimerRing } from '../../components/TimerRing';
import { useT } from '../../i18n';
import { cn } from '../../lib/util';

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
        <VotedStrip players={players} votedIds={v.votedIds} meId={meId} active={started} />
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

/** Everybody still around, in join order: a ✓ pops on each avatar as they vote. */
function VotedStrip({ players, votedIds, meId, active }: { players: PublicPlayer[]; votedIds: string[]; meId: string; active: boolean }) {
  const t = useT();
  const voted = new Set(votedIds);
  // Connected players, plus anyone who voted before dropping (their vote still counts).
  const shown = players.filter((p) => p.connected || voted.has(p.id));
  const count = shown.filter((p) => voted.has(p.id)).length;
  const all = active && shown.length > 0 && count === shown.length;

  return (
    <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1.5" aria-label={t('voting.whoVoted')}>
      <ul className={cn('flex min-w-0 items-center', shown.length > 9 ? '-space-x-2.5' : shown.length > 6 ? '-space-x-2' : '-space-x-1.5')}>
        {shown.map((p) => {
          const has = voted.has(p.id);
          return (
            <li key={p.id} className="relative">
              <motion.div
                initial={false}
                animate={has ? { y: [0, -9, 0], scale: [1, 1.25, 1] } : { y: 0, scale: 1 }}
                transition={{ duration: 0.45, ease: 'easeOut' }}
                className={cn('transition-opacity duration-300', has ? 'opacity-100' : 'opacity-45')}
              >
                <Avatar player={p} size="xs" crown={false} className={cn(p.id === meId && 'rounded-full ring-2 ring-cream')} />
              </motion.div>
              <AnimatePresence initial={false}>
                {has && (
                  <motion.span
                    initial={{ scale: 0, rotate: -40 }}
                    animate={{ scale: 1, rotate: 0 }}
                    exit={{ scale: 0, opacity: 0 }}
                    transition={{ type: 'spring', stiffness: 600, damping: 16 }}
                    className="absolute -right-0.5 -bottom-1 z-10 flex size-3.5 items-center justify-center rounded-full border-[1.5px] border-ink bg-mint text-[8px] leading-none font-black text-ink"
                    aria-hidden
                  >
                    ✓
                  </motion.span>
                )}
              </AnimatePresence>
            </li>
          );
        })}
      </ul>
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={all ? 'all' : 'count'}
          initial={{ y: 6, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -6, opacity: 0 }}
          transition={{ duration: 0.18 }}
          className={cn(
            'shrink-0 rounded-full px-2 py-0.5 text-xs font-extrabold whitespace-nowrap tabular-nums',
            all ? 'border-2 border-ink bg-mint text-ink' : 'bg-white/10 text-grape-200',
          )}
          aria-live="polite"
        >
          {all ? t('voting.allVoted') : t('voting.votedCount', { count, total: shown.length })}
        </motion.span>
      </AnimatePresence>
    </div>
  );
}
