import { useEffect, useState } from 'react';

/**
 * Estimated (server clock - local clock) in ms. Updated from `RoomView.serverNow` on every
 * state message. The sample ignores one-way latency, which is fine for UI countdowns.
 */
let offset = 0;
let hasSample = false;

export function recordServerTime(serverNow: number) {
  const sample = serverNow - Date.now();
  if (!hasSample || Math.abs(sample - offset) > 1500) {
    offset = sample;
    hasSample = true;
  } else {
    // Smooth small jitter, but keep the lowest-latency sample bias in mind.
    offset = offset * 0.8 + sample * 0.2;
  }
}

/** Current time on the server's clock (ms since epoch). */
export function serverNow(): number {
  return Date.now() + offset;
}

/** Re-renders every `intervalMs` and returns the estimated server time. */
export function useServerNow(intervalMs = 200): number {
  const [now, setNow] = useState(serverNow);
  useEffect(() => {
    const id = window.setInterval(() => setNow(serverNow()), intervalMs);
    return () => window.clearInterval(id);
  }, [intervalMs]);
  return now;
}

/**
 * Milliseconds elapsed since `serverStart` (server clock), re-rendering on animation
 * frames while `active`. Useful for driving timelines such as the reveal sequence.
 */
export function useElapsedSince(serverStart: number, active = true): number {
  const [elapsed, setElapsed] = useState(() => serverNow() - serverStart);
  useEffect(() => {
    setElapsed(serverNow() - serverStart);
    if (!active) return;
    let raf = 0;
    const loop = () => {
      setElapsed(serverNow() - serverStart);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [serverStart, active]);
  return elapsed;
}
