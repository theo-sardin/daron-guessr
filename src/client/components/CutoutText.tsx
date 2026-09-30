import { motion, useReducedMotion } from 'motion/react';
import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type ElementType } from 'react';
import { cn } from '../lib/util';
import { useLetteringReady } from './paper/fonts';
import { hash, rng, scissorClip } from './paper/geometry';

/** Light (white papers), dark (ink) or color: the draw never puts two lights side by side. */
export type ScrapTone = 'light' | 'dark' | 'color';

/** One kind of magazine scrap: paper, ink, typeface and print pattern. */
export interface Scrap {
  bg: string;
  fg: string;
  font: string;
  /** Size relative to the base size (wide faces get smaller). */
  scale: number;
  /** Average glyph width in em (a rough estimate; the real layout is measured). */
  width: number;
  italic?: boolean;
  pattern?: 'news' | 'half' | 'lines' | 'dots' | 'kraft';
  /** Tone family (see ScrapTone). */
  tone: ScrapTone;
  /** The paper itself: two scraps of the same paper never follow each other. */
  paper: string;
}

const INK = 'var(--color-ink)';
const CREAM = '#fff6e0';

export const SCRAPS: Scrap[] = [
  { bg: 'var(--color-sheet)', fg: INK, font: 'var(--font-abril)', scale: 1, width: 0.66, pattern: 'news', tone: 'light', paper: 'white' },
  { bg: 'var(--color-red)', fg: '#fff', font: 'var(--font-anton)', scale: 0.98, width: 0.5, tone: 'color', paper: 'red' },
  { bg: 'var(--color-yellow)', fg: INK, font: 'var(--font-rubik)', scale: 0.74, width: 0.98, pattern: 'half', tone: 'color', paper: 'yellow' },
  { bg: '#fff', fg: 'var(--color-blue)', font: 'var(--font-dmserif)', scale: 1.06, width: 0.62, italic: true, pattern: 'lines', tone: 'light', paper: 'white' },
  { bg: INK, fg: CREAM, font: 'var(--font-alfa)', scale: 0.88, width: 0.76, tone: 'dark', paper: 'ink' },
  { bg: 'var(--color-pink)', fg: INK, font: 'var(--font-bungee)', scale: 0.8, width: 0.8, tone: 'color', paper: 'pink' },
  { bg: 'var(--color-kraft)', fg: INK, font: 'var(--font-abril)', scale: 1, width: 0.66, pattern: 'kraft', tone: 'color', paper: 'kraft' },
  { bg: 'var(--color-blue)', fg: '#fff', font: 'var(--font-rubik)', scale: 0.72, width: 0.98, tone: 'color', paper: 'blue' },
  { bg: '#fff', fg: 'var(--color-red)', font: 'var(--font-abril)', scale: 1, width: 0.66, pattern: 'lines', tone: 'light', paper: 'white' },
  { bg: 'var(--color-yellow)', fg: INK, font: 'var(--font-anton)', scale: 1.02, width: 0.5, pattern: 'half', tone: 'color', paper: 'yellow' },
  { bg: 'var(--color-sheet)', fg: INK, font: 'var(--font-dmserif)', scale: 1.04, width: 0.64, italic: true, pattern: 'news', tone: 'light', paper: 'white' },
  { bg: 'var(--color-red)', fg: '#fff', font: 'var(--font-heavy)', scale: 0.84, width: 0.8, tone: 'color', paper: 'red' },
  { bg: 'var(--color-mint)', fg: INK, font: 'var(--font-alfa)', scale: 0.86, width: 0.76, tone: 'color', paper: 'mint' },
  { bg: INK, fg: 'var(--color-yellow)', font: 'var(--font-heavy)', scale: 0.84, width: 0.8, pattern: 'dots', tone: 'dark', paper: 'ink' },
];

