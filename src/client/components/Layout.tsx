import { motion, type HTMLMotionProps } from 'motion/react';
import type { ReactNode } from 'react';
import { cn } from '../lib/util';

const WIDTHS = { sm: 'max-w-md', md: 'max-w-xl', lg: 'max-w-3xl', xl: 'max-w-5xl' } as const;

/**
 * Standard page frame below the TopBar. Leaves room at the bottom for a BottomBar and the
 * reaction button. Screens animate in/out through the phase transition in RoomScreen.
 */
export function ScreenShell({
  children,
  width = 'md',
  bottomBar = true,
  className,
  ...rest
}: {
  children: ReactNode;
  width?: keyof typeof WIDTHS;
  /** Reserve room for a BottomBar (default true). */
  bottomBar?: boolean;
  className?: string;
} & Omit<HTMLMotionProps<'main'>, 'children'>) {
  return (
    <motion.main
      className={cn(
        // Below the TopBar, which grows with the notch (safe-area-inset-top).
        'mx-auto w-full px-4 pt-[calc(max(0.5rem,env(safe-area-inset-top))_+_4.5rem)]',
        // Clears the BottomBar and the floating reaction button (bottom 96px + 56px).
        bottomBar ? 'pb-44' : 'pb-12',
        WIDTHS[width],
        className,
      )}
      {...rest}
    >
      {children}
    </motion.main>
  );
}

/** Sticky action area at the bottom of the screen (primary buttons, host controls). */
export function BottomBar({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-40 bg-gradient-to-t from-grape-950 via-grape-950/85 to-transparent pt-10">
      <div className={cn('safe-bottom pointer-events-auto mx-auto flex w-full max-w-xl items-center gap-3 px-4', className)}>
        {children}
      </div>
    </div>
  );
}

/** Big outlined title used at the top of screens. */
export function ScreenTitle({ children, className, sub }: { children: ReactNode; className?: string; sub?: ReactNode }) {
  return (
    <div className={cn('mb-5 text-center', className)}>
      <motion.h1
        className="text-outline font-display text-4xl leading-tight text-cream sm:text-5xl"
        initial={{ scale: 0.8, opacity: 0, rotate: -3 }}
        animate={{ scale: 1, opacity: 1, rotate: 0 }}
        transition={{ type: 'spring', stiffness: 380, damping: 18 }}
      >
        {children}
      </motion.h1>
      {sub && <p className="mt-1 font-semibold text-grape-200">{sub}</p>}
    </div>
  );
}
