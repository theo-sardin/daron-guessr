import type { CSSProperties, ReactNode } from 'react';
import { cn } from '../lib/util';

export interface ViewfinderProps {
  children?: ReactNode;
  className?: string;
  /** @deprecated No-op. */
  color?: string;
  /** @deprecated No-op. */
  length?: number;
  /** @deprecated No-op. */
  thickness?: number;
  /** @deprecated No-op. */
  gap?: number;
  /** @deprecated No-op. */
  radius?: number;
  /** @deprecated No-op. */
  snap?: boolean | number;
  /** @deprecated No-op. */
  hunt?: boolean;
  /** @deprecated No-op. */
  shadow?: boolean;
  /** Tag of the wrapper (default div). */
  as?: 'div' | 'span';
  style?: CSSProperties;
}

/**
 * @deprecated The camera viewfinder brackets belonged to the "Photo lab" design. In the
 * scrapbook it is a plain wrapper (kept so old screens compile): frame things with <Tape>,
 * <MarkerCircle> or a <Paper> instead.
 */
export function Viewfinder({ children, className, as = 'div', style }: ViewfinderProps) {
  const Tag = as;
  return (
    <Tag className={cn(!/\b(absolute|fixed|sticky)\b/.test(className ?? '') && 'relative', as === 'span' && 'inline-block', className)} style={style}>
      {children}
    </Tag>
  );
}
