import { motion, useReducedMotion } from 'motion/react';
import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { cn } from '../lib/util';
import { Stamp } from './Stamp';
import { Viewfinder } from './Viewfinder';

const SIZES = {
  sm: { text: 'text-[1.35rem]', stroke: 'text-outline-sm', bracket: { length: 8, thickness: 2.5, gap: 5 } },
  md: { text: 'text-[3.4rem]', stroke: 'text-outline', bracket: { length: 16, thickness: 3.5, gap: 12 } },
  lg: { text: 'text-[4.75rem] sm:text-[5.75rem]', stroke: 'text-outline', bracket: { length: 22, thickness: 4.5, gap: 14 } },
} as const;

/*
 * Is a big (lg) logo on screen? The TopBar hides its small logo while one is, so Home never
 * shows two wordmarks above the fold. The area under the fixed top bar counts as off screen.
 */
const visibleHeroes = new Set<symbol>();
const heroListeners = new Set<() => void>();
const heroVisible = () => visibleHeroes.size > 0;
function setHeroVisible(id: symbol, visible: boolean) {
  if (visible === visibleHeroes.has(id)) return;
  if (visible) visibleHeroes.add(id);
  else visibleHeroes.delete(id);
  heroListeners.forEach((l) => l());
}

/** True while a `<Logo size="lg" />` is visible below the top bar. */
export function useHeroLogoVisible(): boolean {
  return useSyncExternalStore(
    (cb) => {
      heroListeners.add(cb);
      return () => heroListeners.delete(cb);
    },
    heroVisible,
    () => false,
  );
}

/**
 * The flash-ready light of a disposable camera, lit in the viewfinder's info strip: it
 * charges, the flash fires (the bloom over the frame), it goes dark while it recharges,
 * then lights again. Runs once per `shot`.
 */
function FlashReady({ shot, delay, className }: { shot: number; delay: number; className?: string }) {
  const reduce = useReducedMotion();
  return (
    <motion.svg
      key={shot}
      viewBox="0 0 12 16"
      className={cn('text-stamp block h-[0.95em] w-auto overflow-visible', className)}
      initial={reduce ? false : { opacity: 0.25 }}
      animate={reduce ? undefined : { opacity: [0.25, 0.25, 1, 1, 0.2, 0.2, 1] }}
      transition={reduce ? undefined : { duration: 1.75, times: [0, 0.12, 0.2, 0.3, 0.34, 0.88, 1], delay }}
      style={{ filter: 'drop-shadow(0 0 2px rgb(255 122 26 / 0.7))' }}
      aria-hidden
    >
      <path d="M7.4.6 1 9.2h4.3L4.4 15.4 11 6.6H6.6z" fill="currentColor" />
    </motion.svg>
  );
}

/**
 * "DARON / GUESSR" wordmark in a camera viewfinder: the brackets snap into focus, the type
 * sharpens, the flash-ready light blinks and the flash fires once. Its info strip carries the
 * flash light and the orange '98 12 24 date imprint. Tap it to take the shot again.
 */
export function Logo({ size = 'lg', className }: { size?: 'sm' | 'md' | 'lg'; className?: string }) {
  const reduce = useReducedMotion();
  const s = SIZES[size];
  const [shot, setShot] = useState(0);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (size !== 'lg' || !el || typeof IntersectionObserver === 'undefined') return;
    const id = Symbol('hero-logo');
    const io = new IntersectionObserver(([e]) => setHeroVisible(id, e.isIntersecting), { rootMargin: '-64px 0px 0px 0px' });
    io.observe(el);
    return () => {
      io.disconnect();
      setHeroVisible(id, false);
    };
  }, [size]);

  if (size === 'sm') {
    return (
      <Viewfinder as="span" color="var(--color-cream)" {...s.bracket} radius={1.5} className={cn('select-none', className)}>
        <span aria-label="Daron Guessr" className={cn('block font-display leading-none whitespace-nowrap', s.text)}>
          <span className="text-cream">DARON</span> <span className="text-pink">GUESSR</span>
        </span>
      </Viewfinder>
    );
  }

  const delay = shot === 0 ? 0.15 : 0;
  return (
    <div ref={ref} className={cn('inline-block', className)} onClick={() => !reduce && setShot((n) => n + 1)}>
      <Viewfinder key={shot} color="var(--color-cream)" {...s.bracket} radius={3} snap={shot === 0 ? 0.05 : 0} shadow className="inline-block select-none">
        <motion.div
          role="img"
          aria-label="Daron Guessr"
          className={cn('flex flex-col items-center font-display leading-[0.8] tracking-[-0.025em] [font-stretch:78%]', s.text)}
          style={{ filter: 'drop-shadow(0 5px 0 var(--color-ink))' }}
          initial={reduce ? false : { filter: 'blur(10px) drop-shadow(0 5px 0 var(--color-ink))', scale: 1.08, opacity: 0.4 }}
          animate={{ filter: 'blur(0px) drop-shadow(0 5px 0 var(--color-ink))', scale: 1, opacity: 1 }}
          transition={{ duration: 0.55, ease: [0.2, 0.8, 0.2, 1], delay }}
        >
          <span className={cn('text-cream', s.stroke)} aria-hidden>
            DARON
          </span>
          <span className={cn('text-pink', s.stroke)} aria-hidden>
            GUESSR
          </span>
        </motion.div>
        {/* The flash itself: a white bloom over the frame, once per shot. */}
        {!reduce && (
          <motion.span
            className="pointer-events-none absolute -inset-6 rounded-[2rem] bg-white mix-blend-soft-light"
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 0.9, 0] }}
            transition={{ duration: 0.5, times: [0, 0.15, 1], delay: delay + 0.47 }}
            aria-hidden
          />
        )}
        {/* Viewfinder info strip: flash-ready light on the left, date imprint on the right. */}
        <span className={cn('flex items-center justify-between px-0.5', size === 'lg' ? 'mt-2 text-sm' : 'mt-1.5 text-[0.75rem]')} aria-hidden>
          <FlashReady shot={shot} delay={delay} />
          <Stamp size={size === 'lg' ? 'sm' : 'xs'}>{"'98 12 24"}</Stamp>
        </span>
      </Viewfinder>
    </div>
  );
}
