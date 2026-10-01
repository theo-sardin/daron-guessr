import { AnimatePresence, motion } from 'motion/react';
import type { PublicPlayer } from '../../../shared/protocol';
import { Avatar } from '../../components/Avatar';
import { useT } from '../../i18n';
import { cn } from '../../lib/util';

const MAX_FACES = 4;
const TILTS = [-6, 4, -3, 5];

/**
 * Bottom of the page: the little stack of players who already voted (owner decoys included, so
 * nobody can tell), "4/5 voted" in bold and who we're still waiting for in blue ballpoint.
 */
export function VotersStrip({
  players,
  votedIds,
  compact,
  className,
}: {
  players: PublicPlayer[];
  votedIds: string[];
  /** Phone with the host's skip button: no faces, just the count and the note. */
  compact?: boolean;
  className?: string;
}) {
  const t = useT();
  const voters = players.filter((p) => votedIds.includes(p.id));
  const waiting = players.filter((p) => p.connected && !votedIds.includes(p.id));
  const total = voters.length + waiting.length;
  const shown = voters.slice(-MAX_FACES);
  const note =
    waiting.length === 0
      ? t('voting.status.allIn')
      : waiting.length === 1
        ? t('voting.status.waitOne', { name: waiting[0].name })
        : waiting.length === 2
          ? t('voting.status.waitTwo', { a: waiting[0].name, b: waiting[1].name })
          : t('voting.status.waitMany', { count: waiting.length });
  return (
    <div className={cn('flex min-w-0 items-center gap-2.5', className)}>
      <div className={cn('flex shrink-0 pr-2 max-[359px]:hidden', compact && 'max-sm:hidden')} aria-hidden>
        <AnimatePresence initial={false}>
          {shown.map((p, i) => (
            <motion.span
              key={p.id}
              layout
              initial={{ scale: 0, rotate: -40 }}
              animate={{ scale: 1, rotate: 0 }}
              exit={{ scale: 0 }}
              transition={{ type: 'spring', stiffness: 520, damping: 18 }}
              className="-mr-2"
            >
              <Avatar player={p} size="xs" crown={false} selfie tilt={TILTS[i % TILTS.length]} className="scale-[1.07]" />
            </motion.span>
          ))}
        </AnimatePresence>
        {waiting.length > 0 && (
          <span className="-mr-2 flex size-[30px] items-center justify-center rounded-full border-2 border-dashed border-ink/40 text-[13px] font-extrabold text-ink-soft">
            ?
          </span>
        )}
      </div>
      <div className="min-w-0 leading-none" aria-live="polite">
        <p className="whitespace-nowrap">
          <span className="font-num text-[1.4rem]">
            {voters.length}/{total}
          </span>{' '}
          <span className="text-[0.95rem] font-bold">{t('voting.voted')}</span>
        </p>
        <p className="text-pen mt-0.5 truncate text-[1.05rem]">{note}</p>
      </div>
    </div>
  );
}
