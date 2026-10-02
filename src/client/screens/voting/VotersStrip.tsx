import { AnimatePresence, motion } from 'motion/react';
import type { PublicPlayer } from '../../../shared/protocol';
import { Avatar } from '../../components/Avatar';
import { useT } from '../../i18n';
import { cn } from '../../lib/util';

/** Connected players, plus anyone who voted before dropping (their vote still counts). */
function present(players: PublicPlayer[], voted: Set<string>) {
  return players.filter((p) => p.connected || voted.has(p.id));
}

/**
 * Everybody still around, in join order (with their selfie when they have one): a ✓ pops on
 * each avatar as they vote. Only *whether* someone voted is shown, never for whom, and owner
 * decoys count like any vote so nobody can tell whose photo it is.
 */
export function VotersStrip({ players, votedIds, meId, active }: { players: PublicPlayer[]; votedIds: string[]; meId: string; active: boolean }) {
  const t = useT();
  const voted = new Set(votedIds);
  const shown = present(players, voted);
  const count = shown.filter((p) => voted.has(p.id)).length;
  const all = active && shown.length > 0 && count === shown.length;

  return (
    <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1.5" role="group" aria-label={t('voting.whoVoted')}>
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
                <Avatar player={p} size="xs" crown={false} selfie className={cn(p.id === meId && 'rounded-full ring-2 ring-cream')} />
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

/**
 * "Waiting for Paul…": who the round is still waiting for (connected players who have not voted
 * yet), when only one or two are left; null otherwise (the strip's count says it). Shown under
 * the status once you have voted yourself.
 */
export function useWaitingNote(players: PublicPlayer[], votedIds: string[]): string | null {
  const t = useT();
  const voted = new Set(votedIds);
  const waiting = players.filter((p) => p.connected && !voted.has(p.id));
  if (waiting.length === 1) return t('voting.waitOne', { name: waiting[0].name });
  if (waiting.length === 2) return t('voting.waitTwo', { a: waiting[0].name, b: waiting[1].name });
  return null;
}
