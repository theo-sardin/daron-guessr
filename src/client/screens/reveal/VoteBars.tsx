import { animate, AnimatePresence, motion } from 'motion/react';
import { useEffect, useState } from 'react';
import type { PublicPlayer } from '../../../shared/protocol';
import { Avatar } from '../../components/Avatar';
import { Annotation } from '../../components/Marker';
import { TornPaper } from '../../components/TornPaper';
import { useI18n } from '../../i18n';
import { cn } from '../../lib/util';
import { barStagger } from './effects';
import { playerOrGhost, type Row } from './timeline';

/** A number counting up from 0 (the vote counts tick up with their strip). */
function useCountUp(value: number, delay: number): number {
  const [n, setN] = useState(0);
  useEffect(() => {
    const controls = animate(0, value, { duration: 0.7, delay, ease: 'easeOut', onUpdate: (v) => setN(Math.round(v)) });
    return () => controls.stop();
  }, [value, delay]);
  return n;
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
 * "les votes": one kraft paper strip per candidate who got votes (sorted), as long as its share,
 * with the voters' stickers on it (public votes) or ballpoint tally marks (anonymous), and a big
 * bold count. At the reveal, the owner's row gets highlighted, its strip turns red and a marker
 * note points at it; the others fade.
 */
export function VoteBars({ rows, totalVotes, byId, meId, myPickId, ownerId }: VoteBarsProps) {
  const { t } = useI18n();
  const dense = rows.length > 5;
  const stagger = barStagger(rows.length);
  const max = Math.max(1, ...rows.map((r) => r.votes));

  return (
    <section className="w-full">
      <h2 className="label-type mb-1.5 flex items-center gap-2 text-[12.5px] after:h-px after:flex-1 after:bg-ink/45">
        {t('reveal.votesLabel')}
        <span className="order-last font-sans text-[12px] font-extrabold tracking-normal normal-case">
          {totalVotes === 1 ? t('reveal.votes.one') : t('reveal.votes.many', { count: totalVotes })}
        </span>
      </h2>

      {totalVotes === 0 && (
        <motion.div className="relative py-3 text-center" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <p className="font-display text-[1.6rem] leading-tight">{t('reveal.noVotes')}</p>
          <Annotation font="pen" size={22} rotate={-2} delay={0.3}>
            {t('reveal.noVotesSub')}
          </Annotation>
        </motion.div>
      )}

      <ul className={cn('flex flex-col', dense ? 'gap-0.5' : 'gap-1')}>
        <AnimatePresence initial={true}>
          {rows.map((row, i) => (
            <BarRow
              key={row.id}
              row={row}
              player={playerOrGhost(byId, row.id)}
              voters={row.voters?.map((id) => playerOrGhost(byId, id)) ?? null}
              share={row.votes / max}
              delay={row.votes === 0 ? 0.25 : i * stagger}
              dense={dense}
              isMe={row.id === meId}
              isMyPick={row.id === myPickId}
              ownerId={ownerId}
            />
          ))}
        </AnimatePresence>
      </ul>
    </section>
  );
}

function BarRow({
  row,
  player: p,
  voters,
  share,
  delay,
  dense,
  isMe,
  isMyPick,
  ownerId,
}: {
  row: Row;
  player: PublicPlayer;
  voters: PublicPlayer[] | null;
  share: number;
  delay: number;
  dense: boolean;
  isMe: boolean;
  isMyPick: boolean;
  ownerId: string | null;
}) {
  const { t } = useI18n();
  const count = useCountUp(row.votes, delay + 0.1);
  const isOwner = ownerId !== null && row.id === ownerId;
  const dim = ownerId !== null && !isOwner;
  const pct = Math.round(share * 100);
  const maxStickers = dense ? 4 : 5;
  const note = isOwner ? t(isMyPick ? 'reveal.note.rightMine' : 'reveal.note.right') : isMyPick ? t('reveal.note.mine') : null;
  // A short strip leaves room for the note after it; a long one gets the note on a paper tag.
  const noteAfter = pct <= 46;

  return (
    <motion.li
      layout="position"
      className={cn('relative grid items-center gap-x-2', dense ? 'h-10 grid-cols-[28px_minmax(0,5.5rem)_minmax(0,1fr)_2.75rem]' : 'h-[50px] grid-cols-[36px_minmax(0,6.5rem)_minmax(0,1fr)_3.25rem]')}
      initial={{ opacity: 0, x: -24 }}
      animate={{ opacity: dim ? 0.5 : 1, x: 0 }}
      transition={{ x: { delay, type: 'spring', stiffness: 420, damping: 28 }, opacity: { duration: 0.3, delay: dim ? 0 : delay } }}
    >
      <AnimatePresence>
        {isOwner && (
          <motion.span
            key="hl"
            aria-hidden
            className="absolute -inset-x-2 top-0.5 bottom-0.5 -z-10 -rotate-[0.8deg] -skew-x-6 rounded-[4px_10px_5px_12px] bg-yellow"
            style={{ originX: 0 }}
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ duration: 0.35, ease: [0.3, 0.7, 0.2, 1], delay: 0.15 }}
          />
        )}
      </AnimatePresence>
      <Avatar player={p} size={dense ? 'xs' : 'sm'} crown={false} dimOffline={false} tilt={-4} selfie />
      <span className="min-w-0">
        <span className={cn('block truncate font-extrabold tracking-[-0.01em]', dense ? 'text-[15px]' : 'text-[18px]')}>{p.name}</span>
        {isMe && <span className="label-type block text-[10px] leading-none">{t('common.youTag')}</span>}
      </span>
      <div className={cn('relative', dense ? 'h-7' : 'h-8')}>
        <motion.div
          className="h-full"
          initial={{ width: '0%' }}
          animate={{ width: `max(${voters && voters.length > 0 ? Math.min(voters.length, maxStickers + 1) * (dense ? 19 : 23) + 10 : 28}px, ${pct}%)` }}
          transition={{ delay: delay + 0.1, type: 'spring', stiffness: 110, damping: 18 }}
        >
          {row.votes > 0 && (
            <TornPaper
              surface={isOwner ? 'red' : 'kraft'}
              edges="r"
              amp={3}
              fiber={false}
              lift
              seed={row.id}
              className={cn('flex h-full items-center overflow-hidden pl-1 transition-colors duration-300', dense ? 'h-7' : 'h-8')}
              wrapperClassName="h-full"
            >
              {voters ? (
                <span className="flex items-center">
                  {voters.slice(0, maxStickers).map((v, j) => (
                    <motion.span
                      key={v.id}
                      className={cn('shrink-0', dense ? '-mr-2' : '-mr-1.5')}
                      initial={{ scale: 0 }}
                      animate={{ scale: dense ? 0.8 : 0.86 }}
                      transition={{ delay: delay + 0.35 + j * 0.06, type: 'spring', stiffness: 600, damping: 18 }}
                    >
                      <Avatar player={v} size="xs" crown={false} dimOffline={false} selfie />
                    </motion.span>
                  ))}
                  {voters.length > maxStickers && (
                    <span className="ml-2.5 shrink-0 font-display text-[13px] leading-none">+{voters.length - maxStickers}</span>
                  )}
                </span>
              ) : (
                <TallyMarks n={row.votes} delay={delay + 0.3} light={isOwner} />
              )}
            </TornPaper>
          )}
        </motion.div>
        {note && (
          <span
            className={cn(
              'pointer-events-none absolute z-10 whitespace-nowrap',
              noteAfter ? 'top-1/2 -translate-y-1/2' : 'right-0 -bottom-3 rotate-[-3deg] bg-sheet px-1 shadow-paper-sm',
            )}
            style={noteAfter ? { left: `calc(max(${pct}%, 28px) + 6px)` } : undefined}
          >
            <Annotation font={isOwner ? 'marker' : 'pen'} size={isOwner ? (dense ? 13 : 15) : dense ? 16 : 19} rotate={noteAfter ? -4 : 0} delay={isOwner ? 0.6 : delay + 0.5}>
              {noteAfter ? `← ${note}` : note}
            </Annotation>
          </span>
        )}
      </div>
      <span className={cn('text-right leading-[0.85]', isOwner && 'text-red-ink')}>
        <span className={cn('block font-display', dense ? 'text-[24px]' : 'text-[30px]')} aria-label={String(row.votes)}>
          {count}
        </span>
        <small className="mt-0.5 block text-[11px] font-bold opacity-80">{row.votes === 1 ? t('reveal.voteUnit.one') : t('reveal.voteUnit.many')}</small>
      </span>
    </motion.li>
  );
}

