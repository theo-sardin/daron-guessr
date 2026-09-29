import { animate, AnimatePresence, motion } from 'motion/react';
import { useEffect, useState } from 'react';
import type { PublicPlayer } from '../../../shared/protocol';
import { Avatar } from '../../components/Avatar';
import { Card } from '../../components/Card';
import { useT } from '../../i18n';
import { cn } from '../../lib/util';
import { barStagger } from './effects';
import { playerOrGhost, type Row, type Stage } from './timeline';

function CountUp({ value, delay }: { value: number; delay: number }) {
  const [n, setN] = useState(0);
  useEffect(() => {
    const controls = animate(0, value, { duration: 0.8, delay, ease: 'easeOut', onUpdate: (v) => setN(Math.round(v)) });
    return () => controls.stop();
  }, [value, delay]);
  return <>{n}</>;
}

/** Tiny avatar used for voters inside a bar (only when votes are not anonymous). */
function VoterDot({ player, delay, dense }: { player: PublicPlayer; delay: number; dense: boolean }) {
  return (
    <motion.span
      title={player.name}
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-full border-2 border-ink leading-none',
        dense ? 'size-5 text-[11px]' : 'size-6 text-[13px]',
      )}
      style={{ backgroundColor: player.color }}
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      transition={{ delay, type: 'spring', stiffness: 600, damping: 18 }}
    >
      <span aria-hidden>{player.avatar}</span>
    </motion.span>
  );
}

export interface VoteBarsProps {
  rows: Row[];
  stage: Stage;
  totalVotes: number;
  byId: Map<string, PublicPlayer>;
  meId: string;
  /** Candidate the viewer picked, when it should be marked. */
  myPickId: string | null;
  /** Only set once the owner is revealed. */
  ownerId: string | null;
}

/**
 * Vote chart: one row per candidate that received votes (sorted), bars growing to their
 * share. Once the owner is revealed their row turns gold and the others fade out.
 */
