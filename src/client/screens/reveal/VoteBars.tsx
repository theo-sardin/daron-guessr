import { animate, AnimatePresence, motion } from 'motion/react';
import { useEffect, useState } from 'react';
import type { PublicPlayer } from '../../../shared/protocol';
import { Avatar } from '../../components/Avatar';
import { Card } from '../../components/Card';
import { Icon } from '../../components/Icon';
import { IconBadge } from '../../components/IconBadge';
import { pad, Stamp } from '../../components/Stamp';
import { useT } from '../../i18n';
import { cn } from '../../lib/util';
import { barStagger } from './effects';
import { playerOrGhost, type Row } from './timeline';

/** A number counting up from 0 (the vote counts tick up with their bar). */
function useCountUp(value: number, delay: number): number {
  const [n, setN] = useState(0);
  useEffect(() => {
    const controls = animate(0, value, { duration: 0.8, delay, ease: 'easeOut', onUpdate: (v) => setN(Math.round(v)) });
    return () => controls.stop();
  }, [value, delay]);
  return n;
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
  totalVotes: number;
  byId: Map<string, PublicPlayer>;
  meId: string;
  /** Candidate the viewer picked, when it should be marked. */
  myPickId: string | null;
  /** Only set once the owner is revealed. */
  ownerId: string | null;
}

/**
 * Vote chart, printed like a lab sheet: one ink bar per candidate that received votes
 * (sorted), counts as date-stamp digits. Color arrives with the answer: once the owner is
 * revealed their bar floods with their color and the other rows fade out.
 */
export function VoteBars({ rows, totalVotes, byId, meId, myPickId, ownerId }: VoteBarsProps) {
  const t = useT();
  const dense = rows.length > 5;
  const stagger = barStagger(rows.length);

  return (
    <Card tone="cream" padded={false} className="w-full p-3 sm:p-4" initial={{ opacity: 0, y: 30, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }}>
      <div className="mb-2 flex items-center gap-1.5 px-1 text-ink-soft">
        <Icon name="ballot" className="size-4" />
        <span className="label-mono">{totalVotes === 1 ? t('reveal.votes.one') : t('reveal.votes.many', { count: totalVotes })}</span>
      </div>

      {totalVotes === 0 && (
        <div className="flex flex-col items-center pt-2 pb-3 text-center">
          <motion.span
            className="inline-flex"
            animate={{ rotate: [-6, 6, -6], y: [0, -4, 0] }}
            transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
          >
            <IconBadge name="ballot" tone="cream" size="lg" />
          </motion.span>
          <p className="mt-3 font-display text-2xl leading-tight">{t('reveal.noVotes')}</p>
          <p className="text-sm font-bold text-ink-soft">{t('reveal.noVotesSub')}</p>
        </div>
      )}

      <ul className={cn('flex flex-col', dense ? 'gap-1' : 'gap-1.5')}>
        <AnimatePresence initial={true}>
          {rows.map((row, i) => (
            <BarRow
              key={row.id}
              row={row}
              player={playerOrGhost(byId, row.id)}
              voters={row.voters?.map((id) => playerOrGhost(byId, id)) ?? null}
              totalVotes={totalVotes}
              delay={row.votes === 0 ? 0.25 : i * stagger}
              dense={dense}
              isMe={row.id === meId}
              isMyPick={row.id === myPickId}
              ownerId={ownerId}
            />
          ))}
        </AnimatePresence>
      </ul>
    </Card>
  );
}

function BarRow({
  row,
  player: p,
  voters,
  totalVotes,
  delay,
  dense,
  isMe,
  isMyPick,
  ownerId,
}: {
  row: Row;
  player: PublicPlayer;
  voters: PublicPlayer[] | null;
  totalVotes: number;
  delay: number;
  dense: boolean;
  isMe: boolean;
  isMyPick: boolean;
  ownerId: string | null;
}) {
  const t = useT();
  const count = useCountUp(row.votes, delay + 0.1);
  const isOwner = ownerId !== null && row.id === ownerId;
  const dim = ownerId !== null && !isOwner;
  const pct = totalVotes > 0 ? (row.votes / totalVotes) * 100 : 0;

  return (
    <motion.li
      layout="position"
      initial={{ opacity: 0, x: -28, scale: 0.9 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      transition={{ delay, type: 'spring', stiffness: 420, damping: 26 }}
    >
      <motion.div
        className={cn(
          'relative flex items-center rounded-2xl border-3 transition-colors duration-300',
          dense ? 'gap-2 px-1.5 py-1' : 'gap-2.5 px-2 py-1.5',
          isOwner ? 'border-ink bg-white shadow-pop-sm' : 'border-transparent',
        )}
        animate={{
          opacity: dim ? 0.62 : 1,
          scale: isOwner ? [1, 1.06, 1] : 1,
        }}
        transition={{ opacity: { duration: 0.35 }, scale: { duration: 0.45, delay: 0.1 } }}
      >
        <Avatar player={p} size={dense ? 'xs' : 'sm'} crown={false} dimOffline={false} />
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-center gap-1.5">
            <span className={cn('min-w-0 truncate font-extrabold', dense && 'text-sm')}>{p.name}</span>
            {isMe && <span className="shrink-0 text-xs font-bold text-ink-soft">{t('common.youTag')}</span>}
            {isMyPick && (
              <span className="inline-flex shrink-0 items-center gap-1 rounded-md bg-ink py-[3px] pr-1.5 pl-1 text-cream">
                <Icon name="hand" className="size-3" />
                <span className="font-mono text-[10px] leading-none font-bold tracking-[0.08em] uppercase">{t('reveal.yourPick')}</span>
              </span>
            )}
          </div>
          <div className={cn('mt-1 flex rounded-full bg-ink/10', voters ? (dense ? 'h-6' : 'h-7') : dense ? 'h-3' : 'h-4')}>
            <motion.div
              className={cn(
                'flex h-full items-center -space-x-1 overflow-hidden rounded-full transition-[background-color] duration-500',
                row.votes > 0 ? 'border-2 border-ink px-0.5' : 'border-0 p-0',
              )}
              style={{
                // Ink until the answer is out; then only the owner's bar gets a color (theirs).
                backgroundColor: isOwner ? p.color : dim ? 'rgb(27 16 54 / 0.45)' : 'var(--color-ink)',
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
        {/* Two digits like a camera counter: a lone DSEG "1" reads as a stray bar. */}
        <Stamp
          glow={false}
          size={dense ? 'md' : 'lg'}
          className={cn('shrink-0 items-end', dense ? 'w-10' : 'w-12')}
          valueClassName={dense ? undefined : 'text-[1.6rem]'}
          ariaLabel={String(row.votes)}
        >
          {pad(count)}
        </Stamp>
        {isOwner && (
          <motion.span
            className="absolute -top-3 -right-3"
            initial={{ scale: 0, rotate: -40 }}
            animate={{ scale: 1, rotate: 8 }}
            transition={{ type: 'spring', stiffness: 600, damping: 15, delay: 0.3 }}
          >
            <IconBadge name="check" tone="ink" size="xs" />
          </motion.span>
        )}
      </motion.div>
    </motion.li>
  );
}