/** Ballpoint tally marks on the strip (anonymous votes: we count, we don't tell who). */
function TallyMarks({ n, delay, light }: { n: number; delay: number; light: boolean }) {
  const groups = Math.ceil(Math.min(n, 10) / 5);
  const color = light ? '#fff' : 'var(--color-blue)';
  return (
    <span className="flex items-center gap-1.5 pl-1" aria-hidden>
      {Array.from({ length: groups }, (_, g) => {
        const k = Math.min(5, Math.min(n, 10) - g * 5);
        return (
          <svg key={g} viewBox="0 0 30 22" className="h-[20px] w-[27px] overflow-visible">
            {Array.from({ length: Math.min(4, k) }, (_, i) => (
              <motion.line
                key={i}
                x1={4 + i * 6}
                y1={3}
                x2={3 + i * 6}
                y2={19}
                stroke={color}
                strokeWidth="2.6"
                strokeLinecap="round"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 0.12, delay: delay + (g * 5 + i) * 0.07 }}
              />
            ))}
            {k === 5 && (
              <motion.line
                x1={0}
                y1={16}
                x2={26}
                y2={5}
                stroke={color}
                strokeWidth="2.6"
                strokeLinecap="round"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 0.15, delay: delay + (g * 5 + 4) * 0.07 }}
              />
            )}
          </svg>
        );
      })}
      {n > 10 && <span className="font-display text-[13px] leading-none">+{n - 10}</span>}
    </span>
  );
}
