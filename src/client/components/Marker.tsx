import { AnimatePresence, motion } from 'motion/react';
import { useEffect, type CSSProperties, type ElementType, type ReactNode } from 'react';
import { sfx } from '../lib/sfx';
import { cn } from '../lib/util';
import { arrowPaths, crossPath, loopPath, underlinePath } from './paper/geometry';
import { useElementSize, useSeed } from './paper/hooks';
import { rel } from './paper/cls';

/*
 * Hand-drawn marks: marker loops around a pick, underlines, arrows, checks, crosses, notes in
 * the margin and highlighter swipes. The strokes draw themselves (pathLength) when they appear;
 * MotionConfig reducedMotion="user" skips the drawing.
 */

export type InkTone = 'red' | 'blue' | 'ink' | 'yellow' | 'pink' | 'white';

export const INK_COLOR: Record<InkTone, string> = {
  red: 'var(--color-red)',
  blue: 'var(--color-blue)',
  ink: 'var(--color-ink)',
  yellow: 'var(--color-yellow)',
  pink: '#e0569a',
  white: '#fffdf6',
};

const DRAW = (duration: number, delay: number) => ({ duration, delay, ease: [0.45, 0.05, 0.3, 1] as const });

function useDrawSound(active: boolean, sound: boolean | undefined, delay: number) {
  useEffect(() => {
    if (!active || !sound) return;
    const id = window.setTimeout(() => sfx.play('marker'), delay * 1000);
    return () => window.clearTimeout(id);
  }, [active, sound, delay]);
}

interface StrokeProps {
  tone?: InkTone;
  /** Stroke width in px (default ~3.5). */
  strokeWidth?: number;
  /** Draw the stroke when it appears (default true). */
  animate?: boolean;
  /** Delay before drawing (s). */
  delay?: number;
  /** Play the marker squeak when it draws (default false). */
  sound?: boolean;
  seed?: number | string;
}

export interface MarkerCircleProps extends StrokeProps {
  children?: ReactNode;
  /** Show the loop (default true): toggle it to circle / un-circle the content. */
  show?: boolean;
  /** Room between the content and the loop in px (default 10). */
  pad?: number;
  as?: ElementType;
  className?: string;
  style?: CSSProperties;
}

/** A marker loop drawn around its children (the pick you voted for, the right answer). */
export function MarkerCircle({ children, show = true, pad = 10, tone = 'red', strokeWidth = 3.6, animate = true, delay = 0, sound, seed, as: Tag = 'span', className, style }: MarkerCircleProps) {
  const [ref, { w, h }] = useElementSize<HTMLElement>();
  const s = useSeed(seed);
  useDrawSound(show && animate, sound, delay);
  return (
    <Tag ref={ref} className={cn(rel(className), Tag === 'span' && 'inline-block', className)} style={style}>
      {children}
      <AnimatePresence>
        {show && w > 0 && (
          <motion.svg
            key="loop"
            aria-hidden
            className="pointer-events-none absolute z-10 overflow-visible mix-blend-multiply"
            style={{ left: -pad, top: -pad, width: w + pad * 2, height: h + pad * 2 }}
            viewBox={`0 0 ${w + pad * 2} ${h + pad * 2}`}
            exit={{ opacity: 0, transition: { duration: 0.15 } }}
          >
            <motion.path
              d={loopPath(w, h, pad, s)}
              fill="none"
              stroke={INK_COLOR[tone]}
              strokeWidth={strokeWidth}
              strokeLinecap="round"
              strokeLinejoin="round"
              initial={animate ? { pathLength: 0 } : false}
              animate={{ pathLength: 1 }}
              transition={DRAW(0.42, delay)}
            />
          </motion.svg>
        )}
      </AnimatePresence>
    </Tag>
  );
}

export interface MarkerUnderlineProps extends StrokeProps {
  children?: ReactNode;
  /** Two strokes (default false). */
  double?: boolean;
  show?: boolean;
  className?: string;
}

