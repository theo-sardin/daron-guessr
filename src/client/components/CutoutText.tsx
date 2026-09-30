import { motion } from 'motion/react';
import type { CSSProperties, ElementType } from 'react';
import { cn } from '../lib/util';
import { hash, rng, scissorClip } from './paper/geometry';

/** One kind of magazine scrap: paper, ink, typeface and print pattern. */
export interface Scrap {
  bg: string;
  fg: string;
  font: string;
  /** Size relative to the base size (wide faces get smaller). */
  scale: number;
  /** Average glyph width in em (for `fit`). */
  width: number;
  italic?: boolean;
  pattern?: 'news' | 'half' | 'lines' | 'dots' | 'kraft';
}

const INK = 'var(--color-ink)';
const CREAM = '#fff6e0';

export const SCRAPS: Scrap[] = [
  { bg: 'var(--color-sheet)', fg: INK, font: 'var(--font-abril)', scale: 1, width: 0.66, pattern: 'news' },
  { bg: 'var(--color-red)', fg: '#fff', font: 'var(--font-anton)', scale: 0.98, width: 0.5 },
  { bg: 'var(--color-yellow)', fg: INK, font: 'var(--font-rubik)', scale: 0.74, width: 0.98, pattern: 'half' },
  { bg: '#fff', fg: 'var(--color-blue)', font: 'var(--font-dmserif)', scale: 1.06, width: 0.62, italic: true, pattern: 'lines' },
  { bg: INK, fg: CREAM, font: 'var(--font-alfa)', scale: 0.88, width: 0.76 },
  { bg: 'var(--color-pink)', fg: INK, font: 'var(--font-bungee)', scale: 0.8, width: 0.8 },
  { bg: 'var(--color-kraft)', fg: INK, font: 'var(--font-abril)', scale: 1, width: 0.66, pattern: 'kraft' },
  { bg: 'var(--color-blue)', fg: '#fff', font: 'var(--font-rubik)', scale: 0.72, width: 0.98 },
  { bg: '#fff', fg: 'var(--color-red)', font: 'var(--font-abril)', scale: 1, width: 0.66, pattern: 'lines' },
  { bg: 'var(--color-yellow)', fg: INK, font: 'var(--font-anton)', scale: 1.02, width: 0.5, pattern: 'half' },
  { bg: 'var(--color-sheet)', fg: INK, font: 'var(--font-dmserif)', scale: 1.04, width: 0.64, italic: true, pattern: 'news' },
  { bg: 'var(--color-red)', fg: '#fff', font: 'var(--font-heavy)', scale: 0.84, width: 0.8 },
  { bg: 'var(--color-mint)', fg: INK, font: 'var(--font-alfa)', scale: 0.86, width: 0.76 },
  { bg: INK, fg: 'var(--color-yellow)', font: 'var(--font-heavy)', scale: 0.84, width: 0.8, pattern: 'dots' },
];

export const PATTERN: Record<NonNullable<Scrap["pattern"]>, CSSProperties> = {
  news: { backgroundImage: 'repeating-linear-gradient(0deg, transparent 0 3px, rgb(0 0 0 / 0.09) 3px 4px)' },
  half: { backgroundImage: 'radial-gradient(rgb(0 0 0 / 0.16) 0.9px, transparent 1.1px)', backgroundSize: '4px 4px' },
  lines: { backgroundImage: 'repeating-linear-gradient(0deg, transparent 0 6px, rgb(35 68 200 / 0.28) 6px 7px)' },
  dots: { backgroundImage: 'radial-gradient(rgb(255 255 255 / 0.3) 1.4px, transparent 1.6px)', backgroundSize: '7px 7px' },
  kraft: { backgroundImage: 'var(--noise)', backgroundSize: '240px 240px', backgroundBlendMode: 'multiply' },
};

export const CUTOUT_SIZES = { xs: 22, sm: 30, md: 42, lg: 58, xl: 72 } as const;
export type CutoutSize = keyof typeof CUTOUT_SIZES;

/** Grapheme clusters (so an emoji with modifiers stays one piece). */
function graphemes(text: string): string[] {
  const Seg = (Intl as unknown as { Segmenter?: new (l?: string, o?: { granularity: string }) => { segment: (s: string) => Iterable<{ segment: string }> } }).Segmenter;
  if (Seg) return Array.from(new Seg(undefined, { granularity: 'grapheme' }).segment(text), (s) => s.segment);
  return Array.from(text);
}

