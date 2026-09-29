import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { cn } from '../lib/util';

/**
 * Film grain tile: fractal noise turned into sparse white specks (alpha only), so it reads
 * as grain on the dark background without greying it out.
 */
const GRAIN = `url("data:image/svg+xml;utf8,${encodeURIComponent(
  `<svg xmlns='http://www.w3.org/2000/svg' width='180' height='180'><filter id='g'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 0 2.6 -1.25'/></filter><rect width='180' height='180' filter='url(#g)'/></svg>`,
)}")`;

/**
 * Decorative backdrop: the grape night (a darkroom) with two soft drifting color blobs and a
 * barely-there film grain. Fixed behind everything, ignored by assistive tech. No vignette and
 * no permanent light leak on purpose: the leak is an event (see <LightLeak />), not a filter.
 */
export function Background() {
  const reduce = useReducedMotion();
  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden" aria-hidden>
      <div className="absolute inset-0 bg-[radial-gradient(120%_80%_at_50%_0%,var(--color-grape-700)_0%,var(--color-grape-900)_55%,var(--color-grape-950)_100%)]" />
      <motion.div
        className="absolute -top-48 -left-40 size-[30rem] rounded-full bg-pink/[0.13] blur-3xl"
        animate={reduce ? undefined : { x: [0, 60, 0], y: [0, 40, 0] }}
        transition={{ duration: 18, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="absolute top-1/3 -right-40 size-[28rem] rounded-full bg-sky/[0.1] blur-3xl"
        animate={reduce ? undefined : { x: [0, -50, 0], y: [0, 60, 0] }}
        transition={{ duration: 22, repeat: Infinity, ease: 'easeInOut' }}
      />
      {/* Grain: an oversized tile that jumps around (steps, compositor-only transform). */}
      <div
        className="absolute -inset-[20%] animate-grain opacity-[0.07] will-change-transform"
        style={{ backgroundImage: GRAIN, backgroundSize: '180px 180px' }}
      />
    </div>
  );
}

/**
 * A light leak: warm orange and safelight red bleeding in from the edges of the screen. It is
 * an event, not a filter: turn it on for the darkroom moment (the reveal drum roll, a photo
 * "developing") and off again. Fixed and full screen by default; pass `className` to change
 * the layer (e.g. "absolute inset-0" inside a positioned card).
 */
export function LightLeak({ active, className }: { active: boolean; className?: string }) {
  const reduce = useReducedMotion();
  return (
    <AnimatePresence>
      {active && (
        <motion.div
          className={cn('pointer-events-none fixed inset-0 z-0 overflow-hidden mix-blend-screen', className)}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          aria-hidden
        >
          <motion.div
            className="absolute -top-1/4 -right-1/3 h-[80%] w-[90%] rounded-full bg-stamp/45 blur-3xl"
            animate={reduce ? undefined : { x: [0, -30, 10, 0], opacity: [0.7, 1, 0.8, 0.7] }}
            transition={{ duration: 3.2, repeat: Infinity, ease: 'easeInOut' }}
          />
          <motion.div
            className="absolute -bottom-1/4 -left-1/3 h-[70%] w-[80%] rounded-full bg-safelight/35 blur-3xl"
            animate={reduce ? undefined : { x: [0, 30, -10, 0], opacity: [0.8, 0.6, 1, 0.8] }}
            transition={{ duration: 4.1, repeat: Infinity, ease: 'easeInOut' }}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
