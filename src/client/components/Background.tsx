import { motion, useReducedMotion } from 'motion/react';

/**
 * Film grain tile: fractal noise turned into sparse white specks (alpha only), so it reads
 * as grain on the dark background without greying it out.
 */
const GRAIN = `url("data:image/svg+xml;utf8,${encodeURIComponent(
  `<svg xmlns='http://www.w3.org/2000/svg' width='180' height='180'><filter id='g'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 0 2.6 -1.25'/></filter><rect width='180' height='180' filter='url(#g)'/></svg>`,
)}")`;

/**
 * Decorative backdrop: a darkroom night with soft drifting color blobs, a warm light leak,
 * a vignette and animated film grain. Fixed behind everything and ignored by assistive tech.
 */
export function Background() {
  const reduce = useReducedMotion();
  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden" aria-hidden>
      <motion.div
        className="absolute -top-32 -left-24 size-[28rem] rounded-full bg-pink/22 blur-3xl"
        animate={reduce ? undefined : { x: [0, 60, 0], y: [0, 40, 0] }}
        transition={{ duration: 18, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="absolute top-1/3 -right-32 size-[26rem] rounded-full bg-sky/18 blur-3xl"
        animate={reduce ? undefined : { x: [0, -50, 0], y: [0, 60, 0] }}
        transition={{ duration: 22, repeat: Infinity, ease: 'easeInOut' }}
      />
      {/* Light leak: the warm orange of the date stamp bleeding in from a corner. */}
      <motion.div
        className="absolute -bottom-40 left-1/4 size-[30rem] rounded-full bg-stamp/14 blur-3xl"
        animate={reduce ? undefined : { x: [0, 40, 0], y: [0, -40, 0], opacity: [0.8, 1, 0.8] }}
        transition={{ duration: 20, repeat: Infinity, ease: 'easeInOut' }}
      />
      {/* Vignette, like the dark corners of an old print. */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_40%,transparent_45%,rgb(8_3_20_/_0.55)_100%)]" />
      {/* Grain: an oversized tile that jumps around (steps, compositor-only transform). */}
      <div
        className="absolute -inset-[20%] animate-grain opacity-[0.16] will-change-transform"
        style={{ backgroundImage: GRAIN, backgroundSize: '180px 180px' }}
      />
    </div>
  );
}
