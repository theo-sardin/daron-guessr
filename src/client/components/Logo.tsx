import { motion, useReducedMotion } from 'motion/react';
import { cn } from '../lib/util';
import { Stamp } from './Stamp';
import { Viewfinder } from './Viewfinder';

const SIZES = {
  sm: { text: 'text-[1.35rem]', stroke: 'text-outline-sm', bracket: { length: 8, thickness: 2.5, gap: 5 } },
  md: { text: 'text-[3.4rem]', stroke: 'text-outline', bracket: { length: 16, thickness: 3.5, gap: 12 } },
  lg: { text: 'text-[4.75rem] sm:text-[5.75rem]', stroke: 'text-outline', bracket: { length: 22, thickness: 4.5, gap: 14 } },
} as const;

/** 4-point glint of the camera flash. */
function FlashGlint({ className, delay }: { className?: string; delay: number }) {
  const reduce = useReducedMotion();
  return (
    <motion.svg
      viewBox="0 0 40 40"
      className={cn('pointer-events-none absolute overflow-visible', className)}
      initial={reduce ? false : { scale: 0, rotate: -45, opacity: 0 }}
      animate={
        reduce
          ? undefined
          : { scale: [0, 1.5, 1, 1, 1.25, 1], rotate: [-45, 0, 0, 0, 45, 45], opacity: [0, 1, 1, 1, 1, 1] }
      }
      transition={reduce ? undefined : { duration: 4.4, times: [0, 0.07, 0.12, 0.86, 0.93, 1], delay, repeat: Infinity, repeatDelay: 1.5 }}
      aria-hidden
    >
      <path
        d="M20 1.5Q23.6 16.4 38.5 20Q23.6 23.6 20 38.5Q16.4 23.6 1.5 20Q16.4 16.4 20 1.5z"
        fill="#fff"
        stroke="var(--color-ink)"
        strokeWidth="2.6"
        strokeLinejoin="round"
      />
    </motion.svg>
  );
}

/**
 * "DARON / GUESSR" wordmark in a camera viewfinder: the brackets snap into focus, the
 * type sharpens, the flash fires, and an orange date stamp sits in the corner.
 */
export function Logo({ size = 'lg', className }: { size?: 'sm' | 'md' | 'lg'; className?: string }) {
  const reduce = useReducedMotion();
  const s = SIZES[size];

  if (size === 'sm') {
    return (
      <Viewfinder as="span" color="var(--color-cream)" {...s.bracket} radius={1.5} className={cn('select-none', className)}>
        <span aria-label="Daron Guessr" className={cn('block font-display leading-none whitespace-nowrap', s.text)}>
          <span className="text-sun">DARON</span> <span className="text-pink">GUESSR</span>
        </span>
      </Viewfinder>
    );
  }

  return (
    <Viewfinder
      color="var(--color-cream)"
      {...s.bracket}
      radius={3}
      snap={0.05}
      shadow
      className={cn('inline-block select-none', className)}
    >
      <motion.div
        role="img"
        aria-label="Daron Guessr"
        className={cn('flex flex-col items-center font-display leading-[0.8] tracking-[-0.025em] [font-stretch:78%]', s.text)}
        style={{ filter: 'drop-shadow(0 5px 0 var(--color-ink))' }}
        initial={reduce ? false : { filter: 'blur(10px) drop-shadow(0 5px 0 var(--color-ink))', scale: 1.08, opacity: 0.4 }}
        animate={{ filter: 'blur(0px) drop-shadow(0 5px 0 var(--color-ink))', scale: 1, opacity: 1 }}
        transition={{ duration: 0.55, ease: [0.2, 0.8, 0.2, 1], delay: 0.15 }}
      >
        <span className={cn('text-sun', s.stroke)} aria-hidden>
          DARON
        </span>
        <span className={cn('text-pink', s.stroke)} aria-hidden>
          GUESSR
        </span>
      </motion.div>
      <FlashGlint className={size === 'lg' ? '-top-6 -right-7 size-11 sm:size-12' : '-top-5 -right-6 size-9'} delay={0.6} />
      {/* The flash itself: a white bloom over the frame, once. */}
      {!reduce && (
        <motion.span
          className="pointer-events-none absolute -inset-6 rounded-[2rem] bg-white mix-blend-soft-light"
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 0.9, 0] }}
          transition={{ duration: 0.5, times: [0, 0.15, 1], delay: 0.62 }}
          aria-hidden
        />
      )}
      <span className="mt-1.5 flex justify-end pr-0.5" aria-hidden>
        <Stamp size={size === 'lg' ? 'sm' : 'xs'}>{"'98 12 24"}</Stamp>
      </span>
    </Viewfinder>
  );
}