export const PATTERN: Record<NonNullable<Scrap['pattern']>, CSSProperties> = {
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
 * May scrap `i` follow `h1` (the previous letter's scrap) and `h2` (the one before)? Never the
 * same paper twice in a row, at most one light and one dark in any run of three, and a light
 * is always followed by a color: names come out colorful, never plain black and white.
 */
function fits(i: number, h1: number, h2: number): boolean {
  const s = SCRAPS[i];
  const p1 = h1 >= 0 ? SCRAPS[h1] : null;
  const p2 = h2 >= 0 ? SCRAPS[h2] : null;
  if (p1 && (i === h1 || s.paper === p1.paper)) return false;
  if (p1?.tone === 'light' && s.tone !== 'color') return false;
  if (s.tone !== 'color' && (p1?.tone === s.tone || p2?.tone === s.tone)) return false;
  return true;
}

/**
 * The deterministic layout of a string: same text + seed → same scraps, rotations and cuts,
 * on every render and every player's screen.
 */
export function cutoutLetters(text: string, seed: number | string = 0): CutoutLetter[][] {
  const base = hash(`${text}|${seed}`);
  const r = rng(base);
  let h1 = -1;
  let h2 = -1;
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
      const first = Math.floor(r() * SCRAPS.length);
      // Walk the scraps from the drawn one (stride 5 visits all 14) until one fits the rules.
      let pick = first;
      for (let t = 0; t < SCRAPS.length; t++) {
        const cand = (first + t * 5) % SCRAPS.length;
        if (fits(cand, h1, h2)) {
          pick = cand;
          break;
        }
      }
      h2 = h1;
      h1 = pick;
      const rotate = +((r() - 0.5) * 11).toFixed(1);
      const y = +((r() - 0.62) * 0.12).toFixed(3);
      const size = +(SCRAPS[pick].scale * (0.93 + r() * 0.13)).toFixed(3);
      return { char, scrap: pick, rotate, y, size, clip: scissorClip(base + wi * 131 + ci * 17 + 1, 8) };
    }),
  );
}

/** "Jean-Christophe" → ["Jean-", "Christophe"]: the pieces a compound word may wrap between. */
function splitAfterHyphens(word: CutoutLetter[]): CutoutLetter[][] {
  const parts: CutoutLetter[][] = [[]];
  word.forEach((l, i) => {
    parts[parts.length - 1].push(l);
    if (/^[-‐]$/u.test(l.char) && i > 0 && i < word.length - 1) parts.push([]);
  });
  return parts;
}

/** One soft shadow under the whole cut-out (applied once the letters have landed). */
const SHADOW = 'drop-shadow(0 2px 2px rgb(40 25 10 / 0.3))';

