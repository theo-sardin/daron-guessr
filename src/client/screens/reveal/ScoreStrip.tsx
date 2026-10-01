import { AnimatePresence, motion } from 'motion/react';
import type { PublicPlayer } from '../../../shared/protocol';
import { Avatar } from '../../components/Avatar';
import { useT } from '../../i18n';
import { cn } from '../../lib/util';

/** Podium marks: paper discs in gold, silver and bronze. */
const PODIUM = ['#ffdf3d', '#c9ccd3', '#e0a06a'];

/**
 * Live mini leaderboard: little paper tags. Server scores only include fully revealed photos,
 * so the points of the current photo (as far as this client knows them) are added once the
 * owner is revealed (`gains`: player id -> points).
 */
export function ScoreStrip({ players, meId, gains }: { players: PublicPlayer[]; meId: string; gains: Map<string, number> }) {
  const t = useT();
  const list = players
    .map((p, order) => ({ p, order, gained: gains.get(p.id) ?? 0, score: p.score + (gains.get(p.id) ?? 0) }))
    .sort((a, b) => b.score - a.score || a.order - b.order);
  if (list.every((e) => e.score === 0)) return null;

  return (
    <motion.section className="mt-7" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
      <h2 className="label-type mb-0 flex items-center gap-2 text-[12.5px] after:h-px after:flex-1 after:bg-ink/45">{t('reveal.scores')}</h2>
      <div className="no-scrollbar -mx-4 overflow-x-auto px-4 pt-3.5 pb-3">
        <ol className="flex w-max gap-2.5 md:w-auto md:flex-wrap">
          {list.map((e, i) => {
            const rank = 1 + list.filter((o) => o.score > e.score).length;
            const podium = rank <= 3 && e.score > 0 ? PODIUM[rank - 1] : null;
            return (
              <motion.li
                key={e.p.id}
                layout
                transition={{ type: 'spring', stiffness: 300, damping: 26 }}
                className={cn('relative flex h-11 items-center gap-1.5 bg-sheet py-1 pr-3 pl-1.5 shadow-paper-sm', e.p.id === meId && 'ring-2 ring-ink')}
                style={{ rotate: `${((i * 37) % 5) - 2}deg` }}
              >
                <span
                  className="flex size-6 shrink-0 items-center justify-center rounded-full font-display text-[12px] leading-none"
                  style={{ backgroundColor: podium ?? 'transparent' }}
                >
                  {rank}
                </span>
                <Avatar player={e.p} size="xs" crown={false} selfie />
                <span className="max-w-[6.5rem] truncate text-sm font-extrabold">{e.p.name}</span>
                <span className="ml-0.5 font-display text-[17px] leading-none">{e.score}</span>
                <AnimatePresence>
                  {e.gained > 0 && (
                    <motion.span
                      className="absolute -top-3 -right-2 bg-mint px-1 py-px font-display text-[11px] leading-[1.3] shadow-paper-sm"
                      initial={{ scale: 0, y: 8, rotate: 0 }}
                      animate={{ scale: 1, y: 0, rotate: 6 }}
                      transition={{ type: 'spring', stiffness: 600, damping: 16, delay: 0.9 }}
                    >
                      +{e.gained}
                    </motion.span>
                  )}
                </AnimatePresence>
              </motion.li>
            );
          })}
        </ol>
      </div>
    </motion.section>
  );
}
