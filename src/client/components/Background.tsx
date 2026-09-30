import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import type { CSSProperties } from 'react';
import { cn } from '../lib/util';

/**
 * The paper itself: cream stock, big soft blotches and a fine grain (both multiplied, so the
 * paper only ever gets darker, like real pulp). Tiles start at the viewport's top left, so a
 * fixed bar that paints its own <PaperTexture> lines up seamlessly with the page behind it.
 */
export function PaperTexture({ className, style }: { className?: string; style?: CSSProperties }) {
  return (
    <div className={cn('pointer-events-none overflow-hidden bg-paper', !/\b(absolute|fixed)\b/.test(className ?? '') && 'relative', className)} style={style} aria-hidden>
      <div className="absolute inset-0 opacity-[0.16] mix-blend-multiply" style={{ backgroundImage: 'var(--blotch)', backgroundSize: '600px 600px', backgroundAttachment: 'fixed' }} />
      <div className="absolute inset-0 opacity-[0.17] mix-blend-multiply" style={{ backgroundImage: 'var(--noise)', backgroundSize: '240px 240px', backgroundAttachment: 'fixed' }} />
    </div>
  );
}

/** Decorative backdrop of every screen: the paper, fixed behind everything, ignored by assistive tech. */
export function Background() {
  return <PaperTexture className="fixed inset-0 -z-10" />;
}

/**
 * A warm stain of sunlight on the page (an old print left by the window): orange and red
 * blotches multiplied onto the paper. It is an event, not a filter: turn it on for a moment
 * (the reveal drum roll) and off again. By default it is fixed, full screen and behind the
 * content; `className` replaces that placement (e.g. "absolute inset-0 z-10" inside a print).
 */
export function LightLeak({ active, className }: { active: boolean; className?: string }) {
  const reduce = useReducedMotion();
  return (
    <AnimatePresence>
      {active && (
        <motion.div
          className={cn('pointer-events-none overflow-hidden mix-blend-multiply', className ?? 'fixed inset-0 -z-[5]')}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          aria-hidden
        >
          <motion.div
            className="absolute -top-1/4 -right-1/3 h-[80%] w-[90%] rounded-full bg-[#f7a866]/45 blur-3xl"
            animate={reduce ? undefined : { x: [0, -30, 10, 0], opacity: [0.7, 1, 0.8, 0.7] }}
            transition={{ duration: 3.2, repeat: Infinity, ease: 'easeInOut' }}
          />
          <motion.div
            className="absolute -bottom-1/4 -left-1/3 h-[70%] w-[80%] rounded-full bg-red/25 blur-3xl"
            animate={reduce ? undefined : { x: [0, 30, -10, 0], opacity: [0.8, 0.6, 1, 0.8] }}
            transition={{ duration: 4.1, repeat: Infinity, ease: 'easeInOut' }}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
