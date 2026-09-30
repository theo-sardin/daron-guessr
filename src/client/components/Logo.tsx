import { motion, useReducedMotion } from 'motion/react';
import { useEffect, useRef, useState, useSyncExternalStore, type CSSProperties } from 'react';
import { cn } from '../lib/util';
import { PATTERN } from './CutoutText';
import { DymoLabel } from './DymoLabel';
import { scissorClip } from './paper/geometry';

/** Base letter size (px) of each logo size: the whole wordmark is laid out in em of it. */
const UNIT = { sm: 21, md: 44, lg: 68 } as const;

/*
 * Is a big (lg) logo on screen? The TopBar hides its small logo while one is, so Home never
 * shows two wordmarks above the fold. The area under the fixed top bar counts as off screen.
 */
const visibleHeroes = new Set<symbol>();
const heroListeners = new Set<() => void>();
const heroVisible = () => visibleHeroes.size > 0;
function setHeroVisible(id: symbol, visible: boolean) {
  if (visible === visibleHeroes.has(id)) return;
  if (visible) visibleHeroes.add(id);
  else visibleHeroes.delete(id);
  heroListeners.forEach((l) => l());
}

/** True while a `<Logo size="lg" />` is visible below the top bar. */
export function useHeroLogoVisible(): boolean {
  return useSyncExternalStore(
    (cb) => {
      heroListeners.add(cb);
      return () => heroListeners.delete(cb);
    },
    heroVisible,
    () => false,
  );
}

interface LogoLetter {
  char: string;
  style: CSSProperties;
  /** em of the unit. */
  size: number;
  rotate: number;
  /** Vertical offset in em. */
  y: number;
  seed: number;
}

/** D A R O N, each cut from a different magazine (fixed: this is the brand). */
const LETTERS: LogoLetter[] = [
  { char: 'D', size: 1, rotate: -5, y: 0, seed: 11, style: { background: 'var(--color-sheet)', color: 'var(--color-ink)', fontFamily: 'var(--font-abril)', ...PATTERN.news } },
  { char: 'A', size: 0.97, rotate: 4, y: -0.074, seed: 23, style: { background: 'var(--color-red)', color: '#fff', fontFamily: 'var(--font-anton)' } },
  { char: 'R', size: 0.74, rotate: -3, y: 0.015, seed: 37, style: { backgroundColor: 'var(--color-yellow)', color: 'var(--color-ink)', fontFamily: 'var(--font-rubik)', ...PATTERN.half } },
  { char: 'O', size: 1.06, rotate: 6, y: -0.03, seed: 41, style: { backgroundColor: '#fff', color: 'var(--color-blue)', fontFamily: 'var(--font-dmserif)', fontStyle: 'italic', ...PATTERN.lines } },
  { char: 'N', size: 0.88, rotate: -4, y: -0.088, seed: 53, style: { background: 'var(--color-ink)', color: '#fff6e0', fontFamily: 'var(--font-alfa)' } },
];

/**
 * The wordmark: "DARON" in ransom-note letters, a blue ballpoint "ne" squeezed in with a
 * proofreader's caret (the daron / daronne wink) and "GUESSR" on a red Dymo label.
 * lg / md: the letters get slapped on, the pen writes "ne", the label is punched. Tap to replay.
 */
export function Logo({ size = 'lg', animate, className }: { size?: 'sm' | 'md' | 'lg'; animate?: boolean; className?: string }) {
  const reduce = useReducedMotion();
  const u = UNIT[size];
  const [take, setTake] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const play = (animate ?? size !== 'sm') && !reduce;

  useEffect(() => {
    const el = ref.current;
    if (size !== 'lg' || !el || typeof IntersectionObserver === 'undefined') return;
    const id = Symbol('hero-logo');
    const io = new IntersectionObserver(([e]) => setHeroVisible(id, e.isIntersecting), { rootMargin: '-64px 0px 0px 0px' });
    io.observe(el);
    return () => {
      io.disconnect();
      setHeroVisible(id, false);
    };
  }, [size]);

  const small = size === 'sm';
  return (
    <div
      ref={ref}
      key={take}
      role="img"
      aria-label="Daron Guessr"
      className={cn('relative inline-flex flex-col items-center select-none', play && 'cursor-pointer', className)}
      style={{ fontSize: u, lineHeight: 1 }}
      onClick={play ? () => setTake((n) => n + 1) : undefined}
    >
      <div
        aria-hidden
        className="relative flex items-end"
        style={{ gap: '0.03em', marginLeft: small ? '-0.5em' : '-0.65em', filter: 'drop-shadow(0 1px 0 rgb(40 25 10 / 0.22)) drop-shadow(0 0.06em 0.07em rgb(40 25 10 / 0.2))' }}
      >
        {LETTERS.map((l, i) => {
          const style: CSSProperties = {
            ...l.style,
            fontSize: `${l.size}em`,
            lineHeight: 0.92,
            padding: '0.09em 0.1em 0.05em',
            clipPath: scissorClip(l.seed, 8),
          };
          return play ? (
            <motion.span
              key={l.char}
              className="inline-block"
              style={style}
              initial={{ opacity: 0, scale: 1.8, rotate: l.rotate * 3 + (i % 2 ? 16 : -16), y: `${l.y}em` }}
              animate={{ opacity: 1, scale: 1, rotate: l.rotate, y: `${l.y}em` }}
              transition={{ type: 'spring', stiffness: 560, damping: 19, delay: 0.08 + i * 0.07, opacity: { duration: 0.08, delay: 0.08 + i * 0.07 } }}
            >
              {l.char}
            </motion.span>
          ) : (
            <span key={l.char} className="inline-block" style={{ ...style, transform: `translateY(${l.y}em) rotate(${l.rotate}deg)` }}>
              {l.char}
            </span>
          );
        })}
        {/* The ballpoint insertion: "ne" above the line, a caret on it. */}
        <motion.span
          className="text-pen absolute"
          style={{ right: '-0.64em', top: '-0.1em', fontSize: '0.6em', rotate: -10, textShadow: '0 0 6px var(--color-paper), 0 0 2px var(--color-paper)', filter: 'none' }}
          initial={play ? { clipPath: 'inset(-20% 100% -20% -10%)' } : false}
          animate={{ clipPath: 'inset(-20% -10% -20% -10%)' }}
          transition={{ duration: 0.45, delay: 0.62, ease: 'easeOut' }}
        >
          ne
        </motion.span>
        <svg className="absolute overflow-visible" style={{ right: '-0.3em', bottom: '0.16em', width: '0.36em', height: '0.3em' }} viewBox="0 0 26 20">
          <motion.path
            d="M3 18 L13 3 L23 18"
            stroke="var(--color-blue)"
            strokeWidth="3"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
            initial={play ? { pathLength: 0 } : false}
            animate={{ pathLength: 1 }}
            transition={{ duration: 0.22, delay: 0.5 }}
          />
        </svg>
      </div>
      <DymoLabel
        text="GUESSR"
        tone="red"
        size={u * 0.4}
        tilt={-3}
        spacing={0.22}
        animate={play ? 0.5 : false}
        className="relative z-[1]"
        style={{ marginTop: -u * 0.15, marginLeft: u * (small ? 1.2 : 1.62) }}
      />
    </div>
  );
}
