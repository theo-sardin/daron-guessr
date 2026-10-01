import { motion, useReducedMotion } from 'motion/react';
import { useEffect, useState, type CSSProperties, type MouseEvent } from 'react';
import type { PublicPlayer } from '../../../shared/protocol';
import { Avatar, paperColor, type AvatarSize } from '../../components/Avatar';
import { Annotation, MarkerArrow } from '../../components/Marker';
import { Tape } from '../../components/Tape';
import { PaperStrip, TornPaper, type PaperSurface } from '../../components/TornPaper';
import { useI18n } from '../../i18n';
import { burst } from '../../lib/confetti';
import { sfx } from '../../lib/sfx';
import { cn, vibrate } from '../../lib/util';
import { CountUp } from './CountUp';
import { joinNames, playerOr, type PodiumGroup } from './helpers';

/** Podium timeline, in seconds from mount. Index 0 is the best group. */
export interface PodiumTimeline {
  stepAt: number[];
  avatarAt: number[];
  /** Winner(s) landed: confetti + fanfare. */
  celebrateAt: number;
  crownAt: number;
}

const T0 = 0.45;
const GAP = 0.85;
const SUSPENSE = 0.45;
const AVATAR_AFTER = 0.4;
const LANDING = 0.3;

export function podiumTimeline(groupCount: number): PodiumTimeline {
  const stepAt: number[] = [];
  const avatarAt: number[] = [];
  for (let g = 0; g < groupCount; g++) {
    const order = groupCount - 1 - g; // worst group rises first
    stepAt[g] = T0 + order * GAP + (g === 0 ? SUSPENSE : 0);
    avatarAt[g] = stepAt[g] + AVATAR_AFTER;
  }
  const celebrateAt = (avatarAt[0] ?? T0) + LANDING;
  return { stepAt, avatarAt, celebrateAt, crownAt: celebrateAt + 0.1 };
}

const MAX_SHOWN = 3;
const STEP_HEIGHT: Record<number, number> = { 1: 150, 2: 114, 3: 90 };
/** Paper of each block: the front sheet, the kraft (or sheet) peeking out behind it. */
const STEP_PAPER: Record<number, { front: PaperSurface; back: PaperSurface; number: string }> = {
  1: { front: 'postit', back: 'kraft', number: 'text-red-ink' },
  2: { front: 'grain', back: 'kraft', number: 'text-ink' },
  3: { front: 'kraft', back: 'grain', number: 'text-ink' },
};
const NUMBER_SIZE: Record<number, number> = { 1: 78, 2: 58, 3: 50 };

/** Sticker sizes, smallest first, with their diameters (see Avatar). */
const LADDER: AvatarSize[] = ['sm', 'md', 'lg', 'xl'];
const DIAMETER: Record<string, number> = { sm: 36, md: 48, lg: 64, xl: 96 };

