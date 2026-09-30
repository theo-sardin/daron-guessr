import type { CSSProperties, ReactNode } from 'react';
import { cn } from '../lib/util';
import type { TornEdges } from './paper/geometry';
import { useTornClip } from './paper/hooks';

/** The paper surfaces of the zine (classes from index.css). */
export type PaperSurface =
  | 'sheet'
  | 'grain'
  | 'notebook'
  | 'grid'
  | 'kraft'
  | 'postit'
  | 'pink'
  | 'mint'
  | 'sky'
  | 'lilac'
  | 'ink'
  | 'red'
  | 'halftone-blue'
  | 'halftone-yellow'
  | 'halftone-pink'
  | 'halftone-red'
  | 'halftone-mint'
  | 'halftone-ink';

export const SURFACE: Record<PaperSurface, string> = {
  sheet: 'paper-sheet',
  grain: 'paper-sheet-grain',
  notebook: 'paper-notebook',
  grid: 'paper-grid',
  kraft: 'paper-kraft',
  postit: 'paper-postit',
  pink: 'paper-pink',
  mint: 'paper-mint',
  sky: 'paper-sky',
  lilac: 'paper-lilac',
  ink: 'paper-ink',
  red: 'paper-red',
  'halftone-blue': 'halftone-blue',
  'halftone-yellow': 'halftone-yellow',
  'halftone-pink': 'halftone-pink',
  'halftone-red': 'halftone-red',
  'halftone-mint': 'halftone-mint',
  'halftone-ink': 'halftone-ink',
};

/** Text color of each surface (the fibrous edge splits the paper in two layers: the text sits on the outer one). */
const SURFACE_TEXT: Partial<Record<PaperSurface, string>> = {
  ink: 'text-[#fff6e0]',
  red: 'text-white',
  'halftone-blue': 'text-white',
  'halftone-red': 'text-white',
  'halftone-ink': 'text-white',
};

export interface TornPaperProps {
  children?: ReactNode;
  /** Paper surface (default sheet). */
  surface?: PaperSurface;
  /** Torn edges: any of t, r, b, l (default "tb"). */
  edges?: TornEdges;
  /** Depth of the tear in px (default 3). */
  amp?: number;
  /** Distance between two points of the tear in px (default 6). */
  step?: number;
  /** Seed of the tear (default: per instance). */
  seed?: number | string;
  /**
   * The white fibrous core that shows along a torn edge (default true). A color replaces the
   * default off-white (#f7f1e4).
   */
  fiber?: boolean | string;
  /** Soft paper shadow (default true). */
  lift?: boolean | 'sm' | 'lg';
  /** Classes of the paper itself (padding, height, flex…). */
  className?: string;
  style?: CSSProperties;
  /** Classes of the outer wrapper (position, width, rotation, margins). */
  wrapperClassName?: string;
  wrapperStyle?: CSSProperties;
  /** Rotation in degrees (on the wrapper). */
  tilt?: number;
  as?: 'div' | 'span';
}

/**
 * A piece of paper with torn edges: <TornPaper surface="kraft" edges="b" className="p-3">…</TornPaper>.
 * The tear is measured from the rendered size (ResizeObserver) so it never stretches.
 */
export function TornPaper({
  children,
  surface = 'sheet',
  edges = 'tb',
  amp = 3,
  step = 6,
  seed,
  fiber = true,
  lift = true,
  className,
  style,
  wrapperClassName,
  wrapperStyle,
  tilt,
  as = 'div',
}: TornPaperProps) {
  const [ref, clip] = useTornClip<HTMLDivElement>({ edges, amp, step, seed });
  const Tag = as;
  const fiberColor = fiber === true ? '#f7f1e4' : fiber || null;
  const liftClass = lift === 'sm' ? 'lift-sm' : lift === 'lg' ? 'lift-lg' : lift ? 'lift' : null;
  return (
    <Tag
      className={cn(as === 'span' ? 'inline-block' : 'block', liftClass, wrapperClassName)}
      style={tilt ? { rotate: `${tilt}deg`, ...wrapperStyle } : wrapperStyle}
    >
      <Tag
        ref={ref as never}
        className={cn('relative isolate block', fiberColor ? (SURFACE_TEXT[surface] ?? 'text-ink') : SURFACE[surface], className)}
        style={{ clipPath: clip?.outer, backgroundColor: fiberColor ?? undefined, ...style }}
      >
        {fiberColor && (
          <span aria-hidden className={cn('pointer-events-none absolute inset-0 -z-10', SURFACE[surface])} style={{ clipPath: clip?.inner }} />
        )}
        {children}
      </Tag>
    </Tag>
  );
}

export interface PaperStripProps {
  /** Halftone color (default blue). */
  tone?: 'blue' | 'yellow' | 'pink' | 'red' | 'mint' | 'ink' | 'kraft';
  /** Rotation in degrees. */
  tilt?: number;
  seed?: number | string;
  /** Position and size of the strip (e.g. `absolute -inset-x-8 top-24 h-32`). */
  className?: string;
  style?: CSSProperties;
}

/**
 * A torn halftone strip glued behind photos (blue, yellow…): a decoration, positioned by
 * `className`. Put it first in a `relative` container so the photo lands on top.
 */
export function PaperStrip({ tone = 'blue', tilt = -4, seed, className, style }: PaperStripProps) {
  const surface: PaperSurface = tone === 'kraft' ? 'kraft' : `halftone-${tone}`;
  return (
    <div aria-hidden className={cn('pointer-events-none', !/\b(absolute|fixed|relative)\b/.test(className ?? '') && 'absolute', className)} style={{ rotate: `${tilt}deg`, ...style }}>
      <TornPaper surface={surface} edges="tblr" amp={5} step={7} seed={seed} className="size-full" wrapperClassName="size-full" />
    </div>
  );
}
