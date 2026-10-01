import { useSyncExternalStore } from 'react';

/*
 * The faces the zine's lettering needs before it gets slapped on: the cut-out letters, the
 * logo, marker and ballpoint notes. Until they arrive the browser draws Georgia / Impact, so
 * animated lettering waits for them (at most WAIT_MS, then it plays with whatever is there).
 * The latin files of the main ones are also preloaded from index.html.
 */
const FACES = [
  '400 1em "Abril Fatface"',
  '400 1em "Anton"',
  '400 1em "Alfa Slab One"',
  '400 1em "Rubik Mono One"',
  '400 1em "DM Serif Display"',
  'italic 400 1em "DM Serif Display"',
  '400 1em "Bungee"',
  '400 1em "Archivo Black"',
  '800 1em "Archivo Variable"',
  '700 1em "Caveat Variable"',
  '400 1em "Permanent Marker"',
];

const WAIT_MS = 900;

let ready = false;
let started = false;
const listeners = new Set<() => void>();

function allLoaded(): boolean {
  try {
    return FACES.every((f) => document.fonts.check(f));
  } catch {
    return false;
  }
}

function start() {
  if (started) return;
  started = true;
  if (typeof document === 'undefined' || !document.fonts) {
    ready = true;
    return;
  }
  if (allLoaded()) {
    ready = true;
    return;
  }
  const done = () => {
    if (ready) return;
    ready = true;
    listeners.forEach((l) => l());
  };
  void Promise.all(FACES.map((f) => document.fonts.load(f).catch(() => []))).then(done);
  window.setTimeout(done, WAIT_MS);
}

/** Resolves once the lettering faces are loaded (or after a short wait). */
export function whenLetteringReady(): Promise<void> {
  start();
  if (ready) return Promise.resolve();
  return new Promise((resolve) => {
    const l = () => {
      listeners.delete(l);
      resolve();
    };
    listeners.add(l);
  });
}

/** True once the lettering faces are loaded (or after a short wait): gate entrance animations on it. */
export function useLetteringReady(): boolean {
  start();
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => ready,
    () => true,
  );
}