/** A quick marker underline under inline text (`de <MarkerUnderline>qui ?</MarkerUnderline>`). */
export function MarkerUnderline({ children, double = false, show = true, tone = 'red', strokeWidth = 3.2, animate = true, delay = 0, sound, seed, className }: MarkerUnderlineProps) {
  const [ref, { w, h }] = useElementSize<SVGSVGElement>();
  const s = useSeed(seed);
  useDrawSound(show && animate, sound, delay);
  return (
    <span className={cn(rel(className), 'inline-block', className)}>
      {children}
      <svg
        ref={ref}
        aria-hidden
        className="pointer-events-none absolute overflow-visible mix-blend-multiply"
        style={{ left: '-0.08em', right: '-0.08em', bottom: '-0.3em', height: double ? '0.5em' : '0.34em', width: 'calc(100% + 0.16em)' }}
        viewBox={w > 0 ? `0 0 ${w} ${h}` : undefined}
      >
        {show && w > 0 && (
          <motion.path
            d={underlinePath(w, h, s, double)}
            fill="none"
            stroke={INK_COLOR[tone]}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            initial={animate ? { pathLength: 0 } : false}
            animate={{ pathLength: 1 }}
            transition={DRAW(double ? 0.45 : 0.3, delay)}
          />
        )}
      </svg>
    </span>
  );
}

export interface MarkerArrowProps extends StrokeProps {
  /** Start point in % of the box (default [90, 10]). */
  from?: [number, number];
  /** Tip of the arrow in % of the box (default [12, 78]). */
  to?: [number, number];
  /** Curvature: a fraction of the length, negative bends the other way (default 0.25). */
  bend?: number;
  /** Arrow head length in px (default 13). */
  head?: number;
  /** Size and position of the box (e.g. `absolute left-40 top-14 h-20 w-28`). */
  className?: string;
  style?: CSSProperties;
}