export function VoteBars({ rows, stage, totalVotes, byId, meId, myPickId, ownerId }: VoteBarsProps) {
  const t = useT();
  const dense = rows.length > 5;
  const stagger = barStagger(rows.length);
  const drumroll = stage === 'drumroll';

  return (
    <Card tone="cream" padded={false} className="w-full p-3 sm:p-4" initial={{ opacity: 0, y: 30, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }}>
      <div className="mb-2 flex items-center justify-between px-1 text-xs font-extrabold tracking-wide text-ink-soft uppercase">
        <span>🗳️ {totalVotes === 1 ? t('reveal.votes.one') : t('reveal.votes.many', { count: totalVotes })}</span>
      </div>

      {totalVotes === 0 && (
        <div className="flex flex-col items-center py-3 text-center">
          <motion.span
            className="text-5xl"
            animate={{ y: [0, -18, 0, -8, 0], rotate: [0, -10, 0, 8, 0] }}
            transition={{ duration: 1.4, repeat: Infinity, repeatDelay: 0.4 }}
            aria-hidden
          >
            🦗
          </motion.span>
          <p className="mt-1 font-display text-2xl">{t('reveal.noVotes')}</p>
          <p className="text-sm font-bold text-ink-soft">{t('reveal.noVotesSub')}</p>
        </div>
      )}

      <ul className={cn('flex flex-col', dense ? 'gap-1' : 'gap-1.5')}>
        <AnimatePresence initial={true}>
          {rows.map((row, i) => {
            const p = playerOrGhost(byId, row.id);
            const isOwner = ownerId !== null && row.id === ownerId;
            const dim = ownerId !== null && !isOwner;
            const pct = totalVotes > 0 ? (row.votes / totalVotes) * 100 : 0;
            const delay = row.votes === 0 ? 0.25 : i * stagger;
            const voters = row.voters?.map((id) => playerOrGhost(byId, id)) ?? null;
            return (
              <motion.li
                key={row.id}
                layout="position"
                initial={{ opacity: 0, x: -28, scale: 0.9 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                transition={{ delay, type: 'spring', stiffness: 420, damping: 26 }}
              >
                <motion.div
                  className={cn(
                    'relative flex items-center rounded-2xl border-3 transition-colors duration-300',
                    dense ? 'gap-2 px-1.5 py-1' : 'gap-2.5 px-2 py-1.5',
                    isOwner ? 'border-ink bg-sun shadow-pop-sm' : 'border-transparent',
                  )}
                  animate={{
                    opacity: dim ? 0.5 : drumroll ? 0.7 : 1,
                    scale: isOwner ? [1, 1.07, 1] : 1,
                  }}
                  transition={{ opacity: { duration: 0.35 }, scale: { duration: 0.45, delay: 0.1 } }}
                >
                  <span className="relative">
                    <Avatar player={p} size={dense ? 'xs' : 'sm'} crown={false} dimOffline={false} />
                    {isOwner && (
                      <motion.span
                        className="absolute -top-3.5 -left-2 text-lg"
                        initial={{ scale: 0, rotate: -60, y: -10 }}
                        animate={{ scale: 1, rotate: -18, y: 0 }}
                        transition={{ type: 'spring', stiffness: 500, damping: 14, delay: 0.2 }}
                        aria-hidden
                      >
                        👑
                      </motion.span>
                    )}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex min-w-0 items-center gap-1.5">
                      <span className={cn('min-w-0 truncate font-extrabold', dense && 'text-sm')}>{p.name}</span>
                      {row.id === meId && <span className="shrink-0 text-xs font-bold text-ink-soft">{t('common.youTag')}</span>}
                      {row.id === myPickId && (
                        <span className="shrink-0 rounded-full bg-ink px-1.5 py-px text-[10px] font-extrabold tracking-wide text-cream uppercase">
                          👈 {t('reveal.yourPick')}
                        </span>
                      )}
                    </div>
                    <div
                      className={cn(
                        'mt-1 flex rounded-full',
                        isOwner ? 'bg-white/60' : 'bg-ink/10',
                        voters ? (dense ? 'h-6' : 'h-7') : dense ? 'h-3' : 'h-4',
                      )}
                    >
                      <motion.div
                        className={cn(
                          'flex h-full items-center -space-x-1 overflow-hidden rounded-full',
                          row.votes > 0 ? 'border-2 border-ink px-0.5' : 'border-0 p-0',
                        )}
                        style={{
                          backgroundColor: p.color,
                          minWidth: voters && voters.length > 0 ? `calc(${voters.length} * ${dense ? 16 : 20}px + 12px)` : row.votes > 0 ? 14 : 0,
                        }}
                        initial={{ width: '0%' }}
                        animate={{ width: `${pct}%` }}
                        transition={{ delay: delay + 0.1, type: 'spring', stiffness: 90, damping: 16 }}
                      >
                        {voters?.map((v, j) => (
                          <VoterDot key={v.id} player={v} dense={dense} delay={delay + 0.35 + j * 0.06} />
                        ))}
                      </motion.div>
                    </div>
                  </div>
                  <span className={cn('flex w-9 shrink-0 items-center justify-end gap-0.5 text-right font-display', dense ? 'text-xl' : 'text-2xl')}>
                    <CountUp value={row.votes} delay={delay + 0.1} />
                  </span>
                  {isOwner && (
                    <motion.span
                      className="absolute -top-3 -right-3 flex size-7 items-center justify-center rounded-full border-2 border-ink bg-mint text-sm shadow-pop-sm"
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: 'spring', stiffness: 600, damping: 15, delay: 0.3 }}
                      aria-hidden
                    >
                      ✔
                    </motion.span>
                  )}
                </motion.div>
              </motion.li>
            );
          })}
        </AnimatePresence>
      </ul>
    </Card>
  );
}
