import { useSyncExternalStore } from 'react';

/**
 * Tiny synthesized sound effects (no audio files). Everything goes through one
 * AudioContext created lazily on the first play, which always follows a user gesture.
 */
export type SfxName =
  | 'click'
  | 'pop'
  | 'join'
  | 'tick'
  | 'tock'
  | 'whoosh'
  | 'vote'
  | 'drumroll'
  | 'reveal'
  | 'success'
  | 'fail'
  | 'fanfare'
  | 'countdown'
  | 'go';

const MUTE_KEY = 'dg:muted';
let muted = readMuted();
let ctx: AudioContext | null = null;
let master: GainNode | null = null;
const listeners = new Set<() => void>();

function readMuted(): boolean {
  try {
    return localStorage.getItem(MUTE_KEY) === '1';
  } catch {
    return false;
  }
}

function audio(): { ctx: AudioContext; out: GainNode } | null {
  if (typeof window === 'undefined') return null;
  if (!ctx) {
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    ctx = new Ctor();
    master = ctx.createGain();
    master.gain.value = 0.35;
    master.connect(ctx.destination);
  }
  if (ctx.state === 'suspended') void ctx.resume();
  return { ctx, out: master! };
}

function tone(
  freq: number,
  start: number,
  duration: number,
  opts: { type?: OscillatorType; gain?: number; slideTo?: number; attack?: number } = {},
) {
  const a = audio();
  if (!a) return;
  const t0 = a.ctx.currentTime + start;
  const osc = a.ctx.createOscillator();
  const g = a.ctx.createGain();
  osc.type = opts.type ?? 'sine';
  osc.frequency.setValueAtTime(freq, t0);
  if (opts.slideTo) osc.frequency.exponentialRampToValueAtTime(opts.slideTo, t0 + duration);
  const peak = opts.gain ?? 0.5;
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(peak, t0 + (opts.attack ?? 0.01));
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
  osc.connect(g).connect(a.out);
  osc.start(t0);
  osc.stop(t0 + duration + 0.05);
}

function noise(start: number, duration: number, opts: { gain?: number; filter?: number } = {}) {
  const a = audio();
  if (!a) return;
  const t0 = a.ctx.currentTime + start;
  const len = Math.max(1, Math.floor(a.ctx.sampleRate * duration));
  const buffer = a.ctx.createBuffer(1, len, a.ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
  const src = a.ctx.createBufferSource();
  src.buffer = buffer;
  const filter = a.ctx.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.value = opts.filter ?? 1200;
  const g = a.ctx.createGain();
  g.gain.setValueAtTime(opts.gain ?? 0.4, t0);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
  src.connect(filter).connect(g).connect(a.out);
  src.start(t0);
  src.stop(t0 + duration + 0.05);
}

const SOUNDS: Record<SfxName, () => void> = {
  click: () => tone(660, 0, 0.06, { type: 'triangle', gain: 0.25 }),
  pop: () => tone(420, 0, 0.12, { type: 'sine', slideTo: 900, gain: 0.45 }),
  join: () => {
    tone(523, 0, 0.12, { type: 'triangle', gain: 0.35 });
    tone(784, 0.09, 0.18, { type: 'triangle', gain: 0.35 });
  },
  tick: () => tone(1100, 0, 0.04, { type: 'square', gain: 0.12 }),
  tock: () => tone(760, 0, 0.05, { type: 'square', gain: 0.14 }),
  whoosh: () => noise(0, 0.35, { gain: 0.35, filter: 900 }),
  vote: () => {
    tone(880, 0, 0.08, { type: 'triangle', gain: 0.35 });
    tone(1320, 0.06, 0.12, { type: 'triangle', gain: 0.3 });
  },
  drumroll: () => {
    for (let i = 0; i < 26; i++) noise(i * 0.075, 0.07, { gain: 0.18 + (i / 26) * 0.3, filter: 300 });
  },
  reveal: () => {
    noise(0, 0.25, { gain: 0.5, filter: 2500 });
    tone(392, 0, 0.5, { type: 'sawtooth', gain: 0.18 });
    tone(523, 0.02, 0.5, { type: 'sawtooth', gain: 0.18 });
    tone(659, 0.04, 0.6, { type: 'sawtooth', gain: 0.18 });
  },
  success: () => {
    [523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.08, 0.2, { type: 'triangle', gain: 0.35 }));
  },
  fail: () => {
    tone(392, 0, 0.22, { type: 'sawtooth', gain: 0.18, slideTo: 330 });
    tone(311, 0.22, 0.4, { type: 'sawtooth', gain: 0.18, slideTo: 220 });
  },
  fanfare: () => {
    const notes = [523, 523, 523, 698, 880, 784, 880, 1047];
    const times = [0, 0.12, 0.24, 0.36, 0.6, 0.78, 0.9, 1.05];
    notes.forEach((f, i) => tone(f, times[i], i === notes.length - 1 ? 0.7 : 0.16, { type: 'square', gain: 0.16 }));
  },
  countdown: () => tone(587, 0, 0.14, { type: 'square', gain: 0.2 }),
  go: () => tone(1175, 0, 0.35, { type: 'square', gain: 0.22 }),
};

export const sfx = {
  play(name: SfxName) {
    if (muted) return;
    try {
      SOUNDS[name]();
    } catch {
      // Audio is best effort.
    }
  },
  isMuted: () => muted,
  setMuted(value: boolean) {
    muted = value;
    try {
      localStorage.setItem(MUTE_KEY, value ? '1' : '0');
    } catch {
      // ignore
    }
    listeners.forEach((l) => l());
  },
};

export function useMuted(): boolean {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => muted,
  );
}
