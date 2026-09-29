import { motion, useInView } from 'motion/react';
import { useRef } from 'react';
import type { PublicPlayer, RankingEntry } from '../../../shared/protocol';
import { Avatar } from '../../components/Avatar';
import { IconBadge } from '../../components/IconBadge';
import { Stamp } from '../../components/Stamp';
import { useI18n } from '../../i18n';
import { cn } from '../../lib/util';
import { CountUp } from './CountUp';
import { MEDAL_TONE, medalIcon, playerOr } from './helpers';

/** Trophy / medal sticker for the top three (when they scored), the rank number below. */
function RankMark({ rank, scored }: { rank: number; scored: boolean }) {
  const { t } = useI18n();
  const icon = scored ? medalIcon(rank) : null;
  if (icon) return <IconBadge name={icon} tone={MEDAL_TONE[rank]} size="sm" tilt={rank === 1 ? -8 : rank === 2 ? 6 : -4} label={t('results.mine.rank', { rank })} />;
  return (
    <span className="font-mono text-base leading-none font-bold tracking-tight text-ink/60">
      {t('results.mine.rank', { rank })}
    </span>
  );
}

function Row({
  entry,
  player,
  isMe,
  maxScore,
  index,
  ready,
}: {
  entry: RankingEntry;
  player: PublicPlayer;
  isMe: boolean;
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

  return (
    <motion.li
      ref={ref}
      className={cn(
        'relative flex items-center gap-3 rounded-2xl border-3 border-ink py-2.5 pr-2.5 pl-3 text-ink shadow-pop-sm',
        isMe ? 'bg-sun' : 'bg-cream',
      )}
      initial={{ opacity: 0, x: -40, scale: 0.9 }}
      animate={show ? { opacity: 1, x: 0, scale: 1 } : undefined}
      transition={{ type: 'spring', stiffness: 420, damping: 26, delay }}
    >
      <span className="flex w-8 shrink-0 items-center justify-center">
        <RankMark rank={entry.rank} scored={entry.score > 0} />
      </span>
      <Avatar player={player} size="md" crown={false} />
      <div className="min-w-0 flex-1">
        <div className="flex min-w-0 items-baseline gap-1.5">
          <span className="truncate font-display text-lg leading-tight">{player.name}</span>
          {isMe && <span className="shrink-0 text-xs font-extrabold text-ink/70">{t('common.youTag')}</span>}
        </div>
        <div className="text-xs font-bold text-ink/65">
          {entry.guesses > 0 ? t('results.ranking.guessedRight', { correct: entry.correct, guesses: entry.guesses }) : t('results.ranking.noGuesses')}
        </div>
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
      {/* Score: a lit date stamp on a small dark display */}
      <Stamp plate size="md" label={t('results.pts')} className="min-w-[4.25rem] shrink-0 items-end!">
        <CountUp to={entry.score} start={show} delay={delay + 0.15} plain />
      </Stamp>
    </motion.li>
  );
}

/** Everybody, best first, with an animated score bar. `ready` holds the entrance until the podium is done. */
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
  const maxScore = Math.max(0, ...ranking.map((r) => r.score));
  return (
    <ol className="flex flex-col gap-2.5">
      {ranking.map((entry, i) => (
        <Row
          key={entry.playerId}
          entry={entry}
          player={playerOr(players, entry.playerId)}
          isMe={entry.playerId === meId}
          maxScore={maxScore}
          index={i}
          ready={ready}
        />
      ))}
    </ol>
  );
}
