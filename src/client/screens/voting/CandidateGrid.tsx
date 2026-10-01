import { motion } from 'motion/react';
import type { PublicPlayer } from '../../../shared/protocol';
import { Avatar } from '../../components/Avatar';
import { Icon } from '../../components/Icon';
import { MarkerCheck, MarkerCircle } from '../../components/Marker';
import { TornPaper } from '../../components/TornPaper';
import { useT } from '../../i18n';
import { cn } from '../../lib/util';
import { hashOf } from './quips';

const UNKNOWN: Pick<PublicPlayer, 'avatar' | 'color' | 'name'> = { avatar: '❓', color: '#c9b8f0', name: '?' };

/** A small stable tilt per player, so the cards look slapped on by hand (never the same twice). */
const tiltOf = (id: string) => ((hashOf(id) % 25) - 12) / 10;

/**
 * The "whose is it?" buttons: paper cards with the player's selfie (big enough to compare faces
 * with the photo) or emoji. The (optimistic) vote is a yellow card circled in red marker with a
 * check; `decoy` (voting on your own photo) swaps the check for a little mask and a pink card.
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
  // Faces need room: as soon as one candidate has a selfie, every card gets the big disc.
  const faces = candidates.some((id) => players.get(id)?.selfieUrl);
  // Desktop with many candidates: 3 narrow columns, the face on top of the name.
  const crowded = candidates.length > 6;
  return (
    <motion.ul
      className={cn(
        'grid grid-cols-2 gap-x-3 gap-y-3.5 sm:gap-x-4',
        // Phone: 2 columns. Tablet: 3 (2 when there are only 2 or 4). Desktop (right half of the page): 2, 3 when crowded.
        candidates.length <= 2 || candidates.length === 4 ? 'sm:grid-cols-2' : 'sm:grid-cols-3 lg:grid-cols-2',
        candidates.length > 6 && 'lg:grid-cols-3',
        className,
      )}
      initial="hidden"
      animate="shown"
      variants={{ shown: { transition: { staggerChildren: 0.04 } } }}
    >
      {candidates.map((id) => {
        const player = players.get(id) ?? UNKNOWN;
        const isSel = selected === id;
        const tilt = tiltOf(id);
        return (
          <motion.li
            key={id}
            className={cn('relative min-w-0', isSel && 'z-10')}
            variants={{ hidden: { opacity: 0, y: 16, rotate: tilt * 4, scale: 0.92 }, shown: { opacity: 1, y: 0, rotate: tilt, scale: 1 } }}
            transition={{ type: 'spring', stiffness: 420, damping: 22 }}
          >
            <motion.button
              type="button"
              disabled={!enabled}
              aria-pressed={isSel}
              aria-label={t('voting.voteFor', { name: player.name })}
              onClick={(e) => onPick(id, e.currentTarget)}
              whileTap={enabled ? { scale: 0.94, y: 2 } : undefined}
              whileHover={enabled && !isSel ? { y: -2, rotate: -0.6 } : undefined}
              transition={{ type: 'spring', stiffness: 500, damping: 18 }}
              className={cn('block h-full w-full text-left text-ink disabled:cursor-default', !enabled && !isSel && 'opacity-55')}
            >
              <MarkerCircle show={isSel} pad={9} className="block h-full w-full" sound={false} seed={id}>
                <TornPaper
                  surface={isSel ? (decoy ? 'pink' : 'postit') : 'sheet'}
                  edges="tb"
                  amp={1.5}
                  lift
                  seed={id}
                  wrapperClassName="h-full"
                  className={cn(
                    'flex h-full items-center gap-2.5 py-2 pr-2.5 pl-2 transition-colors duration-150',
                    faces ? 'min-h-[76px]' : 'min-h-[62px]',
                    'lg:min-h-[84px]',
                    crowded && 'lg:flex-col lg:justify-center lg:gap-1.5 lg:px-2 lg:text-center',
                  )}
                >
                  <Avatar player={player} size={faces ? 'lg' : 'md'} selfie crown={false} tilt={-tilt * 2} className="max-[359px]:scale-90" />
                  <span
                    className={cn(
                      'line-clamp-2 min-w-0 flex-1 text-[1.15rem] leading-[1.08] font-extrabold tracking-[-0.01em] break-words sm:text-[1.3rem]',
                      crowded && 'lg:w-full lg:flex-none lg:text-[1.15rem]',
                    )}
                  >
                    {player.name}
                  </span>
                </TornPaper>
              </MarkerCircle>
            </motion.button>
            {isSel &&
              (decoy ? (
                <motion.span
                  aria-hidden
                  className="pointer-events-none absolute -top-3 -right-1.5 z-20 text-red-ink"
                  initial={{ scale: 0, rotate: -40 }}
                  animate={{ scale: 1, rotate: -8 }}
                  transition={{ type: 'spring', stiffness: 520, damping: 14, delay: 0.25 }}
                >
                  <Icon name="mask" className="size-[26px]" weight="bold" />
                </motion.span>
              ) : (
                <MarkerCheck delay={0.3} className="absolute -top-3.5 -right-1.5 z-20 size-[34px]" />
              ))}
          </motion.li>
        );
      })}
    </motion.ul>
  );
}
