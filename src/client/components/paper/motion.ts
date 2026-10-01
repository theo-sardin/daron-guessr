import type { TargetAndTransition, Transition } from 'motion/react';

/*
 * Shared motion of the scrapbook: things get slapped on like stickers (a quick scale / rotate
 * settle), stamps thump down, paper slides in. MotionConfig reducedMotion="user" (in App) turns
 * the transforms off for people who prefer reduced motion.
 */

export const SLAP_SPRING: Transition = { type: 'spring', stiffness: 520, damping: 22, mass: 0.8 };
export const THUMP_SPRING: Transition = { type: 'spring', stiffness: 700, damping: 26, mass: 1.1 };

/** Motion props for a sticker slapped on the page at `tilt` degrees. */
export function slapIn(tilt = 0, delay = 0): { initial: TargetAndTransition; animate: TargetAndTransition; transition: Transition } {
  return {
    initial: { opacity: 0, scale: 1.35, rotate: tilt + (tilt >= 0 ? 9 : -9) },
    animate: { opacity: 1, scale: 1, rotate: tilt },
    transition: { ...SLAP_SPRING, delay, opacity: { duration: 0.12, delay } },
  };
}

/** Motion props for a sheet of paper sliding in from below (lists, cards, sheets). */
export function slideIn(tilt = 0, delay = 0, from = 26): { initial: TargetAndTransition; animate: TargetAndTransition; transition: Transition } {
  return {
    initial: { opacity: 0, y: from, rotate: tilt - 3 },
    animate: { opacity: 1, y: 0, rotate: tilt },
    transition: { type: 'spring', stiffness: 380, damping: 28, delay },
  };
}
