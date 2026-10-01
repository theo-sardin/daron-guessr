import { motion, useInView } from 'motion/react';
import { useRef, type CSSProperties } from 'react';
import type { PublicPlayer, RankingEntry } from '../../../shared/protocol';
import { Avatar } from '../../components/Avatar';
import { Annotation, Highlight, MarkerCircle } from '../../components/Marker';
import { NotebookCard } from '../../components/Paper';
import { useI18n } from '../../i18n';
import { cn } from '../../lib/util';
import { CountUp } from './CountUp';
import { playerOr, shameOf } from './helpers';

/** One row per rule of the notebook page (taller in blur games: the speed bonus gets its own line). */
const ROW = 66;
const ROW_BONUS = 82;
/** The rank is written in the margin, left of the red line. */
const MARGIN = 40;

function Row({
  entry,
  player,
  isMe,
  shame,
  index,
  ready,
  height,
}: {
  height: number;
  entry: RankingEntry;
  player: PublicPlayer;
  isMe: boolean;
  /** Last, alone: "the shame" scribbled next to it. */
  shame: boolean;
  index: number;
  ready: boolean;
}) {
  const { t } = useI18n();
  const ref = useRef<HTMLLIElement>(null);
  const inView = useInView(ref, { once: true, margin: '0px 0px -40px 0px' });
  const show = ready && inView;
  const delay = Math.min(index, 6) * 0.07;
  const first = entry.rank === 1 && entry.score > 0;

  const rankNumber = (
    <span className={cn('font-num text-[22px]', first ? 'text-red-ink' : 'text-ink')} aria-hidden>
      {entry.rank}
    </span>
  );

  return (
    <motion.li
      ref={ref}
      className="relative flex items-center gap-2.5 pr-1"
      style={{ height }}
      initial={{ opacity: 0, x: -24 }}
      animate={show ? { opacity: 1, x: 0 } : undefined}
      transition={{ type: 'spring', stiffness: 420, damping: 28, delay }}
    >
      <span className="sr-only">{t('results.mine.rank', { rank: entry.rank })}</span>
      {/* Rank in the margin (circled in red for the winners). */}
      <span className="absolute top-0 flex h-full items-center justify-center" style={{ left: -(MARGIN + 13), width: MARGIN }}>
        {first ? (
          <MarkerCircle pad={7} strokeWidth={2.6} show={show} delay={delay + 0.4} className="flex">
            {rankNumber}
          </MarkerCircle>
        ) : (
          rankNumber
        )}
      </span>
      <Avatar player={player} size="md" crown={false} selfie tilt={index % 2 ? 4 : -3} />
      <div className="min-w-0 flex-1">
        <div className="flex min-w-0 items-baseline gap-1.5">
          <span className="min-w-0 truncate font-display text-[17px] leading-tight sm:text-lg">
            {isMe ? (
              <Highlight animate={show} delay={delay + 0.3}>
                {player.name}
              </Highlight>
            ) : (
              player.name
            )}
          </span>
          {isMe && <span className="label-type shrink-0">{t('common.youTag')}</span>}
        </div>
        <div className="text-pen truncate text-[17px] leading-[1.1]">
          {entry.guesses > 0 ? t('results.ranking.guessedRight', { correct: entry.correct, guesses: entry.guesses }) : t('results.ranking.noGuesses')}
        </div>
        {entry.bonus > 0 && <div className="text-pen truncate text-[16px] leading-[1.05] text-red-ink!">{t('results.ranking.bonus', { bonus: entry.bonus })}</div>}
      </div>
      <span className="flex shrink-0 flex-col items-end leading-none">
        <span className="font-num text-[26px]">
          <CountUp to={entry.score} start={show} delay={delay + 0.15} />
        </span>
        <span className="label-type mt-0.5">{t('results.pts')}</span>
      </span>
      {shame && (
        <span className="pointer-events-none absolute right-12 -bottom-2.5 z-10" aria-hidden>
          <Annotation rotate={-5} size={18} animate={show} delay={delay + 0.6}>
            ← {t('results.notes.shame')}
          </Annotation>
        </span>
      )}
    </motion.li>
  );
}

/**
 * Everybody, best first, written on a page of a notebook: the rank in the margin, one player
 * per rule, the score on the right. `ready` holds the entrance until the podium is done.
 */
export function RankingList({
  ranking,
  players,
  meId,
  ready,
}: {
  ranking: RankingEntry[];
  players: Map<string, PublicPlayer>;
  meId: string;
  ready: boolean;
}) {
  const shame = shameOf(ranking);
  const pad = 10;
  const row = ranking.some((r) => r.bonus > 0) ? ROW_BONUS : ROW;
  return (
    <NotebookCard
      margin={MARGIN}
      tape="yellow"
      tilt={-0.6}
      className="pr-3 pb-5"
      style={{ '--line': `${row}px`, '--line-y': `${pad}px`, paddingTop: pad } as CSSProperties}
    >
      <ol className="flex flex-col">
        {ranking.map((entry, i) => (
          <Row
            key={entry.playerId}
            entry={entry}
            player={playerOr(players, entry.playerId)}
            isMe={entry.playerId === meId}
            shame={entry.playerId === shame}
            index={i}
            ready={ready}
            height={row}
          />
        ))}
      </ol>
    </NotebookCard>
  );
}
