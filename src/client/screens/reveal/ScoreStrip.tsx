import { AnimatePresence, motion } from 'motion/react';
import { POINTS_PER_CORRECT, type PublicPlayer } from '../../../shared/protocol';
import { Avatar } from '../../components/Avatar';
import { useT } from '../../i18n';
import { cn } from '../../lib/util';

const MEDALS = ['🥇', '🥈', '🥉'];

/**
 * Live mini leaderboard. Server scores only include fully revealed photos, so the points of
 * the current photo (as far as this client knows them, speed bonus included for the viewer)
 * are added once the owner is revealed (`gains`: player id -> points).
 */
export function ScoreStrip({ players, meId, gains }: { players: PublicPlayer[]; meId: string; gains: Map<string, number> }) {
  const t = useT();
  const list = players
    .map((p, order) => ({ p, order, gained: gains.get(p.id) ?? 0, score: p.score + (gains.get(p.id) ?? 0) }))
    .sort((a, b) => b.score - a.score || a.order - b.order);
  if (list.every((e) => e.score === 0)) return null;

  return (
    <motion.section className="mt-6" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
      <h2 className="mb-1.5 px-1 text-xs font-extrabold tracking-widest text-grape-200 uppercase">🏆 {t('reveal.scores')}</h2>
      <div className="no-scrollbar -mx-4 overflow-x-auto px-4 pt-1 pb-2">
        <ol className="flex w-max gap-2 md:w-auto md:flex-wrap">
          {list.map((e) => {
            const rank = 1 + list.filter((o) => o.score > e.score).length;
            return (
              <motion.li
                key={e.p.id}
                layout
                transition={{ type: 'spring', stiffness: 300, damping: 26 }}
                className={cn(
                  'flex h-11 items-center gap-1.5 rounded-full border-2 py-1 pr-3 pl-1.5',
                  e.p.id === meId ? 'border-sun bg-sun/15' : 'border-white/15 bg-white/8',
                )}
              >
                <span className="w-6 text-center font-display text-sm text-grape-200">{rank <= 3 && e.score > 0 ? MEDALS[rank - 1] : `#${rank}`}</span>
                <Avatar player={e.p} size="xs" crown={false} selfie />
                <span className="max-w-[6.5rem] truncate text-sm font-extrabold">{e.p.name}</span>
                <span className="font-display text-base text-sun">{e.score}</span>
                <AnimatePresence>
                  {e.gained > 0 && (
                    <motion.span
                      className="rounded-full border-2 border-ink bg-mint px-1.5 font-display text-xs whitespace-nowrap text-ink"
                      initial={{ scale: 0, y: 8 }}
                      animate={{ scale: 1, y: 0 }}
                      transition={{ type: 'spring', stiffness: 600, damping: 16, delay: 0.9 }}
                    >
                      +{e.gained}
                      {e.gained > POINTS_PER_CORRECT && <span aria-hidden> ⚡</span>}
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
