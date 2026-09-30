/*
 * Geometry of the scrapbook: torn paper edges, scissor cuts and hand-drawn marker strokes.
 * Everything is deterministic for a given seed, so a torn strip or a marker loop keeps its
 * shape across renders (and every player sees the same cut-out letters for the same name).
 */

/** Small LCG, good enough for wobbles (not for anything that matters). */
export function rng(seed: number): () => number {
  let s = seed >>> 0 || 1;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

/** FNV-1a hash of a string. */
export function hash(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** A seed from a number or a string. */
export const toSeed = (seed: number | string | undefined, fallback = 1): number =>
  seed === undefined ? fallback : typeof seed === 'number' ? seed >>> 0 || 1 : hash(seed);

type Pt = [number, number];

const polyPx = (pts: Pt[]) => `polygon(${pts.map((p) => `${p[0].toFixed(1)}px ${p[1].toFixed(1)}px`).join(',')})`;
const polyPct = (pts: Pt[]) => `polygon(${pts.map((p) => `${p[0].toFixed(1)}% ${p[1].toFixed(1)}%`).join(',')})`;

/** Which edges are torn: any combination of t, r, b, l (e.g. "tb", "tblr", "r"). */
export type TornEdges = string;

export interface TornOptions {
  edges?: TornEdges;
  /** Depth of the tear in px (default 3). */
  amp?: number;
  /** Distance between two points of the edge in px (default 6). */
  step?: number;
  seed?: number;
}

/**
 * Clip paths of a torn sheet of w x h px: `outer` is the paper, `inner` sits 1-3px further in
 * along the torn edges (the paper layer shows its white fibrous core between the two).
 */
export function tornClip(w: number, h: number, { edges = 'tb', amp = 3, step = 6, seed = 1 }: TornOptions = {}): { outer: string; inner: string } {
  const r = rng(seed + Math.round(w) * 7 + Math.round(h) * 13);
  const outer: Pt[] = [];
  const inner: Pt[] = [];
  const edge = (x0: number, y0: number, x1: number, y1: number, on: boolean, nx: number, ny: number) => {
    const len = Math.hypot(x1 - x0, y1 - y0);
    const n = Math.max(1, Math.round(len / step));
    let drift = 0;
    for (let k = 0; k < n; k++) {
      const t = k / n;
      let o = 0;
      let o2 = 0;
      if (on) {
        drift = drift * 0.55 + (r() - 0.5) * amp * 0.9;
        o = Math.max(0, amp * 0.5 + drift + (r() - 0.5) * amp * 0.8);
        o2 = o + 0.8 + r() * 2.6;
      }
      const x = x0 + (x1 - x0) * t;
      const y = y0 + (y1 - y0) * t;
      outer.push([x + nx * o, y + ny * o]);
      inner.push([x + nx * o2, y + ny * o2]);
    }
  };
  edge(0, 0, w, 0, edges.includes('t'), 0, 1);
  edge(w, 0, w, h, edges.includes('r'), -1, 0);
  edge(w, h, 0, h, edges.includes('b'), 0, -1);
  edge(0, h, 0, 0, edges.includes('l'), 1, 0);
  return { outer: polyPx(outer), inner: polyPx(inner) };
}

/**
 * A scissor-cut rectangle (4 or 5 slightly crooked corners), in % of the box, so it needs no
 * measuring: for cut-out letters, labels and badges. `depth` is the max cut in % (default 9).
 */
export function scissorClip(seed: number, depth = 9): string {
  const r = rng(seed);
  const m = depth;
  const pts: Pt[] = [
    [r() * m, r() * m],
    [100 - r() * m, r() * m * 0.6],
    [100 - r() * m * 0.6, 100 - r() * m],
    [r() * m * 0.7, 100 - r() * m * 0.8],
  ];
  if (r() > 0.5) pts.splice(1, 0, [30 + r() * 40, r() * m * 0.5]);
  return polyPct(pts);
}

/** Masking tape ends: jagged left and right edges (in %). */
export const TAPE_CLIP =
  'polygon(0 4%,3% 0,100% 0,97% 18%,100% 33%,96.5% 50%,100% 66%,97% 82%,100% 100%,2% 100%,0 86%,3% 70%,0 52%,3.5% 36%,0 20%)';

/** Catmull-Rom spline through points, as a cubic Bezier SVG path. */
export function smoothPath(pts: Pt[]): string {
  if (pts.length < 2) return '';
  let d = `M${pts[0][0].toFixed(1)} ${pts[0][1].toFixed(1)}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] ?? p2;
    const c1: Pt = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2: Pt = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += `C${c1[0].toFixed(1)} ${c1[1].toFixed(1)} ${c2[0].toFixed(1)} ${c2[1].toFixed(1)} ${p2[0].toFixed(1)} ${p2[1].toFixed(1)}`;
  }
  return d;
}

/**
 * A marker loop around a w x h box (the SVG is the box grown by `pad` on every side): a bit
 * more than one turn, slightly wobbly, starting and ending on the upper left like a quick hand.
 */
export function loopPath(w: number, h: number, pad: number, seed: number): string {
  const r = rng(seed);
  const cx = w / 2 + pad;
  const cy = h / 2 + pad;
  const rx = w / 2 + pad * 0.72;
  const ry = h / 2 + pad * 0.72;
  const start = (-2.35 + (r() - 0.5) * 0.4) as number;
  const turns = 1.1 + r() * 0.08;
  const n = 18;
  const pts: Pt[] = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const a = start + t * turns * Math.PI * 2;
    // Spiral a little outwards so the overshoot does not sit on the first stroke.
    const grow = 1 - 0.05 + t * 0.1 + (r() - 0.5) * 0.05;
    pts.push([cx + Math.cos(a) * rx * grow, cy + Math.sin(a) * ry * grow]);
  }
  return smoothPath(pts);
}

/** A quick marker underline across `w` (one stroke, or two when `double`). */
export function underlinePath(w: number, h: number, seed: number, double = false): string {
  const r = rng(seed);
  const y = h * 0.42;
  const j = () => (r() - 0.5) * h * 0.35;
  const a = `M3 ${(y + j()).toFixed(1)}C${(w * 0.3).toFixed(1)} ${(y - h * 0.3 + j()).toFixed(1)} ${(w * 0.6).toFixed(1)} ${(y - h * 0.1 + j()).toFixed(1)} ${(w - 3).toFixed(1)} ${(y - h * 0.22 + j()).toFixed(1)}`;
  if (!double) return a;
  const y2 = h * 0.82;
  const b = `M${(w * 0.1).toFixed(1)} ${(y2 + j()).toFixed(1)}C${(w * 0.4).toFixed(1)} ${(y2 - h * 0.25 + j()).toFixed(1)} ${(w * 0.7).toFixed(1)} ${(y2 - h * 0.08 + j()).toFixed(1)} ${(w * 0.9).toFixed(1)} ${(y2 - h * 0.12 + j()).toFixed(1)}`;
  return `${a}${b}`;
}

/** Two quick strokes crossing a w x h box out. */
export function crossPath(w: number, h: number, pad: number, seed: number): string {
  const r = rng(seed);
  const j = () => (r() - 0.5) * pad;
  const x0 = pad;
  const y0 = pad;
  const x1 = w + pad;
  const y1 = h + pad;
  return `M${x0 + j()} ${y0 + j()}Q${(x0 + x1) / 2 + j() * 2} ${(y0 + y1) / 2 - pad * 0.4} ${x1 + j()} ${y1 + j()}M${x1 + j()} ${y0 + j()}Q${(x0 + x1) / 2 + j() * 2} ${(y0 + y1) / 2 + pad * 0.4} ${x0 + j()} ${y1 + j()}`;
}

/**
 * A hand-drawn arrow from `a` to `b` (px) bending by `bend` (a fraction of the distance,
 * negative bends the other way). Returns the shaft and the head as separate paths.
 */
export function arrowPaths(a: Pt, b: Pt, bend: number, head: number): { shaft: string; head: string } {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const len = Math.hypot(dx, dy) || 1;
  const nx = -dy / len;
  const ny = dx / len;
  const c: Pt = [a[0] + dx * 0.5 + nx * bend * len, a[1] + dy * 0.5 + ny * bend * len];
  const shaft = `M${a[0].toFixed(1)} ${a[1].toFixed(1)}Q${c[0].toFixed(1)} ${c[1].toFixed(1)} ${b[0].toFixed(1)} ${b[1].toFixed(1)}`;
  // Tangent at the end of the quadratic curve: b - c.
  const tx = b[0] - c[0];
  const ty = b[1] - c[1];
  const tl = Math.hypot(tx, ty) || 1;
  const ux = tx / tl;
  const uy = ty / tl;
  const wing = (angle: number): Pt => {
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    // Rotate the reversed tangent by ±angle.
    const rx = -ux * cos - -uy * sin;
    const ry = -ux * sin + -uy * cos;
    return [b[0] + rx * head, b[1] + ry * head];
  };
  const w1 = wing(0.52);
  const w2 = wing(-0.46);
  const headPath = `M${w1[0].toFixed(1)} ${w1[1].toFixed(1)}L${b[0].toFixed(1)} ${b[1].toFixed(1)}L${w2[0].toFixed(1)} ${w2[1].toFixed(1)}`;
  return { shaft, head: headPath };
}

/** Points of a star burst (a cut-out "100% GÊNANT" badge), in a 100x100 box. */
export function burstPoints(spikes: number, seed: number, inner = 0.72): string {
  const r = rng(seed);
  const pts: string[] = [];
  for (let i = 0; i < spikes * 2; i++) {
    const a = (Math.PI / spikes) * i - Math.PI / 2;
    const rad = (i % 2 ? inner * 48 : 48) * (i % 2 ? 1 : 0.94 + r() * 0.08);
    pts.push(`${(50 + Math.cos(a) * rad).toFixed(1)},${(50 + Math.sin(a) * rad).toFixed(1)}`);
  }
  return pts.join(' ');
}
