import { useId, useLayoutEffect, useMemo, useRef, useState, type RefObject } from 'react';
import { hash, tornClip, type TornOptions } from './geometry';

/** Layout size (px) of an element, ignoring transforms; updates on resize. */
export function useElementSize<T extends HTMLElement | SVGElement>(): [RefObject<T | null>, { w: number; h: number }] {
  const ref = useRef<T>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => {
      const w = el instanceof HTMLElement ? el.offsetWidth : el.getBoundingClientRect().width;
      const h = el instanceof HTMLElement ? el.offsetHeight : el.getBoundingClientRect().height;
      setSize((s) => (Math.abs(s.w - w) < 0.5 && Math.abs(s.h - h) < 0.5 ? s : { w, h }));
    };
    measure();
    if (typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, size];
}

/** A stable numeric seed: the given one, or one derived from the component instance. */
export function useSeed(seed?: number | string): number {
  const id = useId();
  return useMemo(() => (seed === undefined ? hash(id) : typeof seed === 'number' ? seed : hash(seed)), [seed, id]);
}

/**
 * Torn clip paths for the element behind `ref`, recomputed when it resizes.
 * Before the first measure (and in environments without layout) the paper stays a rectangle.
 */
export function useTornClip<T extends HTMLElement>(opts: TornOptions & { seed?: number | string }) {
  const seed = useSeed(opts.seed);
  const [ref, size] = useElementSize<T>();
  const clip = useMemo(
    () => (size.w > 0 && size.h > 0 ? tornClip(size.w, size.h, { edges: opts.edges, amp: opts.amp, step: opts.step, seed }) : null),
    [size.w, size.h, opts.edges, opts.amp, opts.step, seed],
  );
  return [ref, clip] as const;
}
