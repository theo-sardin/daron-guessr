import { useId, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import type { Theme } from '../../shared/protocol';
import { cn } from '../lib/util';
import { hash, rng } from './paper/geometry';

/** Accent of each theme (banner, selected mode card, illustration). */
export const THEME_TONE: Record<Theme, 'sun' | 'mint' | 'tangerine' | 'lilac' | 'sky'> = {
  parents: 'sun',
  family: 'mint',
  childhood: 'tangerine',
  pick: 'lilac',
  roll: 'sky',
  crush: 'tangerine',
  whois: 'sun',
  body: 'mint',
  mix: 'sky',
};
export const themeColor = (theme: Theme) => `var(--color-${THEME_TONE[theme]})`;

const INK = 'var(--color-ink)';
const PAPER = '#fffdf6';
const BLUSH = 'rgb(255 79 163 / 0.45)';
/** Skin tones of the cast (same family as the print portraits). */
const SKIN = { dad: '#f2c190', mom: '#d99a6c', kid: '#ffd8b4', girl: '#e8b184' } as const;

/** Below this rendered width (px) the compact drawing is used: one print, one big subject. */
const COMPACT_BELOW = 48;

type Subject = 'dad' | 'mom' | 'kid' | 'girl' | 'cat' | 'landscape' | 'shuffle' | 'idol' | 'me' | 'hand' | 'eye';

/** Stroke widths in viewBox units: frame, photo edge, features. */
interface Strokes {
  frame: number;
  edge: number;
  line: number;
}
const FULL: Strokes = { frame: 3, edge: 0.7, line: 1.35 };
const COMPACT: Strokes = { frame: 4.6, edge: 1, line: 2.2 };

/*
 * The cast. Each one is drawn inside a w x h photo (origin top-left, clipped): a flat face
 * (skin + 2-3 ink features, like the print portraits) with era-specific hair, so they read as
 * people from the family album rather than "no profile picture" placeholders.
 */
function subjectShape(subject: Subject, w: number, h: number, sw: number, accent: string): ReactNode {
  const cx = w / 2;
  const line = { stroke: INK, strokeWidth: sw, strokeLinecap: 'round', strokeLinejoin: 'round' } as const;
  switch (subject) {
    // Dad, 1994: side part, big square frames, a jacket over a white collar.
    case 'dad': {
      const r = w * 0.25;
      const cy = h * 0.47;
      const bodyTop = cy + r * 1.05;
      return (
        <>
          <rect x={cx - r * 0.38} y={cy + r * 0.5} width={r * 0.76} height={r} fill={SKIN.dad} {...line} />
          <path d={`M${cx - w * 0.52} ${h + 2}C${cx - w * 0.5} ${bodyTop}${' '}${cx - r * 0.9} ${bodyTop} ${cx} ${bodyTop}S${cx + w * 0.5} ${bodyTop} ${cx + w * 0.52} ${h + 2}z`} fill={INK} />
          <path d={`M${cx - r * 0.55} ${bodyTop - 0.4}L${cx} ${bodyTop + r * 0.75}L${cx + r * 0.55} ${bodyTop - 0.4}z`} fill={PAPER} />
          <circle cx={cx - r * 0.98} cy={cy + r * 0.12} r={r * 0.22} fill={SKIN.dad} {...line} />
          <circle cx={cx + r * 0.98} cy={cy + r * 0.12} r={r * 0.22} fill={SKIN.dad} {...line} />
          <circle cx={cx} cy={cy} r={r} fill={SKIN.dad} {...line} />
          {/* Side part: a notch on the left, then the hair swoops up and over to the right. */}
          <path
            d={`M${cx - r * 1.03} ${cy + r * 0.05}C${cx - r * 1.12} ${cy - r * 0.7} ${cx - r * 0.82} ${cy - r * 1.08} ${cx - r * 0.44} ${cy - r * 1.1}L${cx - r * 0.3} ${cy - r * 0.86}C${cx - r * 0.1} ${cy - r * 1.42} ${cx + r * 0.8} ${cy - r * 1.46} ${cx + r * 1.06} ${cy - r * 0.72}C${cx + r * 1.2} ${cy - r * 0.38} ${cx + r * 1.1} ${cy - r * 0.1} ${cx + r * 1.03} ${cy + r * 0.05}C${cx + r * 0.88} ${cy - r * 0.3} ${cx + r * 0.62} ${cy - r * 0.52} ${cx + r * 0.1} ${cy - r * 0.56}C${cx - r * 0.18} ${cy - r * 0.58} ${cx - r * 0.34} ${cy - r * 0.66} ${cx - r * 0.42} ${cy - r * 0.76}C${cx - r * 0.72} ${cy - r * 0.6} ${cx - r * 0.92} ${cy - r * 0.3} ${cx - r * 1.03} ${cy + r * 0.05}z`}
            fill={INK}
            {...line}
          />
          {/* Big 90s frames. */}
          <g fill="rgb(255 255 255 / 0.4)" {...line}>
            <rect x={cx - r * 0.9} y={cy - r * 0.2} width={r * 0.76} height={r * 0.62} rx={r * 0.2} />
            <rect x={cx + r * 0.14} y={cy - r * 0.2} width={r * 0.76} height={r * 0.62} rx={r * 0.2} />
            <path d={`M${cx - r * 0.14} ${cy + r * 0.02}h${r * 0.28}`} fill="none" />
          </g>
          <circle cx={cx - r * 0.5} cy={cy + r * 0.1} r={r * 0.1} fill={INK} />
          <circle cx={cx + r * 0.5} cy={cy + r * 0.1} r={r * 0.1} fill={INK} />
          <path d={`M${cx - r * 0.3} ${cy + r * 0.62}Q${cx} ${cy + r * 0.8} ${cx + r * 0.3} ${cy + r * 0.62}`} fill="none" {...line} />
        </>
      );
    }
    // Mom, 1987: a big perm (a cloud of curls), puffy fringe, hoop earrings, a white blouse.
    case 'mom': {
      const r = w * 0.22;
      const cy = h * 0.46;
      const curls: Array<[number, number, number]> = [
        [-1.12, 0.62, 0.5],
        [1.12, 0.62, 0.5],
        [-1.22, 0.02, 0.55],
        [1.22, 0.02, 0.55],
        [-0.95, -0.62, 0.56],
        [0.95, -0.62, 0.56],
        [-0.42, -1.02, 0.56],
        [0.42, -1.02, 0.56],
      ];
      const bodyTop = cy + r * 1.1;
      return (
        <>
          <g fill={INK} {...line}>
            <ellipse cx={cx} cy={cy - r * 0.05} rx={r * 1.25} ry={r * 1.2} />
            {curls.map(([x, y, k], i) => (
              <circle key={i} cx={cx + r * x} cy={cy + r * y} r={r * k} />
            ))}
          </g>
          <rect x={cx - r * 0.34} y={cy + r * 0.5} width={r * 0.68} height={r} fill={SKIN.mom} {...line} />
          <path d={`M${cx - w * 0.5} ${h + 2}C${cx - w * 0.48} ${bodyTop}${' '}${cx - r * 0.8} ${bodyTop} ${cx} ${bodyTop}S${cx + w * 0.48} ${bodyTop} ${cx + w * 0.5} ${h + 2}z`} fill={PAPER} {...line} />
          <path d={`M${cx - r * 0.42} ${bodyTop + 0.2}Q${cx} ${bodyTop + r * 0.55} ${cx + r * 0.42} ${bodyTop + 0.2}`} fill={SKIN.mom} {...line} />
          <circle cx={cx} cy={cy} r={r} fill={SKIN.mom} {...line} />
          {/* Puffy fringe. */}
          <path
            d={`M${cx - r * 1.0} ${cy + r * 0.05}C${cx - r * 1.1} ${cy - r * 1.2} ${cx + r * 1.1} ${cy - r * 1.2} ${cx + r * 1.0} ${cy + r * 0.05}Q${cx + r * 0.9} ${cy - r * 0.42} ${cx + r * 0.5} ${cy - r * 0.38}Q${cx + r * 0.25} ${cy - r * 0.72} ${cx - r * 0.05} ${cy - r * 0.42}Q${cx - r * 0.38} ${cy - r * 0.74} ${cx - r * 0.62} ${cy - r * 0.36}Q${cx - r * 0.92} ${cy - r * 0.4} ${cx - r * 1.0} ${cy + r * 0.05}z`}
            fill={INK}
            {...line}
          />
          <circle cx={cx - r * 0.38} cy={cy + r * 0.14} r={r * 0.11} fill={INK} />
          <circle cx={cx + r * 0.38} cy={cy + r * 0.14} r={r * 0.11} fill={INK} />
          <path d={`M${cx - r * 0.28} ${cy + r * 0.52}Q${cx} ${cy + r * 0.74} ${cx + r * 0.28} ${cy + r * 0.52}`} fill="none" {...line} />
          <g fill="none" stroke={accent === INK ? PAPER : 'var(--color-sun)'} strokeWidth={sw * 0.9}>
            <circle cx={cx - r * 0.98} cy={cy + r * 0.62} r={r * 0.2} />
            <circle cx={cx + r * 0.98} cy={cy + r * 0.62} r={r * 0.2} />
          </g>
        </>
      );
    }
    // Me as a kid, 1996: bowl cut, rosy cheeks, gap-tooth grin.
    case 'kid': {
      const r = w * 0.3;
      const cy = h * 0.5;
      return (
        <>
          <path d={`M${cx - w * 0.42} ${h + 2}C${cx - w * 0.4} ${cy + r * 1.05} ${cx + w * 0.4} ${cy + r * 1.05} ${cx + w * 0.42} ${h + 2}z`} fill={PAPER} {...line} />
          <circle cx={cx - r * 0.98} cy={cy + r * 0.2} r={r * 0.2} fill={SKIN.kid} {...line} />
          <circle cx={cx + r * 0.98} cy={cy + r * 0.2} r={r * 0.2} fill={SKIN.kid} {...line} />
          <circle cx={cx} cy={cy} r={r} fill={SKIN.kid} {...line} />
          {/* Bowl cut: a helmet of hair with a dead-straight fringe. */}
          <path
            d={`M${cx - r * 1.06} ${cy + r * 0.06}C${cx - r * 1.16} ${cy - r * 1.32} ${cx + r * 1.16} ${cy - r * 1.32} ${cx + r * 1.06} ${cy + r * 0.06}L${cx + r * 0.8} ${cy + r * 0.06}L${cx + r * 0.74} ${cy - r * 0.26}L${cx - r * 0.74} ${cy - r * 0.26}L${cx - r * 0.8} ${cy + r * 0.06}z`}
            fill={INK}
            {...line}
          />
          <circle cx={cx - r * 0.62} cy={cy + r * 0.42} r={r * 0.17} fill={BLUSH} />
          <circle cx={cx + r * 0.62} cy={cy + r * 0.42} r={r * 0.17} fill={BLUSH} />
          <circle cx={cx - r * 0.34} cy={cy + r * 0.1} r={r * 0.11} fill={INK} />
          <circle cx={cx + r * 0.34} cy={cy + r * 0.1} r={r * 0.11} fill={INK} />
          <path d={`M${cx - r * 0.4} ${cy + r * 0.4}Q${cx} ${cy + r * 1.0} ${cx + r * 0.4} ${cy + r * 0.4}z`} fill={INK} {...line} />
          <rect x={cx - r * 0.24} y={cy + r * 0.4} width={r * 0.18} height={r * 0.16} fill={PAPER} />
          <rect x={cx + r * 0.06} y={cy + r * 0.4} width={r * 0.18} height={r * 0.16} fill={PAPER} />
        </>
      );
    }
    // Little sister: two pigtail bunches with bobbles.
    case 'girl': {
      const r = w * 0.27;
      const cy = h * 0.52;
      return (
        <>
          <path d={`M${cx - w * 0.42} ${h + 2}C${cx - w * 0.4} ${cy + r * 1.05} ${cx + w * 0.4} ${cy + r * 1.05} ${cx + w * 0.42} ${h + 2}z`} fill={PAPER} {...line} />
          <circle cx={cx - r * 1.22} cy={cy - r * 0.2} r={r * 0.46} fill={INK} {...line} />
          <circle cx={cx + r * 1.22} cy={cy - r * 0.2} r={r * 0.46} fill={INK} {...line} />
          <circle cx={cx} cy={cy} r={r} fill={SKIN.girl} {...line} />
          <path
            d={`M${cx - r * 1.03} ${cy + r * 0.05}C${cx - r * 1.12} ${cy - r * 1.28} ${cx + r * 1.12} ${cy - r * 1.28} ${cx + r * 1.03} ${cy + r * 0.05}Q${cx + r * 0.82} ${cy - r * 0.5} ${cx} ${cy - r * 0.56}Q${cx - r * 0.82} ${cy - r * 0.5} ${cx - r * 1.03} ${cy + r * 0.05}z`}
            fill={INK}
            {...line}
          />
          <circle cx={cx - r * 0.92} cy={cy - r * 0.34} r={r * 0.17} fill="var(--color-pink)" {...line} strokeWidth={sw * 0.8} />
          <circle cx={cx + r * 0.92} cy={cy - r * 0.34} r={r * 0.17} fill="var(--color-pink)" {...line} strokeWidth={sw * 0.8} />
          <circle cx={cx - r * 0.34} cy={cy + r * 0.14} r={r * 0.11} fill={INK} />
          <circle cx={cx + r * 0.34} cy={cy + r * 0.14} r={r * 0.11} fill={INK} />
          <path d={`M${cx - r * 0.3} ${cy + r * 0.5}Q${cx} ${cy + r * 0.78} ${cx + r * 0.3} ${cy + r * 0.5}`} fill="none" {...line} />
        </>
      );
    }
    // The family cat.
    case 'cat': {
      const r = w * 0.3;
      const cy = h * 0.58;
      return (
        <>
          <path d={`M${cx - w * 0.4} ${h + 2}C${cx - w * 0.38} ${cy + r * 0.8} ${cx + w * 0.38} ${cy + r * 0.8} ${cx + w * 0.4} ${h + 2}z`} fill={PAPER} {...line} />
          <path d={`M${cx - r * 0.98} ${cy - r * 0.2}L${cx - r * 0.86} ${cy - r * 1.3}L${cx - r * 0.18} ${cy - r * 0.78}z`} fill={PAPER} {...line} />
          <path d={`M${cx + r * 0.98} ${cy - r * 0.2}L${cx + r * 0.86} ${cy - r * 1.3}L${cx + r * 0.18} ${cy - r * 0.78}z`} fill={PAPER} {...line} />
          <ellipse cx={cx} cy={cy} rx={r * 1.05} ry={r * 0.9} fill={PAPER} {...line} />
          <path d={`M${cx - r * 0.72} ${cy - r * 0.66}L${cx - r * 0.72} ${cy - r * 1.02}M${cx + r * 0.72} ${cy - r * 0.66}L${cx + r * 0.72} ${cy - r * 1.02}`} {...line} />
          <ellipse cx={cx - r * 0.4} cy={cy - r * 0.05} rx={r * 0.11} ry={r * 0.16} fill={INK} />
          <ellipse cx={cx + r * 0.4} cy={cy - r * 0.05} rx={r * 0.11} ry={r * 0.16} fill={INK} />
          <path d={`M${cx - r * 0.13} ${cy + r * 0.24}h${r * 0.26}l${-r * 0.13} ${r * 0.14}z`} fill="var(--color-pink)" {...line} strokeWidth={sw * 0.7} />
        </>
      );
    }
    // The teen crush, 1998: curtains (center part), a smouldering look, a leather jacket.
    case 'idol': {
      const r = w * 0.24;
      const cy = h * 0.47;
      const bodyTop = cy + r * 1.05;
      return (
        <>
          <ellipse cx={cx} cy={cy - r * 0.12} rx={r * 1.16} ry={r * 1.12} fill={INK} />
          <rect x={cx - r * 0.36} y={cy + r * 0.5} width={r * 0.72} height={r} fill={SKIN.girl} {...line} />
          <path d={`M${cx - w * 0.52} ${h + 2}C${cx - w * 0.5} ${bodyTop} ${cx - r * 0.9} ${bodyTop} ${cx} ${bodyTop}S${cx + w * 0.5} ${bodyTop} ${cx + w * 0.52} ${h + 2}z`} fill={PAPER} {...line} />
          {/* Jacket panels over the white tee. */}
          <path d={`M${cx - w * 0.52} ${h + 2}C${cx - w * 0.5} ${bodyTop + r * 0.1} ${cx - r * 0.9} ${bodyTop} ${cx - r * 0.5} ${bodyTop}L${cx - r * 0.3} ${h + 2}z`} fill={INK} />
          <path d={`M${cx + w * 0.52} ${h + 2}C${cx + w * 0.5} ${bodyTop + r * 0.1} ${cx + r * 0.9} ${bodyTop} ${cx + r * 0.5} ${bodyTop}L${cx + r * 0.3} ${h + 2}z`} fill={INK} />
          <circle cx={cx} cy={cy} r={r} fill={SKIN.girl} {...line} />
          {/* Curtains: two swoops from a center part. */}
          <path
            d={`M${cx} ${cy - r * 1.04}C${cx - r * 0.55} ${cy - r * 1.08} ${cx - r * 1.1} ${cy - r * 0.78} ${cx - r * 1.06} ${cy + r * 0.2}C${cx - r * 0.86} ${cy - r * 0.18} ${cx - r * 0.6} ${cy - r * 0.32} ${cx - r * 0.3} ${cy - r * 0.5}C${cx - r * 0.14} ${cy - r * 0.64} ${cx - r * 0.05} ${cy - r * 0.84} ${cx} ${cy - r * 1.04}z`}
            fill={INK}
            {...line}
          />
          <path
            d={`M${cx} ${cy - r * 1.04}C${cx + r * 0.55} ${cy - r * 1.08} ${cx + r * 1.1} ${cy - r * 0.78} ${cx + r * 1.06} ${cy + r * 0.2}C${cx + r * 0.86} ${cy - r * 0.18} ${cx + r * 0.6} ${cy - r * 0.32} ${cx + r * 0.3} ${cy - r * 0.5}C${cx + r * 0.14} ${cy - r * 0.64} ${cx + r * 0.05} ${cy - r * 0.84} ${cx} ${cy - r * 1.04}z`}
            fill={INK}
            {...line}
          />
          {/* Heavy lids: the smoulder. */}
          <circle cx={cx - r * 0.38} cy={cy + r * 0.2} r={r * 0.1} fill={INK} />
          <circle cx={cx + r * 0.38} cy={cy + r * 0.2} r={r * 0.1} fill={INK} />
          <path d={`M${cx - r * 0.6} ${cy + r * 0.1}L${cx - r * 0.18} ${cy + r * 0.12}M${cx + r * 0.18} ${cy + r * 0.12}L${cx + r * 0.6} ${cy + r * 0.1}`} fill="none" {...line} />
          <circle cx={cx - r * 0.62} cy={cy + r * 0.48} r={r * 0.15} fill={BLUSH} />
          <circle cx={cx + r * 0.62} cy={cy + r * 0.48} r={r * 0.15} fill={BLUSH} />
          <path d={`M${cx - r * 0.26} ${cy + r * 0.6}Q${cx + r * 0.05} ${cy + r * 0.76} ${cx + r * 0.34} ${cy + r * 0.52}`} fill="none" {...line} />
        </>
      );
    }
    // "Who's that?": a selfie of somebody, messy bun, big grin (drawn blurred by the scene).
    case 'me': {
      const r = w * 0.26;
      const cy = h * 0.5;
      return (
        <>
          <circle cx={cx + r * 0.2} cy={cy - r * 1.2} r={r * 0.5} fill={INK} {...line} />
          <path d={`M${cx - w * 0.46} ${h + 2}C${cx - w * 0.44} ${cy + r * 1.05} ${cx + w * 0.44} ${cy + r * 1.05} ${cx + w * 0.46} ${h + 2}z`} fill="var(--color-red)" {...line} />
          <circle cx={cx} cy={cy} r={r} fill={SKIN.mom} {...line} />
          <path
            d={`M${cx - r * 1.04} ${cy + r * 0.1}C${cx - r * 1.14} ${cy - r * 1.24} ${cx + r * 1.14} ${cy - r * 1.24} ${cx + r * 1.04} ${cy + r * 0.1}C${cx + r * 0.7} ${cy - r * 0.46} ${cx - r * 0.2} ${cy - r * 0.6} ${cx - r * 1.04} ${cy + r * 0.1}z`}
            fill={INK}
            {...line}
          />
          <circle cx={cx - r * 0.36} cy={cy + r * 0.12} r={r * 0.11} fill={INK} />
          <circle cx={cx + r * 0.36} cy={cy + r * 0.12} r={r * 0.11} fill={INK} />
          <path d={`M${cx - r * 0.42} ${cy + r * 0.42}Q${cx} ${cy + r * 0.95} ${cx + r * 0.42} ${cy + r * 0.42}z`} fill={PAPER} {...line} />
        </>
      );
    }
    // Body parts: an open hand, one outline around palm + fingers (stroke pass, then fill pass).
    case 'hand': {
      const p = w * 0.46;
      const top = h * 0.47;
      const fw = p * 0.2;
      // Splayed, so the fingers stay apart even as a tiny silhouette.
      const fingers: Array<[number, number, number]> = [
        [-0.36, 0.5, -17],
        [-0.12, 0.64, -6],
        [0.12, 0.68, 5],
        [0.36, 0.56, 16],
      ];
      const bx = cx - p * 0.4;
      const by = top + p * 0.66;
      const shapes = (
        <>
          <rect x={cx - p / 2} y={top} width={p} height={p} rx={p * 0.3} />
          <rect x={cx - p * 0.34} y={top + p * 0.6} width={p * 0.68} height={h} />
          {fingers.map(([dx, len, rot], i) => (
            <rect
              key={i}
              x={cx + dx * p - fw / 2}
              y={top + p * 0.25 - len * p}
              width={fw}
              height={len * p + p * 0.2}
              rx={fw / 2}
              transform={`rotate(${rot} ${cx + dx * p} ${top + p * 0.3})`}
            />
          ))}
          <rect x={bx - fw * 0.55} y={by - p * 0.62} width={fw * 1.1} height={p * 0.62 + fw * 0.5} rx={fw * 0.55} transform={`rotate(-42 ${bx} ${by})`} />
        </>
      );
      return (
        <>
          <g fill={SKIN.dad} stroke={INK} strokeWidth={Math.min(sw * 2, w * 0.05)} strokeLinejoin="round">
            {shapes}
          </g>
          <g fill={SKIN.dad}>{shapes}</g>
          <path d={`M${cx - p * 0.18} ${top + p * 0.72}Q${cx + p * 0.08} ${top + p * 0.5} ${cx + p * 0.3} ${top + p * 0.46}`} fill="none" {...line} strokeWidth={sw * 0.7} />
        </>
      );
    }
    // Body parts: an eye in extreme close-up (skin background).
    case 'eye': {
      const ew = w * 0.86;
      const cy = h * 0.52;
      const iris = ew * 0.21;
      return (
        <>
          <path d={`M${cx - ew * 0.42} ${cy - ew * 0.34}Q${cx} ${cy - ew * 0.56} ${cx + ew * 0.42} ${cy - ew * 0.3}`} fill="none" {...line} strokeWidth={sw * 2.2} />
          <path d={`M${cx - ew / 2} ${cy}Q${cx} ${cy - ew * 0.46} ${cx + ew / 2} ${cy}Q${cx} ${cy + ew * 0.4} ${cx - ew / 2} ${cy}z`} fill={PAPER} {...line} />
          <circle cx={cx} cy={cy} r={iris} fill="#6b8fd6" {...line} />
          <circle cx={cx} cy={cy} r={iris * 0.45} fill={INK} />
          <circle cx={cx + iris * 0.35} cy={cy - iris * 0.38} r={iris * 0.2} fill={PAPER} />
          <path
            d={[-0.34, -0.12, 0.12, 0.34].map((k) => `M${cx + ew * k} ${cy - ew * 0.2 + Math.abs(k) * ew * 0.18}l${k * ew * 0.12} ${-ew * 0.11}`).join('')}
            fill="none"
            {...line}
          />
        </>
      );
    }
    case 'landscape':
      return (
        <>
          <circle cx={w * 0.68} cy={h * 0.34} r={Math.min(w, h) * 0.16} fill={PAPER} {...line} />
          <path d={`M-2 ${h * 0.8}Q${w * 0.28} ${h * 0.44} ${w * 0.56} ${h * 0.76}T${w + 2} ${h * 0.64}V${h + 2}H-2z`} fill={INK} />
        </>
      );
    // "Anything goes": the shuffle arrows printed big (compact only).
    case 'shuffle': {
      const s = Math.min(w, h) / 24;
      return (
        <g transform={`translate(${cx - 12 * s} ${h / 2 - 12 * s}) scale(${s})`} fill="none" stroke={INK} strokeWidth={sw / s} strokeLinecap="round" strokeLinejoin="round">
          <path d="M3.5 7.2h2.7c2.1 0 3.4 1 4.5 2.8l2.6 4.2c1.1 1.8 2.4 2.8 4.5 2.8h2.6" />
          <path d="M3.5 16.8h2.7c1.5 0 2.6-.5 3.5-1.4M14.3 8.6c.9-.9 2-1.4 3.5-1.4h2.6" />
          <path d="m17.6 4.3 2.9 2.9-2.9 2.9M17.6 13.9l2.9 2.9-2.9 2.9" />
        </g>
      );
    }
  }
}

function starPath(cx: number, cy: number, outer: number, inner: number, n = 5) {
  const pts = Array.from({ length: n * 2 }, (_, i) => {
    const r = i % 2 ? inner : outer;
    const a = (Math.PI / n) * i - Math.PI / 2;
    return `${(cx + r * Math.cos(a)).toFixed(2)} ${(cy + r * Math.sin(a)).toFixed(2)}`;
  });
  return `M${pts.join('L')}z`;
}

interface PrintSpec {
  x: number;
  y: number;
  w: number;
  h: number;
  rotate?: number;
  subject: Subject;
  /** Photo background (defaults to the theme accent). */
  bg?: string;
  /** Out of focus (the "Who's that?" mode starts blurry). */
  blur?: boolean;
}

/** Masking tape across a print's top edge (translucent, jagged ends). */
function tapePoints(x: number, y: number, w: number, h: number): string {
  const j = h * 0.18;
  return [
    [x, y + j],
    [x + j, y],
    [x + w, y],
    [x + w - j, y + h * 0.35],
    [x + w, y + h * 0.7],
    [x + w - j * 0.6, y + h],
    [x + j * 0.5, y + h],
    [x, y + h * 0.6],
    [x + j, y + h * 0.3],
  ]
    .map((p) => `${p[0].toFixed(2)},${p[1].toFixed(2)}`)
    .join(' ');
}

/**
 * An instant print: white frame (a soft shadow, no outline), thicker bottom margin, subject
 * clipped to the photo. `silhouette` draws the subject as one flat ink shape (tiny sizes);
 * `tape` sticks it down with masking tape.
 */
function Print({ spec, accent, id, sw, tape, silhouette, blur }: { spec: PrintSpec; accent: string; id: string; sw: Strokes; tape?: boolean; silhouette?: string; blur?: string }) {
  const { x, y, w, h, rotate = 0 } = spec;
  const m = Math.max(2.5, w * 0.1);
  const pw = w - m * 2;
  const ph = h - m - m * 2.2;
  const clip = `${id}-clip`;
  const tw = w * 0.56;
  return (
    <g transform={`rotate(${rotate} ${x + w / 2} ${y + h / 2})`}>
      {/* A soft paper shadow, then the white print (a hairline edge keeps it crisp when small). */}
      <rect x={x + 0.6} y={y + sw.frame * 0.6} width={w} height={h} rx={0.6} fill="rgb(40 25 10 / 0.2)" />
      <rect x={x} y={y} width={w} height={h} rx={0.6} fill={PAPER} stroke="rgb(23 19 15 / 0.22)" strokeWidth={sw.frame * 0.22} />
      <clipPath id={clip}>
        <rect x={x + m} y={y + m} width={pw} height={ph} />
      </clipPath>
      <g clipPath={`url(#${clip})`}>
        <rect x={x + m} y={y + m} width={pw} height={ph} fill={spec.bg ?? accent} />
        <g filter={spec.blur && blur ? `url(#${blur})` : undefined}>
          <g transform={`translate(${x + m} ${y + m})`} filter={silhouette ? `url(#${silhouette})` : undefined}>
            {subjectShape(spec.subject, pw, ph, sw.line, spec.bg ?? accent)}
          </g>
        </g>
        {/* An old print's vignette. */}
        <rect x={x + m} y={y + m} width={pw} height={ph} fill={`url(#${id}-vig)`} />
      </g>
      <radialGradient id={`${id}-vig`} cx="50%" cy="46%" r="65%">
        <stop offset="60%" stopColor="rgb(42 20 4)" stopOpacity="0" />
        <stop offset="100%" stopColor="rgb(42 20 4)" stopOpacity="0.22" />
      </radialGradient>
      <rect x={x + m} y={y + m} width={pw} height={ph} fill="none" stroke="rgb(23 19 15 / 0.35)" strokeWidth={sw.edge} />
      {tape && <polygon points={tapePoints(x + (w - tw) / 2, y - 3.2, tw, 6.4)} fill="rgb(238 226 186 / 0.88)" />}
    </g>
  );
}

/** A torn scrap of halftone paper (the strip glued behind the prints), deterministic per theme. */
function Scrap({ x, y, w, h, rotate, fill, seed }: { x: number; y: number; w: number; h: number; rotate: number; fill: string; seed: string }) {
  const r = rng(hash(seed));
  const pts: string[] = [];
  const step = 3.2;
  const jag = (a: number) => (r() - 0.35) * a;
  for (let px = 0; px < w; px += step) pts.push(`${(x + px).toFixed(2)},${(y + jag(1.6)).toFixed(2)}`);
  for (let py = 0; py < h; py += step) pts.push(`${(x + w - jag(1.2)).toFixed(2)},${(y + py).toFixed(2)}`);
  for (let px = w; px > 0; px -= step) pts.push(`${(x + px).toFixed(2)},${(y + h - jag(1.6)).toFixed(2)}`);
  for (let py = h; py > 0; py -= step) pts.push(`${(x + jag(1.2)).toFixed(2)},${(y + py).toFixed(2)}`);
  return (
    <g transform={`rotate(${rotate} ${x + w / 2} ${y + h / 2})`}>
      <polygon points={pts.join(' ')} fill="#f7f1e4" transform="translate(0 0.9)" opacity={0.9} />
      <polygon points={pts.join(' ')} fill={fill} />
    </g>
  );
}

/** A heart sticker slapped on the print: this is the one somebody picked. */
function heartPath(cx: number, cy: number, k: number) {
  const p = (x: number, y: number) => `${(cx + x * k).toFixed(2)} ${(cy + y * k).toFixed(2)}`;
  return `M${p(0, 8)}C${p(-2, 6.6)} ${p(-9, 2.4)} ${p(-9, -2.2)}C${p(-9, -5.4)} ${p(-6.6, -7.6)} ${p(-4, -7.6)}C${p(-2.2, -7.6)} ${p(-0.8, -6.6)} ${p(0, -5.2)}C${p(0.8, -6.6)} ${p(2.2, -7.6)} ${p(4, -7.6)}C${p(6.6, -7.6)} ${p(9, -5.4)} ${p(9, -2.2)}C${p(9, 2.4)} ${p(2, 6.6)} ${p(0, 8)}z`;
}

/** A sticker (star, heart): the shape with a white die-cut border and a soft shadow, no ink outline. */
function Sticker({ d, fill, rotate, cx, cy }: { d: string; fill: string; rotate: number; cx: number; cy: number }) {
  return (
    <g transform={`rotate(${rotate} ${cx} ${cy})`}>
      <path d={d} fill="rgb(40 25 10 / 0.22)" stroke="rgb(40 25 10 / 0.22)" strokeWidth={4} strokeLinejoin="round" transform="translate(0.4 1.2)" />
      <path d={d} fill={fill} stroke="#fff" strokeWidth={2.6} strokeLinejoin="round" paintOrder="stroke" />
    </g>
  );
}

/**
 * The phone of "Camera-roll roulette": the gallery grid on screen, the last shot (bottom right)
 * circled in red marker.
 */
function Phone({ x, y, w, h, rotate, sw, compact }: { x: number; y: number; w: number; h: number; rotate: number; sw: Strokes; compact?: boolean }) {
  const pad = w * 0.09;
  const top = h * 0.12;
  const sx = x + pad;
  const sy = y + top;
  const swd = w - pad * 2;
  const sh = h - top - h * 0.1;
  const cols = 3;
  const rows = compact ? 3 : 4;
  const gap = swd * 0.05;
  const tw = (swd - gap * (cols + 1)) / cols;
  const th = Math.min(tw, (sh - gap * (rows + 1)) / rows);
  const tones = ['sky', 'pink', 'yellow', 'mint', 'tangerine', 'lilac', 'pink', 'yellow', 'sky', 'mint', 'lilac', 'tangerine'];
  const cells = Array.from({ length: rows * cols }, (_, i) => ({ c: i % cols, r: Math.floor(i / cols), tone: tones[i % tones.length] }));
  const last = cells[cells.length - 1];
  const lx = sx + gap + last.c * (tw + gap) + tw / 2;
  const ly = sy + gap + last.r * (th + gap) + th / 2;
  return (
    <g transform={`rotate(${rotate} ${x + w / 2} ${y + h / 2})`}>
      <rect x={x + 0.6} y={y + 1.4} width={w} height={h} rx={w * 0.16} fill="rgb(40 25 10 / 0.25)" />
      <rect x={x} y={y} width={w} height={h} rx={w * 0.16} fill={INK} />
      <rect x={sx} y={sy} width={swd} height={sh} rx={w * 0.04} fill="#f7f1e4" />
      <rect x={x + w / 2 - w * 0.14} y={y + top * 0.36} width={w * 0.28} height={top * 0.26} rx={top * 0.13} fill="#3b3228" />
      {cells.map(({ c, r, tone }, i) => (
        <rect key={i} x={sx + gap + c * (tw + gap)} y={sy + gap + r * (th + gap)} width={tw} height={th} rx={0.5} fill={`var(--color-${tone})`} />
      ))}
      <ellipse cx={lx} cy={ly} rx={tw * 0.82} ry={th * 0.8} fill="none" stroke="var(--color-red)" strokeWidth={sw.line * 1.15} strokeLinecap="round" transform={`rotate(-12 ${lx} ${ly})`} strokeDasharray={`${tw * 4.3} ${tw * 0.5}`} />
    </g>
  );
}

/** A red marker question mark scribbled on top of the art. */
function MarkerQuestion({ x, y, s, width }: { x: number; y: number; s: number; width: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s}) rotate(10)`} fill="none" stroke="var(--color-red)" strokeLinecap="round" strokeLinejoin="round">
      <path d="M-5 -6C-5 -11 5 -12 5 -6C5 -2 0 -1.5 0 3" strokeWidth={width / s} />
      <circle cx="0" cy="8.4" r="0.6" fill="var(--color-red)" strokeWidth={(width * 1.1) / s} />
    </g>
  );
}

/** A magnifying glass sticker (the "Body parts" mode zooms in). */
function Magnifier({ cx, cy, r, rotate }: { cx: number; cy: number; r: number; rotate: number }) {
  return (
    <g transform={`rotate(${rotate} ${cx} ${cy})`}>
      <rect x={cx - r * 0.22} y={cy + r * 0.95} width={r * 0.44} height={r * 1.25} rx={r * 0.18} fill="rgb(40 25 10 / 0.22)" transform="translate(0.5 1.2)" />
      <circle cx={cx} cy={cy} r={r} fill="rgb(40 25 10 / 0.18)" transform="translate(0.5 1.2)" />
      <rect x={cx - r * 0.22} y={cy + r * 0.95} width={r * 0.44} height={r * 1.25} rx={r * 0.18} fill="var(--color-red)" stroke={INK} strokeWidth={1} />
      <circle cx={cx} cy={cy} r={r} fill="rgb(222 240 255 / 0.4)" stroke={INK} strokeWidth={r * 0.26} />
      <path d={`M${cx - r * 0.5} ${cy - r * 0.2}Q${cx - r * 0.45} ${cy - r * 0.5} ${cx - r * 0.15} ${cy - r * 0.55}`} fill="none" stroke="#fff" strokeWidth={r * 0.14} strokeLinecap="round" />
    </g>
  );
}

interface Scene {
  prints: PrintSpec[];
  extra?: ReactNode;
}

/** The halftone strip behind each theme's prints: a contrasting paper, so the white prints pop. */
const SCRAP_TONE: Record<Theme, string> = {
  parents: 'blue',
  family: 'pink',
  childhood: 'blue',
  pick: 'yellow',
  roll: 'pink',
  crush: 'yellow',
  whois: 'pink',
  body: 'blue',
  mix: 'pink',
};

const SCENES: Record<Theme, Scene> = {
  parents: {
    // Dad's print lands on top of Mom's.
    prints: [
      { x: 29, y: 13, w: 31, h: 39, rotate: 8, subject: 'mom' },
      { x: 4, y: 11, w: 31, h: 39, rotate: -10, subject: 'dad' },
    ],
  },
  family: {
    prints: [
      { x: 1.5, y: 27, w: 21, h: 26, rotate: -13, subject: 'girl' },
      { x: 41.5, y: 30, w: 21, h: 26, rotate: 12, subject: 'cat' },
      { x: 16, y: 7, w: 32, h: 40, rotate: -2, subject: 'mom' },
    ],
  },
  childhood: {
    prints: [{ x: 12, y: 11, w: 36, h: 44, rotate: -6, subject: 'kid' }],
    extra: <Sticker d={starPath(50, 15, 10, 4.4)} fill="var(--color-yellow)" rotate={12} cx={50} cy={15} />,
  },
  pick: {
    prints: [{ x: 4, y: 12, w: 48, h: 42, rotate: -5, subject: 'landscape' }],
    extra: <Sticker d={heartPath(49, 14, 1.12)} fill="var(--color-pink)" rotate={14} cx={49} cy={14} />,
  },
  // The phone's gallery, the last shot popping out of it as a print.
  roll: {
    prints: [{ x: 31, y: 7, w: 28, h: 34, rotate: 11, subject: 'cat', bg: 'var(--color-tangerine)' }],
    extra: <Phone x={6} y={9} w={27} h={47} rotate={-9} sw={FULL} />,
  },
  // A teen-magazine poster of the heartthrob, hearts slapped all over it.
  crush: {
    prints: [{ x: 13, y: 9, w: 37, h: 46, rotate: -4, subject: 'idol', bg: 'var(--color-pink)' }],
    extra: (
      <>
        <Sticker d={heartPath(52, 14, 1.05)} fill="var(--color-red)" rotate={16} cx={52} cy={14} />
        <Sticker d={heartPath(11, 47, 0.72)} fill="var(--color-pink)" rotate={-18} cx={11} cy={47} />
      </>
    ),
  },
  // An out-of-focus selfie with a big red "?" on it.
  whois: {
    prints: [{ x: 12, y: 10, w: 37, h: 45, rotate: -5, subject: 'me', blur: true }],
    extra: <MarkerQuestion x={46} y={18} s={1} width={3} />,
  },
  // Close-ups: an eye behind, a hand in front, a magnifying glass.
  body: {
    prints: [
      { x: 30, y: 6, w: 28, h: 32, rotate: 12, subject: 'eye', bg: SKIN.girl },
      { x: 5, y: 15, w: 31, h: 39, rotate: -8, subject: 'hand' },
    ],
    extra: <Magnifier cx={47} cy={44} r={7.5} rotate={-38} />,
  },
  mix: {
    prints: [
      { x: 5, y: 13, w: 25, h: 31, rotate: -20, subject: 'kid' },
      { x: 34, y: 13, w: 25, h: 31, rotate: 20, subject: 'landscape' },
      { x: 19.5, y: 7, w: 25, h: 31, rotate: 0, subject: 'dad' },
    ],
    extra: (
      <g>
        <circle cx="32" cy="51.2" r="10.5" fill="rgb(40 25 10 / 0.22)" />
        <circle cx="32" cy="50" r="10.5" fill="var(--color-yellow)" stroke="#fff" strokeWidth={2} />
        <g fill="none" stroke={INK} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <path d="M25.6 46.4h1.6c1.5 0 2.4.7 3.2 2l1.8 3.1c.8 1.3 1.7 2 3.2 2h2.4" />
          <path d="M25.6 53.6h1.6c1.1 0 1.9-.4 2.5-1M33.9 47.4c.6-.6 1.4-1 2.5-1h2.4" />
          <path d="m36.9 44.5 2.1 1.9-2.1 1.9M36.9 51.6l2.1 1.9-2.1 1.9" />
        </g>
      </g>
    ),
  },
};

/** Small sizes: one print, one big subject, no badges. */
const COMPACT_SUBJECT: Record<Theme, Subject> = {
  parents: 'dad',
  family: 'girl',
  childhood: 'kid',
  pick: 'landscape',
  roll: 'landscape',
  crush: 'idol',
  whois: 'me',
  body: 'hand',
  mix: 'shuffle',
};
/** Compact drawings that are not a single print (they replace it), or a mark on top of it. */
const COMPACT_EXTRA: Partial<Record<Theme, { replace?: boolean; node: ReactNode }>> = {
  roll: { replace: true, node: <Phone x={14} y={3} w={34} h={58} rotate={-7} sw={COMPACT} compact /> },
  whois: { node: <MarkerQuestion x={45} y={17} s={1.25} width={4.2} /> },
  crush: { node: <Sticker d={heartPath(51, 13, 1)} fill="var(--color-red)" rotate={14} cx={51} cy={13} /> },
};
const COMPACT_PRINT = { x: 8, y: 4, w: 48, h: 56, rotate: -4 };

export interface ThemeArtProps {
  theme: Theme;
  className?: string;
  /** Accessible name; decorative (aria-hidden) without it. */
  label?: string;
  /**
   * Force the compact drawing (one print, bigger subject, heavier strokes). By default it is
   * picked from the rendered width: compact under 48px.
   */
  compact?: boolean;
}

/** `size-N` in a class list → px (Tailwind's 4px spacing scale), for the first render. */
function guessWidth(className?: string): number | null {
  const m = className?.match(/(?:^|\s)size-(\d+(?:\.\d+)?)(?:\s|$)/);
  return m ? Number(m[1]) * 4 : null;
}

/**
 * A mini collage per game theme: white prints taped on a torn halftone scrap, ink-drawn
 * subjects on the theme accent (or a phone, for the camera roll), a sticker (star, heart, magnifying
 * glass, a marker "?") slapped on top:
 * <ThemeArt theme="childhood" className="size-16" />. Under 48px it switches to a compact
 * drawing automatically (or force it with `compact`): one print, the subject as a flat ink
 * silhouette, a corner of the scrap.
 */
export function ThemeArt({ theme, className, label, compact }: ThemeArtProps) {
  const uid = useId().replace(/:/g, '');
  const ref = useRef<SVGSVGElement>(null);
  const [small, setSmall] = useState(() => (guessWidth(className) ?? 64) < COMPACT_BELOW);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || compact !== undefined) return;
    // Layout width (ignores transforms, so a card scaling in does not flip it).
    const measure = () => {
      const w = parseFloat(getComputedStyle(el).width);
      if (w > 0) setSmall(w < COMPACT_BELOW);
    };
    measure();
    if (typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [compact]);

  const isCompact = compact ?? small;
  const accent = themeColor(theme);
  const compactExtra = COMPACT_EXTRA[theme];
  const scene: Scene = isCompact
    ? {
        prints: compactExtra?.replace ? [] : [{ ...COMPACT_PRINT, subject: COMPACT_SUBJECT[theme] }],
        extra: compactExtra?.node,
      }
    : SCENES[theme];
  const sw = isCompact ? COMPACT : FULL;
  const tone = SCRAP_TONE[theme];
  const dots = tone === 'blue' ? 'rgb(255 255 255 / 0.22)' : 'rgb(23 19 15 / 0.14)';
  return (
    <svg
      ref={ref}
      viewBox="0 0 64 64"
      width="64"
      height="64"
      className={cn('inline-block shrink-0 overflow-visible', className)}
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    >
      <defs>
        <pattern id={`${uid}-ht`} width="3" height="3" patternUnits="userSpaceOnUse">
          <rect width="3" height="3" fill={`var(--color-${tone})`} />
          <circle cx="1.5" cy="1.5" r="0.62" fill={dots} />
        </pattern>
        {/* Tiny sizes: the subject as one flat ink silhouette (details would be mush). */}
        <filter id={`${uid}-blur`} x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation={isCompact ? 0 : 1.5} />
        </filter>
        <filter id={`${uid}-sil`} x="0" y="0" width="100%" height="100%">
          <feFlood floodColor="#17130f" floodOpacity="0.88" />
          <feComposite in2="SourceAlpha" operator="in" />
        </filter>
      </defs>
      {isCompact ? (
        <Scrap x={14} y={30} w={50} h={30} rotate={9} fill={`url(#${uid}-ht)`} seed={`${theme}-c`} />
      ) : (
        <Scrap x={0} y={22} w={64} h={25} rotate={-7} fill={`url(#${uid}-ht)`} seed={theme} />
      )}
      {scene.prints.map((p, i) => (
        <Print
          key={i}
          spec={p}
          accent={accent}
          id={`${uid}-${i}`}
          sw={sw}
          tape={!isCompact && i === scene.prints.length - 1}
          silhouette={isCompact && p.subject !== 'shuffle' ? `${uid}-sil` : undefined}
          blur={`${uid}-blur`}
        />
      ))}
      {scene.extra}
    </svg>
  );
}
