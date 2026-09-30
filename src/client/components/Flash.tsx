import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { sfx } from '../lib/sfx';
import { cn, prefersReducedMotion } from '../lib/util';

/*
 * The flash: the game's "moment" effect (upload done, owner revealed, podium), a burst of warm
 * paper white.
 * - flashScreen(): a quick full-screen white burst (needs <ScreenFlash /> mounted once, in App).
 * - <Flash trigger={x} />: the same burst clipped to its positioned parent (a print, a card),
 *   fired every time `trigger` changes.
 * Both are skipped when the user prefers reduced motion (the sound still plays).
 */

let burst = 0;
const listeners = new Set<() => void>();

export function flashScreen({ sound = true }: { sound?: boolean } = {}) {
  if (sound) sfx.play('shutter');
  if (prefersReducedMotion()) return;
  burst += 1;
  listeners.forEach((l) => l());
}

/** Mount once near the root. */
export function ScreenFlash() {
  const n = useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => burst,
  );
  return <FlashBurst n={n} className="fixed inset-0 z-[95]" peak={0.6} />;
}

function FlashBurst({ n, className, peak }: { n: number; className?: string; peak: number }) {
  return (
    <AnimatePresence>
      {n > 0 && (
        <motion.div
          key={n}
          className={cn('pointer-events-none bg-[#fffbef]', className)}
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, peak, 0] }}
          transition={{ duration: 0.45, times: [0, 0.12, 1], ease: 'easeOut' }}
          aria-hidden
        />
      )}
    </AnimatePresence>
  );
}

/** A flash over the positioned parent, fired when `trigger` changes (not on mount unless `onMount`). */
export function Flash({ trigger, onMount, sound, className }: { trigger: unknown; onMount?: boolean; sound?: boolean; className?: string }) {
  const [n, setN] = useState(0);
  // Compare with the last value seen (not a "first run" flag) so StrictMode's double effects don't fire twice.
  const prev = useRef<unknown>(onMount ? Symbol('mount') : trigger);
  useEffect(() => {
    if (Object.is(prev.current, trigger)) return;
    prev.current = trigger;
    if (sound) sfx.play('shutter');
    if (!prefersReducedMotion()) setN((x) => x + 1);
  }, [trigger, sound]);
  return <FlashBurst n={n} className={cn('absolute inset-0 z-20 rounded-[inherit]', className)} peak={0.9} />;
}
