import { motion } from 'motion/react';
import type { CSSProperties, ReactNode } from 'react';
import { cn } from '../lib/util';
import type { TornEdges } from './paper/geometry';
import { slapIn } from './paper/motion';
import { Tape, type TapeTone } from './Tape';
import { SURFACE, TornPaper, type PaperSurface } from './TornPaper';
import { rel } from './paper/cls';

export interface PaperProps {
  children?: ReactNode;
  /** Paper surface (default sheet). */
  surface?: PaperSurface;
  /** Torn edges (e.g. "b", "tb", "tblr"), or false for clean cut edges (default false). */
  torn?: TornEdges | false;
  /** Depth of the tear in px (default 3). */
  amp?: number;
  seed?: number | string;
  /** Masking tape on the top edge: true (cream) or a tape color. */
  tape?: boolean | TapeTone;
  /** Rotation in degrees. */
  tilt?: number;
  /** Paper shadow (default true). */
  lift?: boolean | 'sm' | 'lg';
  /** Slapped on the page like a sticker when it mounts (default false). A number delays it (s). */
  slap?: boolean | number;
  /** Classes of the paper itself (padding, layout). */
  className?: string;
  style?: CSSProperties;
  /** Classes of the outer wrapper (position, width, margins). */
  wrapperClassName?: string;
  wrapperStyle?: CSSProperties;
  role?: string;
  'aria-label'?: string;
}

const SHADOW = { sm: 'shadow-paper-sm', md: 'shadow-paper', lg: 'shadow-paper-lg' } as const;

/**
 * A piece of paper on the page: a surface (sheet, notebook, kraft, post-it…), optional torn
 * edges, masking tape on top and a tilt. The building block of every card in the zine.
 */
export function Paper({
  children,
  surface = 'sheet',
  torn = false,
  amp = 3,
  seed,
  tape,
  tilt = 0,
  lift = true,
  slap = false,
  className,
  style,
  wrapperClassName,
  wrapperStyle,
  role,
  'aria-label': ariaLabel,
}: PaperProps) {
  const motionProps = slap ? slapIn(tilt, typeof slap === 'number' ? slap : 0) : { initial: false as const, animate: { rotate: tilt } };
  const tapeTone: TapeTone | null = tape === true ? 'cream' : tape || null;
  return (
    <motion.div className={cn(rel(wrapperClassName), wrapperClassName)} style={{ rotate: tilt, ...wrapperStyle }} role={role} aria-label={ariaLabel} {...motionProps}>
      {torn ? (
        <TornPaper surface={surface} edges={torn} amp={amp} seed={seed} lift={lift} className={className} style={style}>
          {children}
        </TornPaper>
      ) : (
        <div className={cn('relative', SURFACE[surface], lift && SHADOW[lift === true ? 'md' : lift], className)} style={style}>
          {children}
        </div>
      )}
      {tapeTone && <Tape tone={tapeTone} width={56} height={19} rotate={tilt > 0 ? -3 : 3} className="-top-2.5 left-1/2 -translate-x-1/2" />}
    </motion.div>
  );
}

type SurfaceCardProps = Omit<PaperProps, 'surface'>;

/**
 * Lined notebook paper (blue lines, red margin at 22px), torn at the bottom by default. Without
 * padding classes the text starts right of the margin; with your own, keep `pl-8` or more.
 */
export function NotebookCard({ torn = 'b', className, ...rest }: SurfaceCardProps) {
  const padded = /(^|\s)!?p[xl]?-/.test(className ?? '');
  return <Paper surface="notebook" torn={torn} className={cn(!padded && 'py-4 pr-4 pl-9', className)} {...rest} />;
}

/** Kraft paper (brown, fibrous), torn at the bottom by default. */
export function KraftCard({ torn = 'b', ...rest }: SurfaceCardProps) {
  return <Paper surface="kraft" torn={torn} {...rest} />;
}

/** A post-it (yellow by default; pink, mint, sky or lilac), with a slightly torn bottom. */
export function PostIt({ color = 'yellow', torn = 'b', amp = 2.5, ...rest }: SurfaceCardProps & { color?: 'yellow' | 'pink' | 'mint' | 'sky' | 'lilac' }) {
  const surface: PaperSurface = color === 'yellow' ? 'postit' : color;
  return <Paper surface={surface} torn={torn} amp={amp} {...rest} />;
}
