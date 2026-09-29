import confetti from 'canvas-confetti';
import { PLAYER_COLORS } from '../../shared/protocol';

const BASE = { disableForReducedMotion: true, zIndex: 60 } as const;
const PARTY = [...PLAYER_COLORS];

/** One big burst from a point (defaults to the middle of the screen). */
export function burst(opts: { colors?: string[]; x?: number; y?: number; particleCount?: number } = {}) {
  void confetti({
    ...BASE,
    particleCount: opts.particleCount ?? 140,
    spread: 90,
    startVelocity: 45,
    origin: { x: opts.x ?? 0.5, y: opts.y ?? 0.45 },
    colors: opts.colors ?? PARTY,
    scalar: 1.1,
  });
}

/** Two cannons firing from the bottom corners for `durationMs`. */
export function sideCannons(durationMs = 1800, colors: string[] = PARTY) {
  const end = Date.now() + durationMs;
  const frame = () => {
    void confetti({ ...BASE, particleCount: 4, angle: 60, spread: 55, origin: { x: 0, y: 0.85 }, colors, startVelocity: 60 });
    void confetti({ ...BASE, particleCount: 4, angle: 120, spread: 55, origin: { x: 1, y: 0.85 }, colors, startVelocity: 60 });
    if (Date.now() < end) requestAnimationFrame(frame);
  };
  frame();
}

/** Random fireworks bursts across the top half of the screen. */
export function fireworks(durationMs = 3000, colors: string[] = PARTY) {
  const end = Date.now() + durationMs;
  const id = window.setInterval(() => {
    if (Date.now() > end) {
      window.clearInterval(id);
      return;
    }
    void confetti({
      ...BASE,
      particleCount: 50,
      spread: 360,
      startVelocity: 28,
      ticks: 70,
      origin: { x: 0.15 + Math.random() * 0.7, y: 0.15 + Math.random() * 0.35 },
      colors,
    });
  }, 280);
}

/** Emoji rain, e.g. 😂 when nobody guessed right. */
export function emojiRain(emoji: string, count = 30) {
  const shape = confetti.shapeFromText?.({ text: emoji, scalar: 2.2 });
  if (!shape) return;
  void confetti({
    ...BASE,
    shapes: [shape],
    scalar: 2.2,
    particleCount: count,
    spread: 120,
    startVelocity: 35,
    gravity: 0.9,
    origin: { x: 0.5, y: 0.3 },
    flat: true,
  });
}