/** A hand-drawn curved arrow across its box, from `from` to `to`. */
export function MarkerArrow({ from = [90, 10], to = [12, 78], bend = 0.25, head = 13, tone = 'red', strokeWidth = 3.4, animate = true, delay = 0, sound, className, style }: MarkerArrowProps) {
  const [ref, { w, h }] = useElementSize<SVGSVGElement>();
  useDrawSound(animate, sound, delay);
  const paths = w > 0 ? arrowPaths([(from[0] / 100) * w, (from[1] / 100) * h], [(to[0] / 100) * w, (to[1] / 100) * h], bend, head) : null;
  const common = { fill: 'none', stroke: INK_COLOR[tone], strokeWidth, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  return (
    <svg ref={ref} aria-hidden className={cn('pointer-events-none overflow-visible mix-blend-multiply', !/\b(absolute|fixed|relative)\b/.test(className ?? '') && 'absolute', className)} style={style} viewBox={w > 0 ? `0 0 ${w} ${h}` : undefined}>
      {paths && (
        <>
          <motion.path d={paths.shaft} {...common} initial={animate ? { pathLength: 0 } : false} animate={{ pathLength: 1 }} transition={DRAW(0.4, delay)} />
          <motion.path d={paths.head} {...common} initial={animate ? { pathLength: 0 } : false} animate={{ pathLength: 1 }} transition={DRAW(0.16, delay + 0.38)} />
        </>
      )}
    </svg>
  );
}

/** A marker check mark (sized by className, default 30px). */
export function MarkerCheck({ tone = 'red', strokeWidth = 4.5, animate = true, delay = 0, sound, className, style }: StrokeProps & { className?: string; style?: CSSProperties }) {
  useDrawSound(animate, sound, delay);
  return (
    <svg aria-hidden viewBox="0 0 30 30" className={cn('pointer-events-none size-[30px] overflow-visible', className)} style={style}>
      <motion.path
        d="M4 16 L12 24 L27 5"
        fill="none"
        stroke={INK_COLOR[tone]}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={animate ? { pathLength: 0 } : false}
        animate={{ pathLength: 1 }}
        transition={DRAW(0.3, delay)}
      />
    </svg>
  );
}

/** Two marker strokes crossing its children out (a wrong guess). */
export function MarkerCross({ children, show = true, pad = 4, tone = 'red', strokeWidth = 3.4, animate = true, delay = 0, sound, seed, className }: StrokeProps & { children?: ReactNode; show?: boolean; pad?: number; className?: string }) {
  const [ref, { w, h }] = useElementSize<HTMLSpanElement>();
  const s = useSeed(seed);
  useDrawSound(show && animate, sound, delay);
  return (
    <span ref={ref} className={cn(rel(className), 'inline-block', className)}>
      {children}
      {show && w > 0 && (
        <svg aria-hidden className="pointer-events-none absolute z-10 overflow-visible mix-blend-multiply" style={{ left: -pad, top: -pad, width: w + pad * 2, height: h + pad * 2 }} viewBox={`0 0 ${w + pad * 2} ${h + pad * 2}`}>
          <motion.path
            d={crossPath(w, h, pad, s)}
            fill="none"
            stroke={INK_COLOR[tone]}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            initial={animate ? { pathLength: 0 } : false}
            animate={{ pathLength: 1 }}
            transition={DRAW(0.4, delay)}
          />
        </svg>
      )}
    </span>
  );
}

export interface AnnotationProps {
  children: ReactNode;
  /** marker: red Permanent Marker (default); pen: blue Caveat ballpoint; brush: Caveat Brush. */
  font?: 'marker' | 'pen' | 'brush';
  /** Ink color (default red for marker, blue for pen / brush). */
  tone?: InkTone;
  /** Rotation in degrees. */
  rotate?: number;
  /** Font size in px (default 19 for marker, 22 for pen). */
  size?: number;
  /** Written left to right when it appears (default true). */
  animate?: boolean;
  delay?: number;
  as?: 'span' | 'p' | 'div';
  className?: string;
  style?: CSSProperties;
}

const MOTION_TAG = { span: motion.span, p: motion.p, div: motion.div } as const;

const FONT = { marker: 'var(--font-marker)', pen: 'var(--font-hand)', brush: 'var(--font-brush)' } as const;

/** A note scribbled in the margin ("ces lunettes !!", "← la bonne !"). */
export function Annotation({ children, font = 'marker', tone, rotate = 0, size, animate = true, delay = 0, as = 'span', className, style }: AnnotationProps) {
  const color = INK_COLOR[tone ?? (font === 'marker' ? 'red' : 'blue')];
  const MotionTag = MOTION_TAG[as];
  return (
    <MotionTag
      className={cn('inline-block leading-[1.02]', className)}
      style={{
        fontFamily: FONT[font],
        fontWeight: font === 'pen' ? 700 : 400,
        fontSize: size ?? (font === 'marker' ? 19 : 22),
        color,
        rotate,
        ...style,
      }}
      initial={animate ? { clipPath: 'inset(-20% 100% -20% -5%)' } : false}
      animate={{ clipPath: 'inset(-20% -5% -20% -5%)' }}
      transition={{ duration: 0.55, delay, ease: 'easeOut' }}
    >
      {children}
    </MotionTag>
  );
}

export interface HighlightProps {
  children: ReactNode;
  tone?: 'yellow' | 'pink' | 'mint' | 'blue';
  /** Swiped on when it appears (default true). */
  animate?: boolean;
  delay?: number;
  className?: string;
}

const HL: Record<NonNullable<HighlightProps['tone']>, string> = {
  yellow: 'var(--color-yellow)',
  pink: 'var(--color-pink)',
  mint: 'var(--color-mint)',
  blue: 'rgb(120 160 230 / 0.6)',
};

/** A highlighter swipe behind inline text ("Devine <Highlight>à qui c'est.</Highlight>"). */
export function Highlight({ children, tone = 'yellow', animate = true, delay = 0, className }: HighlightProps) {
  return (
    <span className={cn(rel(className), 'isolate inline-block', className)}>
      <motion.span
        aria-hidden
        className="absolute -z-10"
        style={{ left: '-0.18em', right: '-0.22em', top: '0.12em', bottom: '-0.1em', background: HL[tone], rotate: '-1.2deg', skewX: '-8deg', borderRadius: '3px 8px 4px 10px', originX: 0 }}
        initial={animate ? { scaleX: 0 } : false}
        animate={{ scaleX: 1 }}
        transition={{ duration: 0.35, delay, ease: [0.3, 0.7, 0.2, 1] }}
      />
      {children}
    </span>
  );
}
