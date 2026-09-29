import { useId, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import type { Theme } from '../../shared/protocol';
import { cn } from '../lib/util';

/** Accent of each theme (banner, selected mode card, illustration). */
export const THEME_TONE: Record<Theme, 'sun' | 'mint' | 'tangerine' | 'lilac' | 'sky'> = {
  parents: 'sun',
  family: 'mint',
  childhood: 'tangerine',
  pick: 'lilac',
  mix: 'sky',
};
export const themeColor = (theme: Theme) => `var(--color-${THEME_TONE[theme]})`;

const INK = 'var(--color-ink)';
const PAPER = '#ffffff';
const BLUSH = 'rgb(255 79 163 / 0.45)';
/** Skin tones of the cast (same family as the print portraits). */
const SKIN = { dad: '#f2c190', mom: '#d99a6c', kid: '#ffd8b4', girl: '#e8b184' } as const;

/** Below this rendered width (px) the compact drawing is used: one print, one big subject. */
const COMPACT_BELOW = 48;

type Subject = 'dad' | 'mom' | 'kid' | 'girl' | 'cat' | 'landscape' | 'shuffle';

/** Stroke widths in viewBox units: frame, photo edge, features. */
interface Strokes {
  frame: number;
  edge: number;
  line: number;
}
const FULL: Strokes = { frame: 3, edge: 1.8, line: 1.7 };
const COMPACT: Strokes = { frame: 4.6, edge: 2.6, line: 2.6 };

/*
 * The cast. Each one is drawn inside a w x h photo (origin top-left, clipped): a flat face
 * (skin + 2-3 ink features, like the print portraits) with era-specific hair, so they read as
 * people from the family album rather than "no profile picture" placeholders.
 */
function subjectShape(subject: Subject, w: number, h: number, sw: number, accent: string): ReactNode {
  const cx = w / 2;
  const line = { stroke: INK, strokeWidth: sw, strokeLinecap: 'round', strokeLinejoin: 'round' } as const;
  switch (subject) {
    // Dad, 1994: side part, big square frames, a jacket over a white collar.
    case 'dad': {
      const r = w * 0.25;
      const cy = h * 0.47;
      const bodyTop = cy + r * 1.05;
      return (
        <>
          <rect x={cx - r * 0.38} y={cy + r * 0.5} width={r * 0.76} height={r} fill={SKIN.dad} {...line} />
          <path d={`M${cx - w * 0.52} ${h + 2}C${cx - w * 0.5} ${bodyTop}${' '}${cx - r * 0.9} ${bodyTop} ${cx} ${bodyTop}S${cx + w * 0.5} ${bodyTop} ${cx + w * 0.52} ${h + 2}z`} fill={INK} />
          <path d={`M${cx - r * 0.55} ${bodyTop - 0.4}L${cx} ${bodyTop + r * 0.75}L${cx + r * 0.55} ${bodyTop - 0.4}z`} fill={PAPER} />
          <circle cx={cx - r * 0.98} cy={cy + r * 0.12} r={r * 0.22} fill={SKIN.dad} {...line} />
          <circle cx={cx + r * 0.98} cy={cy + r * 0.12} r={r * 0.22} fill={SKIN.dad} {...line} />
          <circle cx={cx} cy={cy} r={r} fill={SKIN.dad} {...line} />
          {/* Side part: a notch on the left, then the hair swoops up and over to the right. */}
          <path
            d={`M${cx - r * 1.03} ${cy + r * 0.05}C${cx - r * 1.12} ${cy - r * 0.7} ${cx - r * 0.82} ${cy - r * 1.08} ${cx - r * 0.44} ${cy - r * 1.1}L${cx - r * 0.3} ${cy - r * 0.86}C${cx - r * 0.1} ${cy - r * 1.42} ${cx + r * 0.8} ${cy - r * 1.46} ${cx + r * 1.06} ${cy - r * 0.72}C${cx + r * 1.2} ${cy - r * 0.38} ${cx + r * 1.1} ${cy - r * 0.1} ${cx + r * 1.03} ${cy + r * 0.05}C${cx + r * 0.88} ${cy - r * 0.3} ${cx + r * 0.62} ${cy - r * 0.52} ${cx + r * 0.1} ${cy - r * 0.56}C${cx - r * 0.18} ${cy - r * 0.58} ${cx - r * 0.34} ${cy - r * 0.66} ${cx - r * 0.42} ${cy - r * 0.76}C${cx - r * 0.72} ${cy - r * 0.6} ${cx - r * 0.92} ${cy - r * 0.3} ${cx - r * 1.03} ${cy + r * 0.05}z`}
            fill={INK}
            {...line}
          />
          {/* Big 90s frames. */}
          <g fill="rgb(255 255 255 / 0.4)" {...line}>
            <rect x={cx - r * 0.9} y={cy - r * 0.2} width={r * 0.76} height={r * 0.62} rx={r * 0.2} />
            <rect x={cx + r * 0.14} y={cy - r * 0.2} width={r * 0.76} height={r * 0.62} rx={r * 0.2} />
            <path d={`M${cx - r * 0.14} ${cy + r * 0.02}h${r * 0.28}`} fill="none" />
          </g>
          <circle cx={cx - r * 0.5} cy={cy + r * 0.1} r={r * 0.1} fill={INK} />
          <circle cx={cx + r * 0.5} cy={cy + r * 0.1} r={r * 0.1} fill={INK} />
          <path d={`M${cx - r * 0.3} ${cy + r * 0.62}Q${cx} ${cy + r * 0.8} ${cx + r * 0.3} ${cy + r * 0.62}`} fill="none" {...line} />
        </>
      );
    }
    // Mom, 1987: a big perm (a cloud of curls), puffy fringe, hoop earrings, a white blouse.
    case 'mom': {
      const r = w * 0.22;
      const cy = h * 0.46;
      const curls: Array<[number, number, number]> = [
        [-1.12, 0.62, 0.5],
        [1.12, 0.62, 0.5],
        [-1.22, 0.02, 0.55],
        [1.22, 0.02, 0.55],
        [-0.95, -0.62, 0.56],
        [0.95, -0.62, 0.56],
        [-0.42, -1.02, 0.56],
        [0.42, -1.02, 0.56],
      ];
      const bodyTop = cy + r * 1.1;
      return (
        <>
          <g fill={INK} {...line}>
            <ellipse cx={cx} cy={cy - r * 0.05} rx={r * 1.25} ry={r * 1.2} />
            {curls.map(([x, y, k], i) => (
              <circle key={i} cx={cx + r * x} cy={cy + r * y} r={r * k} />
            ))}
          </g>
          <rect x={cx - r * 0.34} y={cy + r * 0.5} width={r * 0.68} height={r} fill={SKIN.mom} {...line} />
          <path d={`M${cx - w * 0.5} ${h + 2}C${cx - w * 0.48} ${bodyTop}${' '}${cx - r * 0.8} ${bodyTop} ${cx} ${bodyTop}S${cx + w * 0.48} ${bodyTop} ${cx + w * 0.5} ${h + 2}z`} fill={PAPER} {...line} />
          <path d={`M${cx - r * 0.42} ${bodyTop + 0.2}Q${cx} ${bodyTop + r * 0.55} ${cx + r * 0.42} ${bodyTop + 0.2}`} fill={SKIN.mom} {...line} />
          <circle cx={cx} cy={cy} r={r} fill={SKIN.mom} {...line} />
          {/* Puffy fringe. */}
          <path
            d={`M${cx - r * 1.0} ${cy + r * 0.05}C${cx - r * 1.1} ${cy - r * 1.2} ${cx + r * 1.1} ${cy - r * 1.2} ${cx + r * 1.0} ${cy + r * 0.05}Q${cx + r * 0.9} ${cy - r * 0.42} ${cx + r * 0.5} ${cy - r * 0.38}Q${cx + r * 0.25} ${cy - r * 0.72} ${cx - r * 0.05} ${cy - r * 0.42}Q${cx - r * 0.38} ${cy - r * 0.74} ${cx - r * 0.62} ${cy - r * 0.36}Q${cx - r * 0.92} ${cy - r * 0.4} ${cx - r * 1.0} ${cy + r * 0.05}z`}
            fill={INK}
            {...line}
          />
          <circle cx={cx - r * 0.38} cy={cy + r * 0.14} r={r * 0.11} fill={INK} />
          <circle cx={cx + r * 0.38} cy={cy + r * 0.14} r={r * 0.11} fill={INK} />
          <path d={`M${cx - r * 0.28} ${cy + r * 0.52}Q${cx} ${cy + r * 0.74} ${cx + r * 0.28} ${cy + r * 0.52}`} fill="none" {...line} />
          <g fill="none" stroke={accent === INK ? PAPER : 'var(--color-sun)'} strokeWidth={sw * 0.9}>
            <circle cx={cx - r * 0.98} cy={cy + r * 0.62} r={r * 0.2} />
            <circle cx={cx + r * 0.98} cy={cy + r * 0.62} r={r * 0.2} />
          </g>
        </>
      );
    }
    // Me as a kid, 1996: bowl cut, rosy cheeks, gap-tooth grin.
    case 'kid': {
      const r = w * 0.3;
      const cy = h * 0.5;
      return (
        <>
          <path d={`M${cx - w * 0.42} ${h + 2}C${cx - w * 0.4} ${cy + r * 1.05} ${cx + w * 0.4} ${cy + r * 1.05} ${cx + w * 0.42} ${h + 2}z`} fill={PAPER} {...line} />
          <circle cx={cx - r * 0.98} cy={cy + r * 0.2} r={r * 0.2} fill={SKIN.kid} {...line} />
          <circle cx={cx + r * 0.98} cy={cy + r * 0.2} r={r * 0.2} fill={SKIN.kid} {...line} />
          <circle cx={cx} cy={cy} r={r} fill={SKIN.kid} {...line} />
          {/* Bowl cut: a helmet of hair with a dead-straight fringe. */}
          <path
            d={`M${cx - r * 1.06} ${cy + r * 0.06}C${cx - r * 1.16} ${cy - r * 1.32} ${cx + r * 1.16} ${cy - r * 1.32} ${cx + r * 1.06} ${cy + r * 0.06}L${cx + r * 0.8} ${cy + r * 0.06}L${cx + r * 0.74} ${cy - r * 0.26}L${cx - r * 0.74} ${cy - r * 0.26}L${cx - r * 0.8} ${cy + r * 0.06}z`}
            fill={INK}
            {...line}
          />
          <circle cx={cx - r * 0.62} cy={cy + r * 0.42} r={r * 0.17} fill={BLUSH} />
          <circle cx={cx + r * 0.62} cy={cy + r * 0.42} r={r * 0.17} fill={BLUSH} />
          <circle cx={cx - r * 0.34} cy={cy + r * 0.1} r={r * 0.11} fill={INK} />
          <circle cx={cx + r * 0.34} cy={cy + r * 0.1} r={r * 0.11} fill={INK} />
          <path d={`M${cx - r * 0.4} ${cy + r * 0.4}Q${cx} ${cy + r * 1.0} ${cx + r * 0.4} ${cy + r * 0.4}z`} fill={INK} {...line} />
          <rect x={cx - r * 0.24} y={cy + r * 0.4} width={r * 0.18} height={r * 0.16} fill={PAPER} />
          <rect x={cx + r * 0.06} y={cy + r * 0.4} width={r * 0.18} height={r * 0.16} fill={PAPER} />
        </>
      );
    }
    // Little sister: two pigtail bunches with bobbles.
    case 'girl': {
      const r = w * 0.27;
      const cy = h * 0.52;
      return (
        <>
          <path d={`M${cx - w * 0.42} ${h + 2}C${cx - w * 0.4} ${cy + r * 1.05} ${cx + w * 0.4} ${cy + r * 1.05} ${cx + w * 0.42} ${h + 2}z`} fill={PAPER} {...line} />
          <circle cx={cx - r * 1.22} cy={cy - r * 0.2} r={r * 0.46} fill={INK} {...line} />
          <circle cx={cx + r * 1.22} cy={cy - r * 0.2} r={r * 0.46} fill={INK} {...line} />
          <circle cx={cx} cy={cy} r={r} fill={SKIN.girl} {...line} />
          <path
            d={`M${cx - r * 1.03} ${cy + r * 0.05}C${cx - r * 1.12} ${cy - r * 1.28} ${cx + r * 1.12} ${cy - r * 1.28} ${cx + r * 1.03} ${cy + r * 0.05}Q${cx + r * 0.82} ${cy - r * 0.5} ${cx} ${cy - r * 0.56}Q${cx - r * 0.82} ${cy - r * 0.5} ${cx - r * 1.03} ${cy + r * 0.05}z`}
            fill={INK}
            {...line}
          />
          <circle cx={cx - r * 0.92} cy={cy - r * 0.34} r={r * 0.17} fill="var(--color-pink)" {...line} strokeWidth={sw * 0.8} />
          <circle cx={cx + r * 0.92} cy={cy - r * 0.34} r={r * 0.17} fill="var(--color-pink)" {...line} strokeWidth={sw * 0.8} />
          <circle cx={cx - r * 0.34} cy={cy + r * 0.14} r={r * 0.11} fill={INK} />
          <circle cx={cx + r * 0.34} cy={cy + r * 0.14} r={r * 0.11} fill={INK} />
          <path d={`M${cx - r * 0.3} ${cy + r * 0.5}Q${cx} ${cy + r * 0.78} ${cx + r * 0.3} ${cy + r * 0.5}`} fill="none" {...line} />
        </>
      );
    }
    // The family cat.
    case 'cat': {
      const r = w * 0.3;
      const cy = h * 0.58;
      return (
        <>
          <path d={`M${cx - w * 0.4} ${h + 2}C${cx - w * 0.38} ${cy + r * 0.8} ${cx + w * 0.38} ${cy + r * 0.8} ${cx + w * 0.4} ${h + 2}z`} fill={PAPER} {...line} />
          <path d={`M${cx - r * 0.98} ${cy - r * 0.2}L${cx - r * 0.86} ${cy - r * 1.3}L${cx - r * 0.18} ${cy - r * 0.78}z`} fill={PAPER} {...line} />
          <path d={`M${cx + r * 0.98} ${cy - r * 0.2}L${cx + r * 0.86} ${cy - r * 1.3}L${cx + r * 0.18} ${cy - r * 0.78}z`} fill={PAPER} {...line} />
          <ellipse cx={cx} cy={cy} rx={r * 1.05} ry={r * 0.9} fill={PAPER} {...line} />
          <path d={`M${cx - r * 0.72} ${cy - r * 0.66}L${cx - r * 0.72} ${cy - r * 1.02}M${cx + r * 0.72} ${cy - r * 0.66}L${cx + r * 0.72} ${cy - r * 1.02}`} {...line} />
          <ellipse cx={cx - r * 0.4} cy={cy - r * 0.05} rx={r * 0.11} ry={r * 0.16} fill={INK} />
          <ellipse cx={cx + r * 0.4} cy={cy - r * 0.05} rx={r * 0.11} ry={r * 0.16} fill={INK} />
          <path d={`M${cx - r * 0.13} ${cy + r * 0.24}h${r * 0.26}l${-r * 0.13} ${r * 0.14}z`} fill="var(--color-pink)" {...line} strokeWidth={sw * 0.7} />
        </>
      );
    }
    case 'landscape':
      return (
        <>
          <circle cx={w * 0.68} cy={h * 0.34} r={Math.min(w, h) * 0.16} fill={PAPER} {...line} />
          <path d={`M-2 ${h * 0.8}Q${w * 0.28} ${h * 0.44} ${w * 0.56} ${h * 0.76}T${w + 2} ${h * 0.64}V${h + 2}H-2z`} fill={INK} />
        </>
      );
    // "Anything goes": the shuffle arrows printed big (compact only).
    case 'shuffle': {
      const s = Math.min(w, h) / 24;
      return (
        <g transform={`translate(${cx - 12 * s} ${h / 2 - 12 * s}) scale(${s})`} fill="none" stroke={INK} strokeWidth={sw / s} strokeLinecap="round" strokeLinejoin="round">
          <path d="M3.5 7.2h2.7c2.1 0 3.4 1 4.5 2.8l2.6 4.2c1.1 1.8 2.4 2.8 4.5 2.8h2.6" />
          <path d="M3.5 16.8h2.7c1.5 0 2.6-.5 3.5-1.4M14.3 8.6c.9-.9 2-1.4 3.5-1.4h2.6" />
          <path d="m17.6 4.3 2.9 2.9-2.9 2.9M17.6 13.9l2.9 2.9-2.9 2.9" />
        </g>
      );
    }
  }
}

function starPath(cx: number, cy: number, outer: number, inner: number, n = 5) {
  const pts = Array.from({ length: n * 2 }, (_, i) => {
    const r = i % 2 ? inner : outer;
    const a = (Math.PI / n) * i - Math.PI / 2;
    return `${(cx + r * Math.cos(a)).toFixed(2)} ${(cy + r * Math.sin(a)).toFixed(2)}`;
  });
  return `M${pts.join('L')}z`;
}

interface PrintSpec {
  x: number;
  y: number;
  w: number;
  h: number;
  rotate?: number;
  subject: Subject;
  /** Photo background (defaults to the theme accent). */
  bg?: string;
}

/** An instant print: white frame, thicker bottom margin, subject clipped to the photo. */
function Print({ spec, accent, id, sw }: { spec: PrintSpec; accent: string; id: string; sw: Strokes }) {
  const { x, y, w, h, rotate = 0 } = spec;
  const m = Math.max(2.5, w * 0.1);
  const pw = w - m * 2;
  const ph = h - m - m * 2.2;
  const clip = `${id}-clip`;
  return (
    <g transform={`rotate(${rotate} ${x + w / 2} ${y + h / 2})`}>
      <rect x={x} y={y + sw.frame * 0.85} width={w} height={h} rx={2.5} fill={INK} />
      <rect x={x} y={y} width={w} height={h} rx={2.5} fill={PAPER} stroke={INK} strokeWidth={sw.frame} />
      <clipPath id={clip}>
        <rect x={x + m} y={y + m} width={pw} height={ph} rx={1} />
      </clipPath>
      <g clipPath={`url(#${clip})`}>
        <rect x={x + m} y={y + m} width={pw} height={ph} fill={spec.bg ?? accent} />
        <g transform={`translate(${x + m} ${y + m})`}>{subjectShape(spec.subject, pw, ph, sw.line, spec.bg ?? accent)}</g>
      </g>
      <rect x={x + m} y={y + m} width={pw} height={ph} rx={1} fill="none" stroke={INK} strokeWidth={sw.edge} />
    </g>
  );
}

/** A heart sticker slapped on the print: this is the one somebody picked. */
function heartPath(cx: number, cy: number, k: number) {
  const p = (x: number, y: number) => `${(cx + x * k).toFixed(2)} ${(cy + y * k).toFixed(2)}`;
  return `M${p(0, 8)}C${p(-2, 6.6)} ${p(-9, 2.4)} ${p(-9, -2.2)}C${p(-9, -5.4)} ${p(-6.6, -7.6)} ${p(-4, -7.6)}C${p(-2.2, -7.6)} ${p(-0.8, -6.6)} ${p(0, -5.2)}C${p(0.8, -6.6)} ${p(2.2, -7.6)} ${p(4, -7.6)}C${p(6.6, -7.6)} ${p(9, -5.4)} ${p(9, -2.2)}C${p(9, 2.4)} ${p(2, 6.6)} ${p(0, 8)}z`;
}

interface Scene {
  prints: PrintSpec[];
  extra?: ReactNode;
}

const SCENES: Record<Theme, Scene> = {
  parents: {
    // Dad's print lands on top of Mom's.
    prints: [
      { x: 29, y: 13, w: 31, h: 39, rotate: 8, subject: 'mom' },
      { x: 4, y: 11, w: 31, h: 39, rotate: -10, subject: 'dad' },
    ],
  },
  family: {
    prints: [
      { x: 1.5, y: 27, w: 21, h: 26, rotate: -13, subject: 'girl' },
      { x: 41.5, y: 30, w: 21, h: 26, rotate: 12, subject: 'cat' },
      { x: 16, y: 7, w: 32, h: 40, rotate: -2, subject: 'mom' },
    ],
  },
  childhood: {
    prints: [{ x: 12, y: 11, w: 36, h: 44, rotate: -6, subject: 'kid' }],
    extra: <path d={starPath(50, 15, 10, 4.4)} fill="var(--color-sun)" stroke={INK} strokeWidth={3} strokeLinejoin="round" transform="rotate(12 50 15)" />,
  },
  pick: {
    prints: [{ x: 4, y: 12, w: 48, h: 42, rotate: -5, subject: 'landscape' }],
    extra: <path d={heartPath(49, 14, 1.12)} fill="var(--color-pink)" stroke={INK} strokeWidth={3} strokeLinejoin="round" transform="rotate(14 49 14)" />,
  },
  mix: {
    prints: [
      { x: 5, y: 13, w: 25, h: 31, rotate: -20, subject: 'kid' },
      { x: 34, y: 13, w: 25, h: 31, rotate: 20, subject: 'landscape' },
      { x: 19.5, y: 7, w: 25, h: 31, rotate: 0, subject: 'dad' },
    ],
    extra: (
      <g>
        <circle cx="32" cy="50" r="10.5" fill={PAPER} stroke={INK} strokeWidth={3} />
        <g fill="none" stroke={INK} strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round">
          <path d="M25.6 46.4h1.6c1.5 0 2.4.7 3.2 2l1.8 3.1c.8 1.3 1.7 2 3.2 2h2.4" />
          <path d="M25.6 53.6h1.6c1.1 0 1.9-.4 2.5-1M33.9 47.4c.6-.6 1.4-1 2.5-1h2.4" />
          <path d="m36.9 44.5 2.1 1.9-2.1 1.9M36.9 51.6l2.1 1.9-2.1 1.9" />
        </g>
      </g>
    ),
  },
};

/** Small sizes: one print, one big subject, no badges. */
const COMPACT_SUBJECT: Record<Theme, Subject> = {
  parents: 'dad',
  family: 'girl',
  childhood: 'kid',
  pick: 'landscape',
  mix: 'shuffle',
};
const COMPACT_PRINT = { x: 8, y: 4, w: 48, h: 56, rotate: -4 };

export interface ThemeArtProps {
  theme: Theme;
  className?: string;
  /** Accessible name; decorative (aria-hidden) without it. */
  label?: string;
  /**
   * Force the compact drawing (one print, bigger subject, heavier strokes). By default it is
   * picked from the rendered width: compact under 48px.
   */
  compact?: boolean;
}

/** `size-N` in a class list → px (Tailwind's 4px spacing scale), for the first render. */
function guessWidth(className?: string): number | null {
  const m = className?.match(/(?:^|\s)size-(\d+(?:\.\d+)?)(?:\s|$)/);
  return m ? Number(m[1]) * 4 : null;
}

/**
 * A mini illustration per game theme (flat prints, thick ink outline, the theme accent):
 * <ThemeArt theme="childhood" className="size-16" />. Under 48px it switches to a compact
 * drawing automatically (or force it with `compact`).
 */
export function ThemeArt({ theme, className, label, compact }: ThemeArtProps) {
  const uid = useId().replace(/:/g, '');
  const ref = useRef<SVGSVGElement>(null);
  const [small, setSmall] = useState(() => (guessWidth(className) ?? 64) < COMPACT_BELOW);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || compact !== undefined) return;
    // Layout width (ignores transforms, so a card scaling in does not flip it).
    const measure = () => {
      const w = parseFloat(getComputedStyle(el).width);
      if (w > 0) setSmall(w < COMPACT_BELOW);
    };
    measure();
    if (typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [compact]);

  const isCompact = compact ?? small;
  const accent = themeColor(theme);
  const scene: Scene = isCompact ? { prints: [{ ...COMPACT_PRINT, subject: COMPACT_SUBJECT[theme] }] } : SCENES[theme];
  const sw = isCompact ? COMPACT : FULL;
  return (
    <svg
      ref={ref}
      viewBox="0 0 64 64"
      width="64"
      height="64"
      className={cn('inline-block shrink-0 overflow-visible', className)}
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    >
      {scene.prints.map((p, i) => (
        <Print key={i} spec={p} accent={accent} id={`${uid}-${i}`} sw={sw} />
      ))}
      {scene.extra}
    </svg>
  );
}
