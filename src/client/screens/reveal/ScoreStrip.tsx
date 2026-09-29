import { AnimatePresence, motion } from 'motion/react';
import { POINTS_PER_CORRECT, type PublicPlayer } from '../../../shared/protocol';
import { Avatar } from '../../components/Avatar';
import { Icon } from '../../components/Icon';
import { Stamp } from '../../components/Stamp';
import { useT } from '../../i18n';
import { cn } from '../../lib/util';

/** Podium marks: a gold trophy, then silver and bronze medals (the two-tone icon body). */
const PODIUM = [
  { icon: 'trophy', fill: 'var(--color-sun)' },
  { icon: 'medal', fill: '#9aa6bd' },
  { icon: 'medal', fill: '#d0763a' },
] as const;

/**
 * Live mini leaderboard. Server scores only include fully revealed photos, so the points of
 * the current photo (as far as this client knows them) are added once the owner is revealed.
 */
export function ScoreStrip({ players, meId, gainers }: { players: PublicPlayer[]; meId: string; gainers: Set<string> }) {
  const t = useT();
  const list = players
    .map((p, order) => ({ p, order, gained: gainers.has(p.id), score: p.score + (gainers.has(p.id) ? POINTS_PER_CORRECT : 0) }))
    .sort((a, b) => b.score - a.score || a.order - b.order);
  if (list.every((e) => e.score === 0)) return null;

  return (
    <motion.section className="mt-6" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
      <h2 className="mb-0 flex items-center gap-1.5 px-1 text-grape-200">
        <Icon name="trophy" className="size-4" />
        <span className="label-mono">{t('reveal.scores')}</span>
      </h2>
      <div className="no-scrollbar -mx-4 overflow-x-auto px-4 pt-3 pb-2">
        <ol className="flex w-max gap-2 md:w-auto md:flex-wrap">
          {list.map((e) => {
            const rank = 1 + list.filter((o) => o.score > e.score).length;
            const podium = rank <= 3 && e.score > 0 ? PODIUM[rank - 1] : null;
            return (
              <motion.li
                key={e.p.id}
                layout
                transition={{ type: 'spring', stiffness: 300, damping: 26 }}
                className={cn(
                  'relative flex h-11 items-center gap-1.5 rounded-full border-2 py-1 pr-3 pl-1.5',
                  e.p.id === meId ? 'border-cream/70 bg-white/14' : 'border-white/12 bg-white/6',
                )}
              >
                <span className="flex w-6 shrink-0 items-center justify-center text-cream">
                  {podium ? (
                    <Icon name={podium.icon} fill={podium.fill} className="size-5" label={`#${rank}`} />
                  ) : (
                    <span className="font-mono text-xs font-bold text-grape-300">#{rank}</span>
                  )}
                </span>
                <Avatar player={e.p} size="xs" crown={false} />
                <span className="max-w-[6.5rem] truncate text-sm font-extrabold">{e.p.name}</span>
                <Stamp size="sm" className="ml-0.5">
                  {e.score}
                </Stamp>
                <AnimatePresence>
                  {e.gained && (
                    <motion.span
                      className="absolute -top-2.5 -right-1.5 rounded-md border-2 border-ink bg-mint px-1 py-px font-mono text-[10px] leading-none font-bold text-ink shadow-[0_2px_0_0_var(--color-ink)]"
                      initial={{ scale: 0, y: 8, rotate: 0 }}
                      animate={{ scale: 1, y: 0, rotate: 6 }}
                      transition={{ type: 'spring', stiffness: 600, damping: 16, delay: 0.9 }}
                    >
                      +{POINTS_PER_CORRECT}
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
