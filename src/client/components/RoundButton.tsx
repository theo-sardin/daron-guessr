import { motion, type HTMLMotionProps } from 'motion/react';
import type { ReactNode } from 'react';
import { sfx } from '../lib/sfx';
import { cn } from '../lib/util';

export interface RoundButtonProps extends Omit<HTMLMotionProps<'button'>, 'children'> {
  /** Accessible name (also the tooltip). */
  label: string;
  children: ReactNode;
  /** Outline and icon color: ink (default), red (leave, destructive) or blue. */
  tone?: 'ink' | 'red' | 'blue';
  /** Filled with the tone (a pressed / active state). */
  filled?: boolean;
  /** Diameter in px (default 46; never under 44). */
  size?: number;
  /** Rotation in degrees (default a hair crooked). */
  tilt?: number;
  /** Play the click sound (default true). */
  sound?: boolean;
}

const COLOR = { ink: 'var(--color-ink)', red: 'var(--color-red)', blue: 'var(--color-blue)' } as const;

/** A round outlined paper button for an icon (sound, leave, close…). */
export function RoundButton({ label, children, tone = 'ink', filled = false, size = 46, tilt = 0, sound = true, className, onClick, type = 'button', style, ...rest }: RoundButtonProps) {
  const c = COLOR[tone];
  const d = Math.max(44, size);
  return (
    <motion.button
      type={type}
      aria-label={label}
      title={label}
      whileHover={{ y: -1.5, rotate: tilt * 0.4 }}
      whileTap={{ scale: 0.9 }}
      onClick={(e) => {
        if (sound) sfx.play('click');
        onClick?.(e);
      }}
      className={cn('flex shrink-0 items-center justify-center rounded-full transition-colors', className)}
      style={{
        width: d,
        height: d,
        rotate: tilt,
        color: filled ? '#fff6e0' : c,
        backgroundColor: filled ? c : 'var(--color-sheet)',
        boxShadow: `0 1px 1px rgb(40 25 10 / 0.2), 0 4px 10px -3px rgb(40 25 10 / 0.35), inset 0 0 0 2px ${c}`,
        ...style,
      }}
      {...rest}
    >
      {children}
    </motion.button>
  );
}
