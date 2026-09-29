import { motion, type HTMLMotionProps } from 'motion/react';
import { forwardRef, type ReactNode } from 'react';
import { sfx } from '../lib/sfx';
import { cn } from '../lib/util';
import { Spinner } from './Spinner';

export type ButtonVariant = 'primary' | 'secondary' | 'sun' | 'mint' | 'sky' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg' | 'xl';

const VARIANTS: Record<ButtonVariant, string> = {
  primary: 'bg-pink text-white border-ink',
  secondary: 'bg-cream text-ink border-ink',
  sun: 'bg-sun text-ink border-ink',
  mint: 'bg-mint text-ink border-ink',
  sky: 'bg-sky text-ink border-ink',
  danger: 'bg-danger text-white border-ink',
  ghost: 'bg-white/10 text-cream border-white/25 shadow-none! hover:bg-white/15',
};

const SIZES: Record<ButtonSize, string> = {
  sm: 'h-9 px-3 text-sm gap-1.5 rounded-xl border-2 shadow-pop-sm',
  md: 'h-12 px-5 text-base gap-2 rounded-2xl border-3 shadow-pop',
  lg: 'h-14 px-6 text-lg gap-2 rounded-2xl border-3 shadow-pop',
  xl: 'h-16 px-8 text-2xl gap-3 rounded-3xl border-4 shadow-pop-lg',
};

export interface ButtonProps extends Omit<HTMLMotionProps<'button'>, 'children'> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  icon?: ReactNode;
  block?: boolean;
  /** Play the click sound (default true). */
  sound?: boolean;
  children?: ReactNode;
}

/**
 * Chunky "sticker" button that sinks into its shadow when pressed.
 */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'primary', size = 'md', loading, icon, block, sound = true, className, children, disabled, onClick, type = 'button', ...rest },
  ref,
) {
  const isDisabled = disabled || loading;
  return (
    <motion.button
      ref={ref}
      type={type}
      disabled={isDisabled}
      whileHover={isDisabled ? undefined : { y: -2 }}
      whileTap={isDisabled ? undefined : { y: 4, boxShadow: '0 1px 0 0 var(--color-ink)' }}
      transition={{ type: 'spring', stiffness: 600, damping: 30 }}
      onClick={(e) => {
        if (sound) sfx.play('click');
        onClick?.(e);
      }}
      className={cn(
        'relative inline-flex select-none items-center justify-center font-display tracking-wide whitespace-nowrap',
        'transition-[background-color,opacity] duration-150',
        VARIANTS[variant],
        SIZES[size],
        block && 'w-full',
        isDisabled && 'opacity-50 saturate-50',
        className,
      )}
      {...rest}
    >
      {loading ? <Spinner className="size-5" /> : icon}
      {children && <span className={cn(loading && 'opacity-80')}>{children}</span>}
    </motion.button>
  );
});
