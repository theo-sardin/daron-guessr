import { motion } from 'motion/react';
import type { CSSProperties, ReactNode } from 'react';
import { cn } from '../lib/util';

export interface ViewfinderProps {
  children?: ReactNode;
  className?: string;
  /** Bracket color (any CSS color, default currentColor). */
  color?: string;
  /** Length of each bracket arm in px (default 18). */
  length?: number;
  /** Stroke thickness in px (default 3). */
  thickness?: number;
  /** Distance between the brackets and the content box in px; negative draws inside it (default 8). */
  gap?: number;
  /** Corner rounding of each bracket in px (default 3). */
  radius?: number;
  /** Brackets start wide and snap onto the content on mount, like autofocus (default false). */
  snap?: boolean | number;
  /** Brackets keep "hunting for focus" (a slow in/out breathing). */
  hunt?: boolean;
  /** An ink shadow under the brackets so they read on busy photos (default false). */
  shadow?: boolean;
  /** Tag of the wrapper (default div). */
  as?: 'div' | 'span';
  style?: CSSProperties;
}

const CORNERS = [
  { key: 'tl', pos: { top: 0, left: 0 }, sides: ['Top', 'Left'], dir: [-1, -1] },
  { key: 'tr', pos: { top: 0, right: 0 }, sides: ['Top', 'Right'], dir: [1, -1] },
  { key: 'bl', pos: { bottom: 0, left: 0 }, sides: ['Bottom', 'Left'], dir: [-1, 1] },
  { key: 'br', pos: { bottom: 0, right: 0 }, sides: ['Bottom', 'Right'], dir: [1, 1] },
] as const;

/**
 * Four L-shaped corner marks framing its children: the camera viewfinder, the game's
 * signature motif for "look at this". The brackets are decorative (aria-hidden).
 */
export function Viewfinder({
  children,
  className,
  color = 'currentColor',
  length = 18,
  thickness = 3,
  gap = 8,
  radius = 3,
  snap = false,
  hunt = false,
  shadow = false,
  as = 'div',
  style,
}: ViewfinderProps) {
  const Tag = as === 'span' ? motion.span : motion.div;
  const spread = Math.max(10, length * 0.7);
  const delay = typeof snap === 'number' ? snap : 0;
  return (
    <Tag
      className={cn(!/\b(absolute|fixed|sticky)\b/.test(className ?? '') && 'relative', as === 'span' && 'inline-block', className)}
      style={style}
    >
      {children}
      <span className="pointer-events-none absolute" style={{ inset: -gap }} aria-hidden>
        {CORNERS.map((c) => {
          const [dx, dy] = c.dir;
          const corner = `border${c.sides[0]}${c.sides[1]}Radius` as const;
          return (
            <motion.span
              key={c.key}
              className="absolute block"
              style={{ ...c.pos, width: length, height: length }}
              initial={snap ? { x: dx * spread, y: dy * spread, opacity: 0 } : false}
              animate={{ x: 0, y: 0, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 520, damping: 17, mass: 0.7, delay }}
            >
              <motion.span
                className="absolute inset-0 block"
                style={{
                  [`border${c.sides[0]}`]: `${thickness}px solid ${color}`,
                  [`border${c.sides[1]}`]: `${thickness}px solid ${color}`,
                  [corner]: radius,
                  filter: shadow ? 'drop-shadow(0 2px 0 rgb(27 16 54 / 0.55))' : undefined,
                }}
                animate={hunt ? { x: [0, dx * 4, 0, dx * 2, 0], y: [0, dy * 4, 0, dy * 2, 0] } : undefined}
                transition={hunt ? { duration: 2.8, repeat: Infinity, ease: 'easeInOut', delay: delay + (snap ? 0.6 : 0) } : undefined}
              />
            </motion.span>
          );
        })}
      </span>
    </Tag>
  );
}
