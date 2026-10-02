import { motion } from 'motion/react';
import { useEffect, useState, type MouseEvent } from 'react';
import type { PublicPlayer } from '../../../shared/protocol';
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
const STEP_HEIGHT: Record<number, number> = { 1: 132, 2: 98, 3: 72 };
/** Extra step height in blur games: the speed bonus gets its own line under the score. */
const BONUS_LINE = 16;
const STEP_COLOR: Record<number, string> = { 1: 'bg-sun', 2: 'bg-grape-200', 3: 'bg-tangerine' };

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

/**
 * Round avatar sized in px (the shared Avatar only has fixed sizes): the player's selfie when
 * they have one (their emoji as a badge on the rim, like Avatar), else their emoji.
 */
function Face({ player, size, glow }: { player: PublicPlayer; size: number; glow?: boolean }) {
  const selfie = player.selfieUrl;
  const badge = Math.round(size * 0.38);
  return (
    <span className="relative inline-flex" aria-hidden>
      <span
        className={cn(
          'inline-flex items-center justify-center overflow-hidden rounded-full border-ink leading-none shadow-pop-sm select-none',
          size >= 70 ? 'border-4' : 'border-3',
          glow && 'shadow-glow',
        )}
        style={{ width: size, height: size, backgroundColor: player.color, fontSize: Math.round(size * 0.55) }}
      >
        {selfie ? <img src={selfie} alt="" draggable={false} className="size-full object-cover" /> : player.avatar}
      </span>
      {selfie && (
        <span
          className="absolute -right-1 -bottom-1 flex items-center justify-center rounded-full border-2 border-ink leading-none select-none"
          style={{ width: badge, height: badge, backgroundColor: player.color, fontSize: Math.round(badge * 0.6) }}
        >
          {player.avatar}
        </span>
      )}
    </span>
  );
}