export interface CutoutTextProps {
  /** The text (read by screen readers as-is). */
  text: string;
  /** Base letter size: a preset or px (default md = 42px). It is a maximum, see below. */
  size?: CutoutSize | number;
  /** Change the draw for the same text (default 0). */
  seed?: number | string;
  /** Uppercase letters (default true). */
  uppercase?: boolean;
  /**
   * One line that shrinks to the container's width (never wraps). The element becomes a
   * full-width block. Default false: the text wraps between words and the size shrinks only
   * as much as the longest word needs to fit (a 16-letter name on a 320px phone).
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
 *
 * Never overflows: `size` is the largest size; the rendered words are measured against the
 * available width (the parent's, or what a flex row leaves) and scaled down when the longest
 * word (or the whole line with `fit`) would not fit. In a flex row next to an avatar it
 * shrinks with the row (it is `min-w-0`).
 */
export function CutoutText({ text, size = 'md', seed = 0, uppercase = true, fit = false, animate = false, stagger = 0.045, as: Tag = 'span', className, style }: CutoutTextProps) {
  const px = typeof size === 'number' ? size : CUTOUT_SIZES[size];
  const words = cutoutLetters(text, seed);
  const delay0 = typeof animate === 'number' ? animate : 0;
  const reduce = useReducedMotion();
  const fontsReady = useLetteringReady();
  const play = animate !== false && !reduce;
  const count = words.reduce((n, w) => n + w.length, 0);

  // The shadow filter waits until every letter has landed (a filter over moving children is
  // re-rasterized on every frame).
  const [settled, setSettled] = useState(!play);
  useEffect(() => {
    if (!play) {
      setSettled(true);
      return;
    }
    if (!fontsReady) return;
    setSettled(false);
    const id = window.setTimeout(() => setSettled(true), (delay0 + count * stagger + 0.45) * 1000);
    return () => window.clearTimeout(id);
  }, [play, fontsReady, delay0, count, stagger]);

  const ref = useRef<HTMLElement>(null);
  const innerRef = useRef<HTMLSpanElement>(null);
  useFitScale(ref, innerRef, `${text}|${seed}|${uppercase}|${px}|${fit}|${fontsReady}`, fit, px);

  let n = 0;
  return (
    <Tag ref={ref} className={cn(fit ? 'block w-full text-center' : 'inline-block', 'min-w-0 max-w-full', className)} style={style}>
      <span className="sr-only">{text}</span>
      <span
        ref={innerRef}
        aria-hidden
        className={cn('inline-flex max-w-full items-end justify-center gap-x-[0.3em] gap-y-[0.12em] leading-none', fit ? 'flex-nowrap' : 'flex-wrap')}
        style={{ fontSize: `calc(${px}px * var(--cut-scale, 1))`, filter: settled ? SHADOW : 'none', transition: 'filter 0.25s' }}
      >
        {words.map((word, wi) => (
          // A word; a compound name ("Jean-Christophe") may break after its hyphens.
          <span key={wi} className={cn('inline-flex max-w-full items-end justify-center', fit ? 'flex-nowrap' : 'flex-wrap')}>
            {splitAfterHyphens(word).map((part, pi) => (
              <span key={pi} data-part className="inline-flex shrink-0 items-end gap-[0.02em] whitespace-nowrap">
                {part.map((l) => {
                  const i = n++;
                  if (!isLetterLike(l.char)) {
                    // Emoji and odd symbols: stuck on as they are, no scrap.
                    return (
                      <span key={i} className="emoji inline-block px-[0.04em]" style={{ fontSize: '0.8em', rotate: `${l.rotate}deg` }}>
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
                  if (!play) {
                    return (
                      <span key={i} className="inline-block" style={{ ...letterStyle, transform: `translateY(${l.y}em) rotate(${l.rotate}deg)` }}>
                        {l.char}
                      </span>
                    );
                  }
                  const from = { opacity: 0, scale: 1.7, rotate: l.rotate * 3 + (i % 2 ? 14 : -14), y: `${l.y}em` };
                  return (
                    <motion.span
                      key={i}
                      className="inline-block"
                      style={letterStyle}
                      initial={from}
                      // Held in the air until the faces are loaded (no slap in Georgia, then a swap).
                      animate={fontsReady ? { opacity: 1, scale: 1, rotate: l.rotate, y: `${l.y}em` } : from}
                      transition={{ type: 'spring', stiffness: 600, damping: 20, delay: delay0 + i * stagger, opacity: { duration: 0.08, delay: delay0 + i * stagger } }}
                    >
                      {l.char}
                    </motion.span>
                  );
                })}
              </span>
            ))}
          </span>
        ))}
      </span>
    </Tag>
  );
}

/**
 * Scales the letters (`--cut-scale` on `inner`) so the longest word (or, with `fit`, the whole
 * line) fits the width `outer` gets. Measures untransformed layout sizes only, and only when
 * the text, the fonts or the available width change (never on a plain re-render).
 */
function useFitScale(outerRef: React.RefObject<HTMLElement | null>, innerRef: React.RefObject<HTMLSpanElement | null>, key: string, fit: boolean, px: number) {
  /** Our width and the parent's right after the last measure (our own rescale is not a change). */
  const settled = useRef({ w: -1, parent: -1 });
  const measure = useRef<() => void>(() => undefined);

  measure.current = () => {
    const el = outerRef.current;
    const inner = innerRef.current;
    if (!el || !inner) return;
    inner.style.setProperty('--cut-scale', '1');
    const cs = getComputedStyle(el);
    const avail = el.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
    const wordEls = Array.from(inner.children) as HTMLElement[];
    const partEls = Array.from(inner.querySelectorAll<HTMLElement>('[data-part]'));
    const need = fit
      ? partEls.reduce((sum, w) => sum + w.offsetWidth, 0) + Math.max(0, wordEls.length - 1) * px * 0.3
      : partEls.reduce((max, w) => Math.max(max, w.offsetWidth), 0);
    const scale = avail > 0 && need > avail + 0.5 ? Math.max(0.15, (avail - 1) / need) : 1;
    if (scale < 1) inner.style.setProperty('--cut-scale', scale.toFixed(4));
    settled.current = { w: el.offsetWidth, parent: el.parentElement?.clientWidth ?? 0 };
  };

  useLayoutEffect(() => {
    measure.current();
  }, [key]);

  useLayoutEffect(() => {
    const el = outerRef.current;
    if (!el) return;
    const check = () => {
      const moved = Math.abs(el.offsetWidth - settled.current.w) > 0.5 || Math.abs((el.parentElement?.clientWidth ?? 0) - settled.current.parent) > 0.5;
      if (moved) measure.current();
    };
    // A late font swap changes the letters' widths without resizing a capped wrapper.
    const fonts = typeof document !== 'undefined' ? document.fonts : undefined;
    const onFonts = () => measure.current();
    fonts?.addEventListener?.('loadingdone', onFonts);
    if (typeof ResizeObserver === 'undefined') return () => fonts?.removeEventListener?.('loadingdone', onFonts);
    const ro = new ResizeObserver(check);
    ro.observe(el);
    if (el.parentElement) ro.observe(el.parentElement);
    return () => {
      ro.disconnect();
      fonts?.removeEventListener?.('loadingdone', onFonts);
    };
  }, [outerRef]);
}