function useWide(): boolean {
  const query = '(min-width: 640px)';
  const [wide, setWide] = useState(() => typeof window !== 'undefined' && window.matchMedia?.(query).matches);
  useEffect(() => {
    const mq = window.matchMedia?.(query);
    if (!mq) return;
    const on = () => setWide(mq.matches);
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);
  return wide;
}

/** A hand-drawn crown: ink outline drawn by a marker, highlighter-yellow fill. */
export function CrownDoodle({ size, delay = 0, className, style }: { size: number; delay?: number; className?: string; style?: CSSProperties }) {
  const reduce = useReducedMotion();
  const d = 'M6 34 L4 10 L15 21 L24 4 L33 21 L44 9 L42 34 Z';
  return (
    <motion.svg
      viewBox="0 0 48 44"
      width={size}
      height={size * (44 / 48)}
      aria-hidden
      className={cn('pointer-events-none overflow-visible', className)}
      style={style}
      initial={reduce ? false : { y: -40, opacity: 0, rotate: -40, scale: 1.6 }}
      animate={{ y: 0, opacity: 1, rotate: -12, scale: 1 }}
      transition={{ delay, type: 'spring', stiffness: 380, damping: 13 }}
    >
      <path d={d} fill="var(--color-yellow)" />
      <motion.path
        d={d}
        fill="none"
        stroke="var(--color-ink)"
        strokeWidth={3.2}
        strokeLinejoin="round"
        strokeLinecap="round"
        initial={reduce ? false : { pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ delay: delay + 0.1, duration: 0.5, ease: 'easeOut' }}
      />
      <path d="M8 40 Q24 37 41 40" fill="none" stroke="var(--color-ink)" strokeWidth={3} strokeLinecap="round" />
      <circle cx="24" cy="25" r="3.2" fill="var(--color-red)" />
      <circle cx="14" cy="28" r="2.2" fill="var(--color-blue)" />
      <circle cx="34" cy="28" r="2.2" fill="var(--color-blue)" />
    </motion.svg>
  );
}

/**
 * The podium as stacked paper blocks (2nd, 1st, 3rd) rising from the page, a big bold rank on
 * each, the players' stickers dropping on top, a crown doodle and a marker "the boss!" for the
 * winner(s).
 */
export function Podium({
  groups,
  players,
  meId,
  timeline,
}: {
  groups: PodiumGroup[];
  players: Map<string, PublicPlayer>;
  meId: string;
  timeline: PodiumTimeline;
}) {
  const { t } = useI18n();
  const wide = useWide();
  const mult = wide ? 1.2 : 1;
  const topScore = groups[0]?.entries[0]?.score ?? 0;

  // Sticker sizes: as big as the room allows (single winner xl, a crowd of ties smaller).
  const counts = groups.map((g) => Math.min(g.entries.length, MAX_SHOWN));
  const idx = counts.map((c, g) => (g === 0 ? 4 - c : 3 - c));
  const room = wide ? 600 : 336;
  const widthOf = (i: number[]) => i.reduce((sum, v, g) => sum + counts[g] * (DIAMETER[LADDER[Math.max(0, v)]] + 4) + 26, 0);
  // Too wide: shrink the runners-up first (down to one size below the winners), then the winners.
  for (let guard = 0; guard < 10 && widthOf(idx) > room && idx.some((v) => v > 0); guard++) {
    const others = idx.map((v, g) => (g > 0 && v > 0 && v >= idx[0] - 1 ? v : -1));
    const best = Math.max(...others);
    const g = best >= 0 ? others.lastIndexOf(best) : 0;
    idx[g] -= 1;
  }
  const sizes = idx.map((v) => LADDER[Math.max(0, v)]);

  // Classic podium order: 2nd, 1st, 3rd.
  const order = [1, 0, 2].filter((g) => g < groups.length);
  // The winners' note goes right of them, unless they stand on the right edge (no 3rd step).
  const noteLeft = order[order.length - 1] === 0 && order.length > 1;

  // Final height of the winners' column, reserved from the start so the page does not jump.
  const top = groups[0];
  const topD = top ? DIAMETER[sizes[0]] : 0;
  const topStep = top ? Math.round((STEP_HEIGHT[top.rank] ?? STEP_HEIGHT[3]) * mult) : 0;
  const reserved = top ? topD + topStep + (top.entries.length > 1 ? 52 : 34) : 0;

  const cheer = (e: MouseEvent, colors: string[]) => {
    const x = e.clientX / window.innerWidth;
    const y = e.clientY / window.innerHeight;
    burst({ x, y, particleCount: 60, colors: [...colors, '#ffdf3d', '#e3321f', '#2344c8'] });
    sfx.play('pop');
    vibrate(10);
  };

  return (
    <div className="relative mx-auto w-full max-w-lg pt-16" role="list">
      {/* A torn halftone strip behind the blocks. */}
      <PaperStrip tone="blue" tilt={-3} seed="podium" bleed="md" className="absolute -inset-x-3 bottom-5 h-[4.5rem]" />
      <div className="relative flex items-end justify-center gap-2.5 sm:gap-4" style={{ minHeight: reserved }}>
        {order.map((g) => {
          const group = groups[g];
          const rank = group.rank;
          const shown = group.entries.slice(0, MAX_SHOWN);
          const extra = group.entries.length - shown.length;
          const isTop = g === 0;
          const size = sizes[g];
          const d = DIAMETER[size];
          const stepH = Math.round((STEP_HEIGHT[rank] ?? STEP_HEIGHT[3]) * mult);
          const groupPlayers = group.entries.map((e) => playerOr(players, e.playerId));
          const hasMe = group.entries.some((e) => e.playerId === meId);
          const width = shown.length * d + (shown.length - 1) * 4 + (extra > 0 ? 36 : 0) + 24;
          const crowned = isTop && topScore > 0;
          const paper = STEP_PAPER[rank] ?? STEP_PAPER[3];
          const names = joinNames(
            groupPlayers.map((p) => p.name),
            t('results.and'),
          );

          return (
            <div
              key={rank}
              role="listitem"
              aria-label={`${t('results.mine.rank', { rank })} · ${names} · ${group.entries[0].score} ${t('results.pts')}`}
              className="relative flex min-w-0 flex-col items-center"
              style={{ flexGrow: width, flexBasis: 0, maxWidth: Math.max(width + 40, 150 * mult) }}
            >
              {/* "the boss!" scribbled next to the winner(s), on the side where there is room */}
              {isTop && (
                <div
                  className="pointer-events-none absolute z-20"
                  style={{ [noteLeft ? 'right' : 'left']: `calc(50% + ${Math.round((shown.length * d) / 2) - 6}px)`, top: -40 }}
                  aria-hidden
                >
                  <Annotation rotate={noteLeft ? 7 : -9} size={wide ? 22 : 19} delay={timeline.crownAt + 0.35} className="whitespace-nowrap">
                    {topScore === 0 ? t('results.notes.nobody') : group.entries.length > 1 ? t('results.notes.bosses') : t('results.notes.boss')}
                  </Annotation>
                  <MarkerArrow
                    from={noteLeft ? [70, 0] : [30, 0]}
                    to={noteLeft ? [98, 95] : [2, 95]}
                    bend={noteLeft ? 0.3 : -0.3}
                    head={9}
                    strokeWidth={2.8}
                    delay={timeline.crownAt + 0.8}
                    className={cn('top-6 h-9 w-8', noteLeft ? '-right-4' : '-left-4')}
                  />
                </div>
              )}

              {/* Stickers dropping onto the block */}
              <div className="flex items-end justify-center gap-1">
                {shown.map((entry, i) => {
                  const player = playerOr(players, entry.playerId);
                  return (
                    <motion.div
                      key={entry.playerId}
                      className="relative"
                      initial={{ y: -240, opacity: 0, rotate: -30, scale: 0.6 }}
                      animate={{ y: 0, opacity: 1, rotate: 0, scale: 1 }}
                      transition={{ type: 'spring', stiffness: 420, damping: 13, delay: timeline.avatarAt[g] + i * 0.09 }}
                    >
                      {crowned && (
                        <CrownDoodle
                          size={Math.max(26, Math.round(d * 0.56))}
                          delay={timeline.crownAt + i * 0.1}
                          className="absolute left-1/2 z-10 -translate-x-[62%]"
                          style={{ top: -Math.round(d * 0.44) }}
                        />
                      )}
                      <motion.button
                        type="button"
                        className="block rounded-full"
                        whileTap={{ scale: 0.9, rotate: -8 }}
                        onClick={(e) => cheer(e, groupPlayers.map((p) => paperColor(p.color)))}
                        aria-label={player.name}
                        animate={crowned ? { y: [0, -5, 0] } : undefined}
                        transition={crowned ? { type: 'tween', delay: timeline.crownAt + 0.8, duration: 1.8, repeat: Infinity, ease: 'easeInOut' } : undefined}
                      >
                        <Avatar player={player} size={size} crown={false} dimOffline={false} selfie tilt={i % 2 ? 5 : -4} />
                      </motion.button>
                    </motion.div>
                  );
                })}
                {extra > 0 && (
                  <motion.span
                    className="paper-sheet mb-1 inline-flex h-8 min-w-8 items-center justify-center rounded-full px-1.5 font-num text-sm shadow-paper-sm"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', stiffness: 500, damping: 15, delay: timeline.avatarAt[g] + shown.length * 0.09 }}
                  >
                    {t('results.more', { count: extra })}
                  </motion.span>
                )}
              </div>

              {/* Name(s), highlighted when it is the viewer */}
              <motion.div
                className={cn(
                  'relative z-10 mt-1.5 mb-1 max-w-full px-1 text-center font-display leading-tight text-ink',
                  group.entries.length > 1 ? 'line-clamp-2 text-[13px] sm:text-sm' : 'truncate text-[15px] sm:text-lg',
                )}
                initial={{ opacity: 0, scale: 0.4 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ type: 'spring', stiffness: 500, damping: 18, delay: timeline.avatarAt[g] + 0.25 }}
              >
                {hasMe && <span aria-hidden className="absolute inset-x-0 top-[38%] -z-10 h-[62%] -skew-x-6 rounded-[2px] bg-yellow/90" />}
                {names}
              </motion.div>

              {/* The block: stacked paper rising from the page, a big bold rank and the score. */}
              <div className="relative w-full [clip-path:inset(-60px_-30px_0_-30px)]" style={{ height: stepH }}>
                <motion.div
                  className="absolute inset-0"
                  initial={{ y: stepH + 10 }}
                  animate={{ y: 0 }}
                  transition={{ type: 'spring', stiffness: 170, damping: 16, delay: timeline.stepAt[g] }}
                >
                  <TornPaper
                    surface={paper.back}
                    edges="t"
                    amp={3}
                    seed={`back-${rank}`}
                    lift="sm"
                    wrapperClassName="absolute inset-x-1 -top-2 bottom-0"
                    wrapperStyle={{ rotate: rank === 2 ? '-3deg' : '3deg' }}
                    className="size-full"
                  />
                  <TornPaper
                    surface={paper.front}
                    edges="t"
                    amp={3.5}
                    seed={`front-${rank}`}
                    lift
                    wrapperClassName="absolute inset-0"
                    className="flex size-full flex-col items-center pt-2.5"
                  >
                    <span className={cn('font-num leading-[0.85]', paper.number)} style={{ fontSize: Math.round((NUMBER_SIZE[rank] ?? 50) * mult) }} aria-hidden>
                      {rank}
                    </span>
                    <span className="mt-1.5 flex items-baseline gap-1 whitespace-nowrap" aria-hidden>
                      <span className="font-num text-[19px] sm:text-[23px]">
                        <CountUp to={group.entries[0].score} delay={timeline.stepAt[g] + 0.2} duration={1} />
                      </span>
                      <span className="label-type">{t('results.pts')}</span>
                    </span>
                  </TornPaper>
                  {rank === 1 && <Tape tone="yellow" width={52} height={18} rotate={-8} className="-top-3 -left-2 z-10" />}
                </motion.div>
              </div>
            </div>
          );
        })}
      </div>
      {/* The page edge the blocks rise from. */}
      <div aria-hidden className="relative h-[3px] w-full rounded-full bg-ink/80" />
    </div>
  );
}