export function Podium({
  groups,
  players,
  meId,
  timeline,
  showBonus = false,
}: {
  groups: PodiumGroup[];
  players: Map<string, PublicPlayer>;
  meId: string;
  timeline: PodiumTimeline;
  /** Blur game: the speed bonus shows under the scores. */
  showBonus?: boolean;
}) {
  const { t } = useI18n();
  const wide = useWide();
  const mult = wide ? 1.3 : 1;
  const totalShown = groups.reduce((n, g) => n + Math.min(g.entries.length, MAX_SHOWN), 0);
  const base = totalShown <= 3 ? 62 : totalShown <= 5 ? 52 : 46;
  const topScore = groups[0]?.entries[0]?.score ?? 0;
  const stepHeight = (rank: number) => Math.round(((STEP_HEIGHT[rank] ?? STEP_HEIGHT[3]) + (showBonus ? BONUS_LINE : 0)) * mult);
  const faceSize = (g: number) => Math.round((g === 0 && Math.min(groups[g].entries.length, MAX_SHOWN) === 1 ? base * 1.4 : base) * mult);

  // Classic podium order: 2nd, 1st, 3rd.
  const order = [1, 0, 2].filter((g) => g < groups.length);

  // Final height of the winners' column (faces + name tag + step), reserved from the start so
  // the page below does not jump while the steps rise.
  const reserved = groups[0] ? faceSize(0) + 12 + (groups[0].entries.length > 1 ? 40 : 28) + stepHeight(groups[0].rank) : 0;

  const cheer = (e: MouseEvent, colors: string[]) => {
    const x = e.clientX / window.innerWidth;
    const y = e.clientY / window.innerHeight;
    burst({ x, y, particleCount: 60, colors: [...colors, '#ffd23f', '#ffffff'] });
    sfx.play('pop');
    vibrate(10);
  };

  return (
    <div className="relative mx-auto w-full max-w-lg overflow-x-clip pt-12" role="list">
      <div className="flex items-end justify-center gap-2 sm:gap-3" style={{ minHeight: reserved }}>
        {order.map((g) => {
          const group = groups[g];
          const rank = group.rank;
          const shown = group.entries.slice(0, MAX_SHOWN);
          const extra = group.entries.length - shown.length;
          const isTop = g === 0;
          const size = faceSize(g);
          const stepH = stepHeight(rank);
          const groupPlayers = group.entries.map((e) => playerOr(players, e.playerId));
          const hasMe = group.entries.some((e) => e.playerId === meId);
          const width = shown.length * size + (shown.length - 1) * 4 + (extra > 0 ? 36 : 0) + 20;
          const crowned = isTop && topScore > 0;
          const score = group.entries[0].score;
          // Tied players share a score, not always a bonus: only show the one they all have.
          const bonus = group.entries.every((e) => e.bonus === group.entries[0].bonus) ? group.entries[0].bonus : 0;
          const names = joinNames(
            groupPlayers.map((p) => p.name),
            t('results.and'),
          );
          const label = [t('results.mine.rank', { rank }), names, `${score} ${t('results.pts')}`, showBonus && bonus > 0 ? t('results.ranking.bonusAria', { bonus }) : null]
            .filter(Boolean)
            .join(' · ');

          return (
            <div
              key={rank}
              role="listitem"
              aria-label={label}
              className="relative isolate flex min-w-0 flex-col items-center"
              style={{ flexGrow: width, flexBasis: 0, maxWidth: Math.max(width + 40, 150 * mult) }}
            >
              {/* Sunburst behind the winners */}
              {crowned && (
                <motion.div
                  aria-hidden
                  className="pointer-events-none absolute left-1/2 -z-10 rounded-full"
                  style={{
                    width: size * 3.2,
                    height: size * 3.2,
                    top: -size * 0.9,
                    marginLeft: -size * 1.6,
                    background:
                      'repeating-conic-gradient(from 0deg, rgb(255 210 63 / 0.35) 0deg 12deg, transparent 12deg 24deg)',
                    maskImage: 'radial-gradient(circle, black 30%, transparent 70%)',
                    WebkitMaskImage: 'radial-gradient(circle, black 30%, transparent 70%)',
                  }}
                  initial={{ opacity: 0, scale: 0.3 }}
                  animate={{ opacity: 1, scale: 1, rotate: 360 }}
                  transition={{
                    opacity: { delay: timeline.celebrateAt, duration: 0.5 },
                    scale: { delay: timeline.celebrateAt, type: 'spring', stiffness: 200, damping: 15 },
                    rotate: { delay: timeline.celebrateAt, duration: 24, repeat: Infinity, ease: 'linear' },
                  }}
                />
              )}

              {/* Avatars dropping onto the step */}
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
                        <motion.span
                          aria-hidden
                          className="pointer-events-none absolute left-1/2 z-10 drop-shadow-[0_3px_0_rgba(27,16,54,0.7)]"
                          style={{ fontSize: Math.round(size * 0.5), top: -size * 0.52, marginLeft: -size * 0.3 }}
                          initial={{ y: -120, opacity: 0, rotate: -40, scale: 2 }}
                          animate={{ y: 0, opacity: 1, rotate: -12, scale: 1 }}
                          transition={{ delay: timeline.crownAt + i * 0.1, type: 'spring', stiffness: 380, damping: 12 }}
                        >
                          👑
                        </motion.span>
                      )}
                      <motion.button
                        type="button"
                        className="block rounded-full"
                        whileTap={{ scale: 0.9, rotate: -8 }}
                        onClick={(e) => cheer(e, groupPlayers.map((p) => p.color))}
                        aria-label={player.name}
                        animate={crowned ? { y: [0, -6, 0] } : undefined}
                        transition={crowned ? { type: 'tween', delay: timeline.crownAt + 0.8, duration: 1.8, repeat: Infinity, ease: 'easeInOut' } : undefined}
                      >
                        <Face player={player} size={size} glow={crowned} />
                      </motion.button>
                    </motion.div>
                  );
                })}
                {extra > 0 && (
                  <motion.span
                    className="mb-1 inline-flex h-8 min-w-8 items-center justify-center rounded-full border-2 border-ink bg-cream px-1.5 text-sm font-extrabold text-ink shadow-pop-sm"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', stiffness: 500, damping: 15, delay: timeline.avatarAt[g] + shown.length * 0.09 }}
                    aria-hidden
                  >
                    {t('results.more', { count: extra })}
                  </motion.span>
                )}
              </div>

              {/* Name tag */}
              <motion.div
                className={cn(
                  'relative z-10 my-1.5 max-w-full rounded-full border-2 border-ink px-2.5 py-0.5 text-center text-sm leading-tight font-extrabold text-ink shadow-pop-sm',
                  hasMe ? 'bg-sun' : 'bg-cream',
                  group.entries.length > 1 ? 'line-clamp-2 rounded-2xl text-xs' : 'truncate',
                )}
                initial={{ opacity: 0, scale: 0.4 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ type: 'spring', stiffness: 500, damping: 18, delay: timeline.avatarAt[g] + 0.25 }}
                aria-hidden
              >
                {names}
              </motion.div>

              {/* The step itself */}
              <motion.div
                className={cn(
                  'relative flex w-full flex-col items-center justify-start overflow-hidden rounded-t-2xl border-3 border-b-0 border-ink pt-1.5',
                  STEP_COLOR[rank] ?? STEP_COLOR[3],
                )}
                initial={{ height: 0 }}
                animate={{ height: stepH }}
                transition={{ type: 'spring', stiffness: 170, damping: 14, delay: timeline.stepAt[g] }}
                aria-hidden
              >
                <span className="pointer-events-none absolute inset-x-0 top-0 h-2.5 bg-white/45" />
                <span
                  className={cn('text-outline-sm font-display leading-none text-cream', rank === 1 ? 'text-5xl' : 'text-4xl', wide && 'sm:text-6xl')}
                >
                  {rank}
                </span>
                <span className="mt-0.5 font-display text-sm whitespace-nowrap text-ink/80 sm:text-base">
                  <CountUp to={score} delay={timeline.stepAt[g] + 0.2} duration={1} /> {t('results.pts')}
                </span>
                {showBonus && bonus > 0 && (
                  <motion.span
                    className="mt-0.5 rounded-full bg-ink px-1.5 py-px text-[11px] leading-tight font-extrabold whitespace-nowrap text-sun sm:text-xs"
                    initial={{ opacity: 0, scale: 0.4 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ type: 'spring', stiffness: 500, damping: 16, delay: timeline.stepAt[g] + 1 }}
                  >
                    ⚡ +{bonus}
                  </motion.span>
                )}
              </motion.div>
            </div>
          );
        })}
      </div>
      {/* Floor */}
      <motion.div
        className="mx-auto h-3 w-full rounded-full border-3 border-ink bg-grape-600 shadow-pop-sm"
        initial={{ scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{ type: 'spring', stiffness: 260, damping: 22, delay: 0.1 }}
      />
    </div>
  );
}
