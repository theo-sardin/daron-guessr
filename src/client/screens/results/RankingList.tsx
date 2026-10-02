import { motion, useInView } from 'motion/react';
import { useRef } from 'react';
import type { PublicPlayer, RankingEntry } from '../../../shared/protocol';
import { Avatar } from '../../components/Avatar';
import { useI18n } from '../../i18n';
import { cn } from '../../lib/util';
import { CountUp } from './CountUp';
import { playerOr, shameOf } from './helpers';

const MEDALS: Record<number, string> = { 1: '🥇', 2: '🥈', 3: '🥉' };

function Row({
  entry,
  player,
  isMe,
  shame,
  showBonus,
  maxScore,
  index,
  ready,
}: {
  entry: RankingEntry;
  player: PublicPlayer;
  isMe: boolean;
  /** Last, alone: "the shame" sticker on the row. */
  shame: boolean;
  /** Blur game: the speed bonus included in the score gets its own line. */
  showBonus: boolean;
  maxScore: number;
  index: number;
  ready: boolean;
}) {
  const { t } = useI18n();
  const ref = useRef<HTMLLIElement>(null);
  const inView = useInView(ref, { once: true, margin: '0px 0px -40px 0px' });
  const show = ready && inView;
  const delay = Math.min(index, 6) * 0.07;
  const fill = maxScore > 0 ? entry.score / maxScore : 0;
  const rank = t('results.mine.rank', { rank: entry.rank });

  return (
    <motion.li
      ref={ref}
      className={cn(
        'relative flex items-center gap-3 rounded-2xl border-3 border-ink px-3 py-2.5 text-ink shadow-pop-sm',
        isMe ? 'bg-sun' : 'bg-cream',
      )}
      initial={{ opacity: 0, x: -40, scale: 0.9 }}
      animate={show ? { opacity: 1, x: 0, scale: 1 } : undefined}
      transition={{ type: 'spring', stiffness: 420, damping: 26, delay }}
    >
      <span className="flex w-9 shrink-0 items-center justify-center font-display text-2xl leading-none">
        {MEDALS[entry.rank] ? (
          <span role="img" aria-label={rank}>
            {MEDALS[entry.rank]}
          </span>
        ) : (
          <span className="text-xl text-ink/70">{rank}</span>
        )}
      </span>
      <Avatar player={player} size="md" crown={false} selfie />
      <div className="min-w-0 flex-1">
        <div className="flex min-w-0 items-baseline gap-1.5">
          <span className="truncate font-display text-lg leading-tight">{player.name}</span>
          {isMe && <span className="shrink-0 text-xs font-extrabold text-ink/70">{t('common.youTag')}</span>}
        </div>
        <div className="text-xs font-bold text-ink/65">
          {entry.guesses > 0 ? t('results.ranking.guessedRight', { correct: entry.correct, guesses: entry.guesses }) : t('results.ranking.noGuesses')}
        </div>
        {showBonus && entry.bonus > 0 && (
          <div className="mt-1 inline-flex max-w-full items-center rounded-full bg-ink px-2 py-px text-[11px] leading-tight font-extrabold text-sun">
            <span className="truncate" aria-hidden>
              ⚡ {t('results.ranking.bonus', { bonus: entry.bonus })}
            </span>
            <span className="sr-only">{t('results.ranking.bonusAria', { bonus: entry.bonus })}</span>
          </div>
        )}
        <div className="mt-1 h-2 overflow-hidden rounded-full border-2 border-ink/80 bg-white/70">
          <motion.div
            className="h-full rounded-full"
            style={{ backgroundColor: player.color, originX: 0 }}
            initial={{ scaleX: 0 }}
            animate={show ? { scaleX: fill } : undefined}
            transition={{ duration: 1.1, delay: delay + 0.2, ease: [0.16, 1, 0.3, 1] }}
          />
        </div>
      </div>
      <div className="shrink-0 text-right leading-none">
        <CountUp to={entry.score} start={show} delay={delay + 0.15} className="font-display text-2xl" />
        <div className="text-[11px] font-extrabold tracking-wide text-ink/60 uppercase">{t('results.pts')}</div>
      </div>
      {shame && (
        <motion.span
          className="pointer-events-none absolute -top-3 right-16 z-10 rounded-full border-2 border-ink bg-danger px-2 py-0.5 text-xs font-extrabold whitespace-nowrap text-white shadow-pop-sm"
          initial={{ opacity: 0, scale: 0.3, rotate: -20 }}
          animate={show ? { opacity: 1, scale: 1, rotate: 4 } : undefined}
          transition={{ type: 'spring', stiffness: 460, damping: 12, delay: delay + 0.6 }}
        >
          <span aria-hidden>🙈 </span>
          {t('results.ranking.shame')}
        </motion.span>
      )}
    </motion.li>
  );
}

/** Everybody, best first, with an animated score bar. `ready` holds the entrance until the podium is done. */
export function RankingList({
  ranking,
  players,
  meId,
  ready,
  showBonus = false,
}: {
  ranking: RankingEntry[];
  players: Map<string, PublicPlayer>;
  meId: string;
  ready: boolean;
  /** Blur game: show the speed bonus included in each score. */
  showBonus?: boolean;
}) {
  const maxScore = Math.max(0, ...ranking.map((r) => r.score));
  const shame = shameOf(ranking);
  return (
    <ol className="flex flex-col gap-2.5">
      {ranking.map((entry, i) => (
        <Row
          key={entry.playerId}
          entry={entry}
          player={playerOr(players, entry.playerId)}
          isMe={entry.playerId === meId}
          shame={entry.playerId === shame}
          showBonus={showBonus}
          maxScore={maxScore}
          index={i}
          ready={ready}
        />
      ))}
    </ol>
  );
}
