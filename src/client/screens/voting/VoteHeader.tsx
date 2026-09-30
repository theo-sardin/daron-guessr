import { motion } from 'motion/react';
import type { VotingView } from '../../../shared/protocol';
import { Stamp } from '../../components/Stamp';
import { TimerRing } from '../../components/TimerRing';
import { useT } from '../../i18n';
import { cn } from '../../lib/util';

/** Colors of the little prints already shown (one per photo, cycling). */
const PRINT_COLORS = ['#E7B04C', '#4FA9D6', '#8C9DD0', '#F6A6C1', '#9ED9C0', '#E3321F', '#C9B8F0', '#F7A866'];

/**
 * Top of the page: "photo" in typewriter over a big bold "3/8", one tiny print per photo
 * (shot ones filled in, the current one outlined in red marker, the rest dashed), and the red
 * marker timer on the right.
 */
export function VoteHeader({ v, className }: { v: VotingView; className?: string }) {
  const t = useT();
  const n = v.round + 1;
  return (
    <div className={cn('flex items-end justify-between gap-3', className)}>
      <div className="min-w-0">
        <motion.div key={v.round} initial={{ scale: 1.3, rotate: -6, opacity: 0 }} animate={{ scale: 1, rotate: 0, opacity: 1 }} transition={{ type: 'spring', stiffness: 520, damping: 20 }} className="origin-bottom-left">
          <Stamp label={t('voting.photoLabel')} size="xl" ariaLabel={t('voting.photoCount', { n, total: v.totalRounds })} valueClassName="text-[3.1rem]! lg:text-[3.6rem]!">
            {n}/{v.totalRounds}
          </Stamp>
        </motion.div>
        <RoundTicks round={v.round} total={v.totalRounds} label={t('voting.progressLabel', { n, total: v.totalRounds })} />
      </div>
      <TimerRing startsAt={v.startsAt} endsAt={v.endsAt} size={84} className="-mr-1" />
    </div>
  );
}

function RoundTicks({ round, total, label }: { round: number; total: number; label: string }) {
  // Smaller prints when there are many photos, so the row stays on the page (it may wrap).
  const w = total <= 10 ? 13 : total <= 16 ? 10 : 8;
  return (
    <div
      className="mt-2 flex max-w-[15rem] flex-wrap gap-1"
      role="progressbar"
      aria-valuemin={1}
      aria-valuemax={total}
      aria-valuenow={round + 1}
      aria-label={label}
    >
      {Array.from({ length: total }, (_, i) => {
        const r = ((i * 37) % 9) - 4;
        if (i > round) return <i key={i} className="block border-[1.5px] border-dashed border-ink/35" style={{ width: w, height: w + 2 }} />;
        return (
          <motion.i
            key={i}
            className={cn('block bg-white px-[1.5px] pt-[1.5px] pb-1 shadow-[0_1px_2px_rgb(40_25_10/0.3)]', i === round && 'outline-2 outline-offset-1 outline-red')}
            style={{ width: w, height: w + 2, rotate: `${r}deg` }}
            initial={i === round ? { scale: 0, rotate: -40 } : false}
            animate={{ scale: 1, rotate: r }}
            transition={{ type: 'spring', stiffness: 500, damping: 16, delay: 0.2 }}
          >
            <span className="block size-full" style={{ background: PRINT_COLORS[i % PRINT_COLORS.length] }} />
          </motion.i>
        );
      })}
    </div>
  );
}
