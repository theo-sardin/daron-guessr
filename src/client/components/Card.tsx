import { motion, type HTMLMotionProps } from 'motion/react';
import type { ReactNode } from 'react';
import { cn } from '../lib/util';

export type CardTone = 'cream' | 'white' | 'pink' | 'sun' | 'mint' | 'sky' | 'lilac' | 'glass' | 'notebook' | 'kraft' | 'postit' | 'grid' | 'ink';

export interface CardProps extends Omit<HTMLMotionProps<'div'>, 'children'> {
  children?: ReactNode;
  /**
   * The paper: cream / white (a sheet from the pad), notebook, grid, kraft, postit (= sun),
   * pink, mint, sky, lilac, ink; glass is a translucent sheet (over photos).
   */
  tone?: CardTone;
  padded?: boolean;
}

const TONES: Record<CardTone, string> = {
  cream: 'paper-sheet-grain',
  white: 'paper-sheet',
  notebook: 'paper-notebook',
  grid: 'paper-grid',
  kraft: 'paper-kraft',
  postit: 'paper-postit',
  sun: 'paper-postit',
  pink: 'paper-pink',
  mint: 'paper-mint',
  sky: 'paper-sky',
  lilac: 'paper-lilac',
  ink: 'paper-ink',
  glass: 'bg-sheet/75 text-ink backdrop-blur-md',
};

/**
 * A rectangular sheet of paper lifted off the page (soft warm shadow, no outline). For torn
 * edges, tape or a tilt use <Paper> / <NotebookCard> / <KraftCard> / <PostIt>.
 */
export function Card({ children, tone = 'cream', padded = true, className, ...rest }: CardProps) {
  return (
    <motion.div
      className={cn(
        'rounded-[3px] shadow-paper',
        TONES[tone],
        padded && 'p-5',
        // Notebook: text 13px clear of the red margin, 24px lines with the baselines on the rules.
        tone === 'notebook' && 'pl-[calc(var(--margin,22px)+13px)] leading-6',
        tone === 'notebook' && padded && '[--line-y:14px]',
        className,
      )}
      {...rest}
    >
      {children}
    </motion.div>
  );
}
