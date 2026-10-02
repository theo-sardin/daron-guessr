import { useEffect, useRef, type RefObject } from 'react';
import { REVEAL_BARS_AT_MS, REVEAL_DRUMROLL_AT_MS, REVEAL_OWNER_AT_MS } from '../../../shared/protocol';
import { burst, emojiRain, sideCannons } from '../../lib/confetti';
import { sfx } from '../../lib/sfx';
import { vibrate } from '../../lib/util';
import { PERSONAL_AT_MS, type Outcome } from './timeline';

/** Stagger between two vote bars, in seconds (shared by the bar animation and its tick sounds). */
export function barStagger(rows: number): number {
  return Math.min(0.14, 1.1 / Math.max(1, rows));
}

export type PersonalResult = 'right' | 'wrong' | 'none' | 'proud' | 'offended';

export interface RevealFx {
  rows: number;
  outcome: Outcome;
  ownerColor: string;
  correct: number;
  total: number;
  personal: PersonalResult;
  /** Element the confetti bursts from (the photo). */
  anchor: RefObject<HTMLElement | null>;
}

/** Mounting this long after `startedAt` still counts as watching the photo arrive live. */
const START_GRACE_MS = 600;
/** A threshold only fires if it was crossed recently (a tab coming back from the background stays silent). */
const LIVE_WINDOW_MS = 1500;

/** Haptics only after a user gesture (browsers log an error otherwise). */
function buzz(pattern: number | number[]) {
  if (typeof navigator !== 'undefined' && navigator.userActivation?.hasBeenActive) vibrate(pattern);
}

function originOf(el: HTMLElement | null): { x: number; y: number } {
  if (!el || typeof window === 'undefined') return { x: 0.5, y: 0.4 };
  const r = el.getBoundingClientRect();
  const x = (r.left + r.width / 2) / window.innerWidth;
  const y = (r.top + r.height / 2) / window.innerHeight;
  return { x: Math.min(0.95, Math.max(0.05, x)), y: Math.min(0.9, Math.max(0.1, y)) };
}

/**
 * Sounds, confetti and haptics of one photo's reveal. Each effect fires only when its
 * threshold is crossed while the screen is open: someone (re)joining mid-reveal lands on
 * the final state silently. Keyed by photo index by the caller, so it resets per photo.
 */
export function useRevealEffects(elapsed: number, fx: RevealFx) {
  const fxRef = useRef(fx);
  useEffect(() => {
    fxRef.current = fx;
  });

  const timers = useRef<number[]>([]);
  useEffect(
    () => () => {
      timers.current.forEach((id) => window.clearTimeout(id));
      timers.current = [];
    },
    [],
  );

  const prev = useRef<number | null>(null);
  useEffect(() => {
    const first = prev.current === null;
    const p = prev.current ?? (elapsed >= 0 && elapsed < START_GRACE_MS ? -1 : elapsed);
    prev.current = elapsed;
    const f = fxRef.current;
    const crossed = (at: number) => p < at && elapsed >= at && elapsed - at < LIVE_WINDOW_MS;

    // Intro of the whole reveal phase (photo 1 starts in the future).
    if (first && elapsed < -1000) sfx.play('drumroll');

    if (crossed(0)) sfx.play('whoosh');

    if (crossed(REVEAL_BARS_AT_MS)) {
      const stagger = barStagger(f.rows) * 1000;
      for (let i = 0; i < Math.min(f.rows, 12); i++) {
        timers.current.push(window.setTimeout(() => sfx.play('tick'), 180 + i * stagger));
      }
    }

    if (crossed(REVEAL_DRUMROLL_AT_MS)) sfx.play('drumroll');

    if (crossed(REVEAL_OWNER_AT_MS)) {
      sfx.play('reveal');
      buzz([25, 40, 25]);
      const { x, y } = originOf(f.anchor.current);
      burst({ x, y, colors: [f.ownerColor, f.ownerColor, '#fff8ec', '#ffd23f'], particleCount: 130 });
      if (f.outcome === 'everybody') sideCannons(1400, [f.ownerColor, '#ffd23f', '#fff8ec']);
      if (f.total > 0 && f.correct === 0) {
        timers.current.push(window.setTimeout(() => emojiRain('😂', 36), 350));
      }
      if (f.total === 0) timers.current.push(window.setTimeout(() => emojiRain('🦗', 14), 350));
    }

    if (crossed(PERSONAL_AT_MS)) {
      if (f.personal === 'right' || f.personal === 'proud') {
        sfx.play('success');
        buzz(30);
      } else if (f.personal === 'wrong' || f.personal === 'offended') sfx.play('fail');
      else sfx.play('tock');
    }
  }, [elapsed]);
}
