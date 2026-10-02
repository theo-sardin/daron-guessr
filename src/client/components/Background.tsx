import { motion, useReducedMotion } from 'motion/react';
import { useMemo } from 'react';
import { seeded } from '../lib/util';

const DOODLES = ['👨', '👩', '🥸', '👴', '👵', '📸', '❓', '🧔', '👱‍♀️', '🕵️'];

/**
 * Decorative animated backdrop: the grape night sky, soft color blobs and a few drifting
 * emoji doodles. Fixed behind everything (the body has no background of its own, so this
 * layer shows) and ignored by assistive tech.
 */
export function Background() {
  const reduce = useReducedMotion();
  const doodles = useMemo(() => {
    const rand = seeded(7);
    return Array.from({ length: 12 }, (_, i) => ({
      emoji: DOODLES[i % DOODLES.length],
      left: `${Math.round(rand() * 92)}%`,
      top: `${Math.round(rand() * 92)}%`,
      size: 22 + Math.round(rand() * 26),
      delay: rand() * 4,
      duration: 7 + rand() * 6,
      rotate: Math.round(rand() * 40 - 20),
    }));
  }, []);

  return (
    <div
      className="pointer-events-none fixed inset-0 -z-10 overflow-hidden"
      style={{ background: 'radial-gradient(120% 80% at 50% 0%, var(--color-grape-700) 0%, var(--color-grape-900) 55%, var(--color-grape-950) 100%)' }}
      aria-hidden
    >
      <motion.div
        className="absolute -top-32 -left-24 size-[28rem] rounded-full bg-pink/20 blur-3xl"
        animate={reduce ? undefined : { x: [0, 60, 0], y: [0, 40, 0] }}
        transition={{ duration: 18, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="absolute top-1/3 -right-32 size-[26rem] rounded-full bg-sky/15 blur-3xl"
        animate={reduce ? undefined : { x: [0, -50, 0], y: [0, 60, 0] }}
        transition={{ duration: 22, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="absolute -bottom-40 left-1/4 size-[30rem] rounded-full bg-sun/10 blur-3xl"
        animate={reduce ? undefined : { x: [0, 40, 0], y: [0, -40, 0] }}
        transition={{ duration: 20, repeat: Infinity, ease: 'easeInOut' }}
      />
      {doodles.map((d, i) => (
        <motion.span
          key={i}
          className="absolute opacity-[0.08] grayscale-[30%]"
          style={{ left: d.left, top: d.top, fontSize: d.size, rotate: d.rotate }}
          animate={reduce ? undefined : { y: [0, -18, 0], rotate: [d.rotate, d.rotate + 8, d.rotate] }}
          transition={{ duration: d.duration, delay: d.delay, repeat: Infinity, ease: 'easeInOut' }}
        >
          {d.emoji}
        </motion.span>
      ))}
    </div>
  );
}
