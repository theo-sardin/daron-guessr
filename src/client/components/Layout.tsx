import { motion, type HTMLMotionProps } from 'motion/react';
import type { ReactNode } from 'react';
import { cn } from '../lib/util';
import { PaperTexture } from './Background';
import { CutoutText, type CutoutSize } from './CutoutText';

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
        // Below the TopBar (64px + the notch, safe-area-inset-top).
        'mx-auto w-full px-4 pt-[calc(max(0.5rem,env(safe-area-inset-top))_+_4.75rem)]',
        // Clears the BottomBar and the floating reaction button.
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

/** Sticky action area at the bottom of the screen (primary buttons, host controls), on the page's own paper. */
export function BottomBar({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-40 pt-8">
      <PaperTexture className="absolute inset-0 [mask-image:linear-gradient(to_top,black_calc(100%-2.25rem),transparent)]" />
      {/* On phones the right side is kept free for the floating reaction button. */}
      <div className={cn('safe-bottom pointer-events-auto relative mx-auto flex w-full max-w-xl items-center gap-4 px-4 pr-[5.25rem] md:pr-4', className)}>
        {children}
      </div>
    </div>
  );
}

/**
 * Big title at the top of screens: bold Archivo slapped on the page, or ransom-note letters
 * with `cutout` (strings only). `sub` is a line of soft ink under it.
 */
export function ScreenTitle({
  children,
  className,
  sub,
  cutout,
  cutoutSize = 'md',
}: {
  children: ReactNode;
  className?: string;
  sub?: ReactNode;
  /** Ransom-note letters (only when `children` is a string). */
  cutout?: boolean;
  cutoutSize?: CutoutSize | number;
}) {
  return (
    <div className={cn('mb-5 text-center', className)}>
      {cutout && typeof children === 'string' ? (
        <CutoutText as="h1" text={children} size={cutoutSize} animate />
      ) : (
        <motion.h1
          className="font-display text-[2.1rem] leading-[1.02] text-ink sm:text-5xl"
          initial={{ scale: 1.25, opacity: 0, rotate: -4 }}
          animate={{ scale: 1, opacity: 1, rotate: -1 }}
          transition={{ type: 'spring', stiffness: 460, damping: 20 }}
        >
          {children}
        </motion.h1>
      )}
      {sub && <p className="mt-2 font-semibold text-ink-soft">{sub}</p>}
    </div>
  );
}