const isLetterLike = (g: string) => /[\p{L}\p{N}!?&@#%$€'’.,:;+\-*/]/u.test(g);

export interface CutoutLetter {
  char: string;
  scrap: number;
  rotate: number;
  /** Vertical offset in em. */
  y: number;
  /** Size multiplier (includes the face's scale). */
  size: number;
  clip: string;
}

/**
 * The deterministic layout of a string: same text + seed → same scraps, rotations and cuts,
 * on every render and every player's screen.
 */
export function cutoutLetters(text: string, seed: number | string = 0): CutoutLetter[][] {
  const base = hash(`${text}|${seed}`);
  const r = rng(base);
  let prev = -1;
  let prevBg = '';
  // French puts a space before ! ? : ; — keep that punctuation glued to its word (no orphan "!").
  const words = text
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .reduce<string[]>((acc, w) => {
      if (acc.length && /^[!?:;»…]+$/u.test(w)) acc[acc.length - 1] += w;
      else acc.push(w);
      return acc;
    }, []);
  return words.map((word, wi) =>
      graphemes(word).map((char, ci) => {
        let pick = Math.floor(r() * SCRAPS.length);
        // Never the same scrap (or the same paper) twice in a row.
        for (let tries = 0; tries < 6 && (pick === prev || SCRAPS[pick].bg === prevBg); tries++) pick = (pick + 1 + Math.floor(r() * 5)) % SCRAPS.length;
        prev = pick;
        prevBg = SCRAPS[pick].bg;
        const rotate = +((r() - 0.5) * 11).toFixed(1);
        const y = +((r() - 0.62) * 0.12).toFixed(3);
        const size = +(SCRAPS[pick].scale * (0.93 + r() * 0.13)).toFixed(3);
        return { char, scrap: pick, rotate, y, size, clip: scissorClip(base + wi * 131 + ci * 17 + 1, 8) };
      }),
    );
}

export interface CutoutTextProps {
  /** The text (read by screen readers as-is). */
  text: string;
  /** Base letter size: a preset or px (default md = 42px). */
  size?: CutoutSize | number;
  /** Change the draw for the same text (default 0). */
  seed?: number | string;
  /** Uppercase letters (default true). */
  uppercase?: boolean;
  /**
   * Shrink to fit the container's width (one line, never wraps). The container must give it a
   * width (a block parent). Default false: long text wraps between words.
   */
  fit?: boolean;
  /** Letters get slapped on one by one when it mounts (default false). A number delays it (s). */
  animate?: boolean | number;
  /** Delay between two letters (s, default 0.045). */
  stagger?: number;
  /** Tag of the wrapper (default span). Use h1/h2 for headings. */
  as?: ElementType;
  className?: string;
  style?: CSSProperties;
}

/**
 * Ransom-note letters: every letter cut out of a different magazine (paper, typeface, print
 * pattern, rotation), deterministic per string. The real text stays accessible (sr-only).
 *   <CutoutText text="Julie!" size="lg" animate as="h2" />
 */
export function CutoutText({ text, size = 'md', seed = 0, uppercase = true, fit = false, animate = false, stagger = 0.045, as: Tag = 'span', className, style }: CutoutTextProps) {
  const px = typeof size === 'number' ? size : CUTOUT_SIZES[size];
  const words = cutoutLetters(text, seed);
  const delay0 = typeof animate === 'number' ? animate : 0;

  // `fit`: estimate the line width in em from the chosen faces, then cap the font size in cqw.
  let fontSize: string = `${px}px`;
  if (fit) {
    const em = words.reduce(
      (sum, w, i) => sum + (i ? 0.3 : 0) + w.reduce((s, l) => s + (isLetterLike(l.char) ? SCRAPS[l.scrap].width * l.size + 0.22 : 1.1), 0),
      0,
    );
    fontSize = `min(${px}px, ${(96 / Math.max(1, em)).toFixed(2)}cqw)`;
  }

  let n = 0;
  const content = (
    <span
      aria-hidden
      className={cn('inline-flex max-w-full flex-wrap items-end justify-center gap-x-[0.3em] gap-y-[0.12em] leading-none', fit && 'flex-nowrap whitespace-nowrap')}
      style={{ fontSize, filter: 'drop-shadow(0 1px 0 rgb(40 25 10 / 0.22)) drop-shadow(0 4px 5px rgb(40 25 10 / 0.2))' }}
    >
      {words.map((word, wi) => (
        <span key={wi} className="inline-flex items-end gap-[0.02em] whitespace-nowrap">
          {word.map((l, li) => {
            const i = n++;
            if (!isLetterLike(l.char)) {
              // Emoji and odd symbols: stuck on as they are, no scrap.
              return (
                <span key={li} className="emoji inline-block px-[0.04em]" style={{ fontSize: '0.8em', rotate: `${l.rotate}deg` }}>
                  {l.char}
                </span>
              );
            }
            const s = SCRAPS[l.scrap];
            const letterStyle: CSSProperties = {
              fontFamily: s.font,
              fontStyle: s.italic ? 'italic' : undefined,
              fontSize: `${l.size}em`,
              color: s.fg,
              backgroundColor: s.bg,
              ...(s.pattern ? PATTERN[s.pattern] : null),
              clipPath: l.clip,
              padding: '0.1em 0.1em 0.06em',
              lineHeight: 0.92,
              letterSpacing: 0,
              fontWeight: 400,
              textTransform: uppercase ? 'uppercase' : undefined,
            };
            return animate !== false ? (
              <motion.span
                key={li}
                className="inline-block"
                style={letterStyle}
                initial={{ opacity: 0, scale: 1.7, rotate: l.rotate * 3 + (i % 2 ? 14 : -14), y: `${l.y}em` }}
                animate={{ opacity: 1, scale: 1, rotate: l.rotate, y: `${l.y}em` }}
                transition={{ type: 'spring', stiffness: 600, damping: 20, delay: delay0 + i * stagger, opacity: { duration: 0.08, delay: delay0 + i * stagger } }}
              >
                {l.char}
              </motion.span>
            ) : (
              <span key={li} className="inline-block" style={{ ...letterStyle, transform: `translateY(${l.y}em) rotate(${l.rotate}deg)` }}>
                {l.char}
              </span>
            );
          })}
        </span>
      ))}
    </span>
  );

  return (
    <Tag className={cn(fit ? 'block w-full text-center' : 'inline-block', 'max-w-full', className)} style={fit ? { containerType: 'inline-size', ...style } : style}>
      <span className="sr-only">{text}</span>
      {content}
    </Tag>
  );
}
