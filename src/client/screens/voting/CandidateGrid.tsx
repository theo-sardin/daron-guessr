import { AnimatePresence, motion } from 'motion/react';
import type { PublicPlayer } from '../../../shared/protocol';
import { Avatar } from '../../components/Avatar';
import { useT } from '../../i18n';
import { cn } from '../../lib/util';

const UNKNOWN: Pick<PublicPlayer, 'avatar' | 'color' | 'name'> = { avatar: '❓', color: '#b9a6ff', name: '?' };

/**
 * The big "whose is it?" buttons. `selected` is the (optimistic) vote; `decoy` switches
 * the accent when the viewer is voting on their own photo.
 */
export function CandidateGrid({
  candidates,
  players,
  selected,
  enabled,
  decoy,
  onPick,
  className,
}: {
  candidates: string[];
  players: Map<string, PublicPlayer>;
  selected: string | null;
  enabled: boolean;
  decoy: boolean;
  onPick: (id: string, el: HTMLElement) => void;
  className?: string;
}) {
  const t = useT();
  return (
    <motion.ul
      className={cn(
        'grid grid-cols-2 gap-3 sm:gap-4',
        candidates.length <= 2
          ? 'sm:grid-cols-2'
          : candidates.length === 4 || candidates.length > 6
            ? 'sm:grid-cols-3 lg:grid-cols-4'
            : 'sm:grid-cols-3',
        className,
      )}
      initial="hidden"
      animate="shown"
      variants={{ shown: { transition: { staggerChildren: 0.04 } } }}
    >
      {candidates.map((id) => {
        const p = players.get(id);
        const player = p ?? UNKNOWN;
        const isSel = selected === id;
        return (
          <motion.li
            key={id}
            className="min-w-0"
            variants={{ hidden: { opacity: 0, y: 18, scale: 0.9 }, shown: { opacity: 1, y: 0, scale: 1 } }}
            transition={{ type: 'spring', stiffness: 420, damping: 24 }}
          >
            <motion.button
              type="button"
              disabled={!enabled}
              aria-pressed={isSel}
              aria-label={t('voting.voteFor', { name: player.name })}
              onClick={(e) => onPick(id, e.currentTarget)}
              whileTap={enabled ? { scale: 0.93, y: 3 } : undefined}
              whileHover={enabled && !isSel ? { y: -2, rotate: -1 } : undefined}
              animate={
                isSel
                  ? { scale: [1, 1.1, 1.03], rotate: [0, -3, 1.5], transition: { duration: 0.42, ease: 'easeOut' } }
                  : { scale: 1, rotate: 0 }
              }
              transition={{ type: 'spring', stiffness: 500, damping: 17 }}
              className={cn(
                'relative flex min-h-16 w-full items-center gap-2.5 rounded-2xl border-3 border-ink px-2.5 py-2 text-left text-ink shadow-pop',
                'lg:min-h-28 lg:flex-col lg:justify-center lg:gap-1.5 lg:px-2 lg:py-3 lg:text-center',
                'transition-[background-color,opacity,outline-color] duration-150 disabled:cursor-default',
                isSel ? (decoy ? 'bg-lilac' : 'bg-sun') : 'bg-cream',
                !enabled && !isSel && 'opacity-60',
              )}
              style={{
                outline: '4px solid',
                outlineOffset: 3,
                outlineColor: isSel ? player.color : 'transparent',
              }}
            >
              <span className="flex lg:hidden">
                <Avatar player={player} size="md" crown={false} />
              </span>
              <span className="hidden lg:flex">
                <Avatar player={player} size="lg" crown={false} />
              </span>
              <span className="line-clamp-2 min-w-0 flex-1 font-display text-lg leading-[1.1] break-words lg:w-full lg:flex-none">{player.name}</span>
              <AnimatePresence>
                {isSel && (
                  <motion.span
                    key="stamp"
                    initial={{ scale: 2.4, rotate: -35, opacity: 0 }}
                    animate={{ scale: 1, rotate: 14, opacity: 1 }}
                    exit={{ scale: 0, rotate: 40, opacity: 0 }}
                    transition={{ type: 'spring', stiffness: 520, damping: 15 }}
                    className={cn(
                      'absolute -top-3.5 -right-2.5 flex items-center gap-1 rounded-full border-3 border-ink px-2 py-0.5 font-display text-sm leading-none shadow-pop-sm',
                      decoy ? 'bg-tangerine text-ink' : 'bg-mint text-ink',
                    )}
                  >
                    <span aria-hidden>{decoy ? '🎭' : '✓'}</span>
                    <span>{decoy ? t('voting.decoy') : t('voting.myPick')}</span>
                  </motion.span>
                )}
              </AnimatePresence>
            </motion.button>
          </motion.li>
        );
      })}
    </motion.ul>
  );
}
