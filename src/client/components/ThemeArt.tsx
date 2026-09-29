import { useId, type ReactNode } from 'react';
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
const SW = 3;

type Subject = 'dad' | 'mom' | 'kid' | 'pet' | 'landscape' | 'star';

/** A subject drawn inside a w x h photo (origin top-left). Silhouettes are flat ink. */
function subjectShape(subject: Subject, w: number, h: number): ReactNode {
  const cx = w / 2;
  switch (subject) {
    case 'dad': {
      const r = w * 0.2;
      const cy = h * 0.42;
      return (
        <>
          <ellipse cx={cx} cy={h * 1.04} rx={w * 0.44} ry={h * 0.36} fill={INK} />
          <circle cx={cx} cy={cy} r={r} fill={INK} />
          {/* Short hair: a flat-top cap. */}
          <path d={`M${cx - r * 1.05} ${cy - r * 0.15}Q${cx - r * 1.1} ${cy - r * 1.3} ${cx} ${cy - r * 1.25}Q${cx + r * 1.1} ${cy - r * 1.3} ${cx + r * 1.05} ${cy - r * 0.15}z`} fill={INK} />
          {/* Big round glasses catching the light. */}
          <g fill="none" stroke={PAPER} strokeWidth={Math.max(1.1, r * 0.2)}>
            <circle cx={cx - r * 0.42} cy={cy + r * 0.1} r={r * 0.34} />
            <circle cx={cx + r * 0.42} cy={cy + r * 0.1} r={r * 0.34} />
          </g>
        </>
      );
    }
    case 'mom': {
      const r = w * 0.19;
      const cy = h * 0.42;
      return (
        <>
          {/* Bob haircut behind the head. */}
          <rect x={cx - r * 1.55} y={cy - r * 1.35} width={r * 3.1} height={r * 3.4} rx={r * 1.45} fill={INK} />
          <ellipse cx={cx} cy={h * 1.05} rx={w * 0.42} ry={h * 0.34} fill={INK} />
          <circle cx={cx} cy={cy} r={r} fill={INK} />
        </>
      );
    }
    case 'kid': {
      const r = w * 0.23;
      const cy = h * 0.5;
      return (
        <>
          <ellipse cx={cx} cy={h * 1.08} rx={w * 0.34} ry={h * 0.3} fill={INK} />
          <circle cx={cx} cy={cy} r={r} fill={INK} />
          {/* The curl on top. */}
          <path d={`M${cx - r * 0.1} ${cy - r * 0.9}c-${r * 0.1} -${r * 0.55} ${r * 0.55} -${r * 0.75} ${r * 0.6} -${r * 0.25}`} stroke={INK} strokeWidth={SW * 0.8} fill="none" strokeLinecap="round" />
        </>
      );
    }
    case 'pet': {
      const r = w * 0.24;
      const cy = h * 0.56;
      return (
        <>
          <ellipse cx={cx} cy={h * 1.1} rx={w * 0.36} ry={h * 0.28} fill={INK} />
          <path d={`M${cx - r * 0.95} ${cy - r * 0.35}L${cx - r * 0.85} ${cy - r * 1.45}L${cx - r * 0.1} ${cy - r * 0.85}z`} fill={INK} stroke={INK} strokeWidth={1.5} strokeLinejoin="round" />
          <path d={`M${cx + r * 0.95} ${cy - r * 0.35}L${cx + r * 0.85} ${cy - r * 1.45}L${cx + r * 0.1} ${cy - r * 0.85}z`} fill={INK} stroke={INK} strokeWidth={1.5} strokeLinejoin="round" />
          <ellipse cx={cx} cy={cy} rx={r * 1.02} ry={r * 0.9} fill={INK} />
        </>
      );
    }
    case 'landscape':
      return (
        <>
          <circle cx={w * 0.7} cy={h * 0.34} r={Math.min(w, h) * 0.15} fill={PAPER} stroke={INK} strokeWidth={SW * 0.75} />
          <path d={`M-2 ${h * 0.82}Q${w * 0.28} ${h * 0.42} ${w * 0.55} ${h * 0.78}T${w + 2} ${h * 0.66}V${h + 2}H-2z`} fill={INK} />
        </>
      );
    case 'star':
      return <path d={starPath(cx, h * 0.52, w * 0.3, w * 0.13)} fill={PAPER} stroke={INK} strokeWidth={SW * 0.75} strokeLinejoin="round" />;
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

/** A 4-point twinkle. */
function twinkle(cx: number, cy: number, r: number) {
  const q = r * 0.16;
  return `M${cx} ${cy - r}Q${cx + q} ${cy - q} ${cx + r} ${cy}Q${cx + q} ${cy + q} ${cx} ${cy + r}Q${cx - q} ${cy + q} ${cx - r} ${cy}Q${cx - q} ${cy - q} ${cx} ${cy - r}z`;
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
function Print({ spec, accent, id }: { spec: PrintSpec; accent: string; id: string }) {
  const { x, y, w, h, rotate = 0 } = spec;
  const m = Math.max(2.5, w * 0.1);
  const pw = w - m * 2;
  const ph = h - m - m * 2.2;
  const clip = `${id}-clip`;
  return (
    <g transform={`rotate(${rotate} ${x + w / 2} ${y + h / 2})`}>
      <rect x={x} y={y + 2.5} width={w} height={h} rx={2.5} fill={INK} />
      <rect x={x} y={y} width={w} height={h} rx={2.5} fill={PAPER} stroke={INK} strokeWidth={SW} />
      <clipPath id={clip}>
        <rect x={x + m} y={y + m} width={pw} height={ph} rx={1} />
      </clipPath>
      <g clipPath={`url(#${clip})`}>
        <rect x={x + m} y={y + m} width={pw} height={ph} fill={spec.bg ?? accent} />
        <g transform={`translate(${x + m} ${y + m})`}>{subjectShape(spec.subject, pw, ph)}</g>
      </g>
      <rect x={x + m} y={y + m} width={pw} height={ph} rx={1} fill="none" stroke={INK} strokeWidth={SW * 0.6} />
    </g>
  );
}

const SCENES: Record<Theme, { prints: PrintSpec[]; extra?: (accent: string) => ReactNode }> = {
  parents: {
    prints: [
      { x: 5, y: 12, w: 30, h: 38, rotate: -11, subject: 'dad' },
      { x: 28, y: 14, w: 31, h: 39, rotate: 8, subject: 'mom' },
    ],
  },
  family: {
    prints: [
      { x: 2.5, y: 26, w: 20, h: 25, rotate: -14, subject: 'kid' },
      { x: 42, y: 30, w: 19.5, h: 24, rotate: 13, subject: 'pet' },
      { x: 17, y: 8, w: 30, h: 38, rotate: -2, subject: 'mom' },
    ],
  },
  childhood: {
    prints: [{ x: 13, y: 12, w: 34, h: 42, rotate: -7, subject: 'kid' }],
    extra: () => (
      <>
        <path d={starPath(49, 15, 10, 4.4)} fill="var(--color-sun)" stroke={INK} strokeWidth={SW} strokeLinejoin="round" transform="rotate(12 49 15)" />
        <path d={twinkle(11, 50, 5.5)} fill={PAPER} stroke={INK} strokeWidth={2} strokeLinejoin="round" />
      </>
    ),
  },
  pick: {
    prints: [{ x: 5, y: 11, w: 46, h: 38, rotate: -5, subject: 'landscape' }],
    extra: () => (
      // Pointer: the player picked this one.
      <path
        d="M40 33 40.5 58 46.4 52.3 50.3 60.6 55 58.4 51.2 50.2 59.4 49.7z"
        fill={PAPER}
        stroke={INK}
        strokeWidth={SW}
        strokeLinejoin="round"
      />
    ),
  },
  mix: {
    prints: [
      { x: 6, y: 13, w: 25, h: 31, rotate: -20, subject: 'kid' },
      { x: 33, y: 13, w: 25, h: 31, rotate: 20, subject: 'landscape' },
      { x: 19.5, y: 7, w: 25, h: 31, rotate: 0, subject: 'dad' },
    ],
    extra: () => (
      <g>
        <circle cx="32" cy="50" r="10.5" fill={PAPER} stroke={INK} strokeWidth={SW} />
        <g fill="none" stroke={INK} strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round">
          <path d="M25.6 46.4h1.6c1.5 0 2.4.7 3.2 2l1.8 3.1c.8 1.3 1.7 2 3.2 2h2.4" />
          <path d="M25.6 53.6h1.6c1.1 0 1.9-.4 2.5-1M33.9 47.4c.6-.6 1.4-1 2.5-1h2.4" />
          <path d="m36.9 44.5 2.1 1.9-2.1 1.9M36.9 51.6l2.1 1.9-2.1 1.9" />
        </g>
      </g>
    ),
  },
};

export interface ThemeArtProps {
  theme: Theme;
  className?: string;
  /** Accessible name; decorative (aria-hidden) without it. */
  label?: string;
}

/**
 * A mini illustration per game theme (flat prints, thick ink outline, the theme accent):
 * <ThemeArt theme="childhood" className="size-16" />
 */
export function ThemeArt({ theme, className, label }: ThemeArtProps) {
  const uid = useId().replace(/:/g, '');
  const scene = SCENES[theme];
  const accent = themeColor(theme);
  return (
    <svg
      viewBox="0 0 64 64"
      width="64"
      height="64"
      className={cn('inline-block shrink-0 overflow-visible', className)}
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    >
      {scene.prints.map((p, i) => (
        <Print key={i} spec={p} accent={accent} id={`${uid}-${i}`} />
      ))}
      {scene.extra?.(accent)}
    </svg>
  );
}
