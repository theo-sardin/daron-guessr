import { motion, type HTMLMotionProps } from 'motion/react';
import { cloneElement, forwardRef, Fragment, isValidElement, useLayoutEffect, useRef, type ReactNode } from 'react';
import { sfx } from '../lib/sfx';
import { cn } from '../lib/util';
import { Icon } from './Icon';
import { rel } from './paper/cls';
import { useTornClip } from './paper/hooks';
import { textOf } from './paper/text';
import { Spinner } from './Spinner';
import { Tape } from './Tape';

/**
 * primary: a black paper strip on a torn red shadow, wide caps, a hand-drawn yellow arrow.
 * secondary: a kraft paper strip. outline: a round outlined pill (sheet + ink ring).
 * sun / mint / sky / danger: torn strips of post-it yellow / mint / sky / marker red paper.
 * ghost: ink text only (tertiary actions).
 *
 * Arrows: the hand-drawn arrow AFTER the label is the only forward arrow of the game.
 *   <Button arrow>Continuer</Button>          "continue" actions (default on primary lg / xl)
 *   <Button icon={<Icon name="upload" />}>    `icon` is for LEADING pictograms (upload, link…)
 *   <Button iconEnd={<Icon name="trophy" />}> a trailing pictogram
 * An `arrow-right` <Icon> passed through `icon` or `children` is turned into the hand-drawn
 * arrow (with a warning in dev), so old calls never show two arrows.
 *
 * States: `loading` keeps the button's colors (spinner + a slightly dimmed label, no press);
 * `disabled` becomes a dashed pencil outline with an ink-soft label (no red shadow, no arrow).
 */
export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'sun' | 'mint' | 'sky' | 'danger' | 'ghost';
export type ButtonSize = 'sm' | 'md' | 'lg' | 'xl';

interface SizeSpec {
  h: number;
  text: number;
  px: number;
  gap: number;
  arrow: [number, number];
  /** Offsets of the red shadow (top, right, bottom, left), px. */
  back: [number, number, number, number];
}

const SIZES: Record<ButtonSize, SizeSpec> = {
  sm: { h: 44, text: 15, px: 14, gap: 7, arrow: [26, 15], back: [4, -3, -5, 5] },
  md: { h: 52, text: 16.5, px: 16, gap: 8, arrow: [30, 17], back: [5, -4, -6, 6] },
  lg: { h: 60, text: 18.5, px: 22, gap: 10, arrow: [34, 19], back: [6, -5, -7, 7] },
  xl: { h: 68, text: 21, px: 26, gap: 12, arrow: [40, 22], back: [6, -5, -7, 7] },
};

/** Torn paper strips: surface class, text color, rotation. */
const STRIP: Partial<Record<ButtonVariant, { surface: string; text: string; tilt: number }>> = {
  secondary: { surface: 'paper-kraft', text: 'text-ink', tilt: 0.6 },
  sun: { surface: 'paper-postit', text: 'text-ink', tilt: -0.6 },
  mint: { surface: 'paper-mint', text: 'text-ink', tilt: 0.5 },
  sky: { surface: 'paper-sky', text: 'text-ink', tilt: -0.5 },
  danger: { surface: 'paper-red', text: 'text-white', tilt: -0.6 },
};

export interface ButtonProps extends Omit<HTMLMotionProps<'button'>, 'children'> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  /** A leading pictogram (upload, link, camera…). Not for forward arrows: use `arrow`. */
  icon?: ReactNode;
  /** A trailing pictogram (e.g. a trophy), before the hand-drawn arrow if any. */
  iconEnd?: ReactNode;
  block?: boolean;
  /** The hand-drawn arrow after the label (default: primary lg / xl without an icon). */
  arrow?: boolean;
  /** Masking tape on the corners (primary and paper strips; default false). */
  tape?: boolean;
  /** Play the click sound (default true). */
  sound?: boolean;
  children?: ReactNode;
}

/** The yellow ballpoint arrow of the main buttons. */
export function HandArrow({ className, color = 'var(--color-yellow)', width = 40, height = 22 }: { className?: string; color?: string; width?: number; height?: number }) {
  return (
    <svg viewBox="0 0 40 22" width={width} height={height} className={cn('shrink-0 overflow-visible', className)} aria-hidden>
      <path d="M2 12 C12 9, 24 13, 36 10" stroke={color} strokeWidth="3.4" fill="none" strokeLinecap="round" />
      <path d="M27 3 L37 10 L28 18" stroke={color} strokeWidth="3.4" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/* ------------------------------------------------------------ arrows */

const isArrowIcon = (node: ReactNode): boolean => isValidElement(node) && node.type === Icon && (node.props as { name?: string }).name === 'arrow-right';

/**
 * Removes `arrow-right` icons from a label (top level, or inside a wrapping span / fragment up
 * to two levels deep). Returns the cleaned label and whether an arrow was found.
 */
function stripArrows(node: ReactNode, depth = 0): [ReactNode, boolean] {
  if (isArrowIcon(node)) return [null, true];
  if (Array.isArray(node)) {
    let found = false;
    const out = node.map((c) => {
      const [x, f] = stripArrows(c, depth);
      found ||= f;
      return x;
    });
    return [found ? out : node, found];
  }
  if (depth < 2 && isValidElement(node) && (typeof node.type === 'string' || node.type === Fragment)) {
    const kids = (node.props as { children?: ReactNode }).children;
    if (kids !== undefined) {
      const [c, f] = stripArrows(kids, depth + 1);
      if (f) return [cloneElement(node, undefined, ...(Array.isArray(c) ? c : [c])), true];
    }
  }
  return [node, false];
}

const warned = new Set<string>();

/* ----------------------------------------------------------- fitting */

/**
 * Keeps a label on one line inside its button: when it overflows (a long translation, a narrow
 * half-width button), it first condenses (Archivo's width axis), then shrinks a little; an
 * ellipsis is the last resort. Measures only when the label text, the size or the available
 * width change (one ResizeObserver per button, one fonts.ready).
 */
function useFitLabel(labelKey: string, baseStretch: number, basePx: number) {
  const ref = useRef<HTMLSpanElement>(null);
  const last = useRef({ key: '', width: -1 });
  const fitRef = useRef<(force?: boolean) => void>(() => undefined);
  const key = `${labelKey}|${baseStretch}|${basePx}`;

  fitRef.current = (force = false) => {
    const el = ref.current;
    if (!el) return;
    // clientWidth is the label's slot (min-w-0 flex item), independent of its own font size.
    const avail = el.clientWidth;
    if (!force && last.current.key === key && Math.abs(last.current.width - avail) < 0.5) return;
    last.current = { key, width: avail };
    el.style.fontStretch = '';
    el.style.fontSize = '';
    if (el.scrollWidth <= avail + 0.5) return;
    el.style.fontStretch = `${Math.max(72, Math.floor((baseStretch * avail) / el.scrollWidth - 1))}%`;
    if (el.scrollWidth > avail + 0.5) el.style.fontSize = `${Math.max(basePx * 0.8, (basePx * avail) / el.scrollWidth - 0.2).toFixed(1)}px`;
    last.current.width = el.clientWidth;
  };

  useLayoutEffect(() => {
    fitRef.current();
  }, [key]);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    let alive = true;
    void document.fonts?.ready.then(() => alive && fitRef.current(true));
    if (typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(() => fitRef.current());
    ro.observe(el);
    return () => {
      alive = false;
      ro.disconnect();
    };
  }, []);
  return ref;
}

/**
 * A torn paper layer placed by `place` inside its (positioned) parent. `lift` puts the paper
 * shadow on a static wrapper of this layer only (not on the whole button and its label).
 */
function TornLayer({ surface, place, style, edges, amp, lift }: { surface: string; place: string; style?: React.CSSProperties; edges: string; amp: number; lift?: boolean }) {
  const [ref, clip] = useTornClip<HTMLSpanElement>({ edges, amp, step: 7 });
  const layer = <span ref={ref} aria-hidden className={cn('pointer-events-none absolute', lift ? 'inset-0' : place, surface)} style={{ ...(lift ? null : style), clipPath: clip?.outer }} />;
  if (!lift) return layer;
  return (
    <span aria-hidden className={cn('lift-sm pointer-events-none absolute', place)} style={style}>
      {layer}
    </span>
  );
}

/**
 * A button made of paper. Pressing pushes the strip into its shadow.
 *   <Button size="xl" block>Créer un salon</Button>
 *   <Button variant="secondary">J'ai déjà un code</Button>
 */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'primary', size = 'md', loading, icon, iconEnd, block, arrow, tape = false, sound = true, className, children, disabled, onClick, type = 'button', style, ...rest },
  ref,
) {
  const s = SIZES[size];
  const strip = STRIP[variant];
  const primary = variant === 'primary';
  const off = !!disabled && !loading;
  const busy = !!loading;

  // Forward arrows passed as icons become the hand-drawn arrow.
  const iconIsArrow = isArrowIcon(icon);
  const [label, childArrow] = stripArrows(children);
  const labelText = textOf(label);
  if (import.meta.env.DEV && (iconIsArrow || childArrow) && !warned.has(labelText)) {
    warned.add(labelText);
    console.warn(`[Button] "${labelText}": pass \`arrow\` instead of an arrow-right Icon (${iconIsArrow ? 'icon' : 'children'}); it is drawn as the hand-drawn arrow.`);
  }
  const lead = iconIsArrow ? null : icon;
  const showArrow = !off && (arrow ?? (iconIsArrow || childArrow || (primary && (size === 'lg' || size === 'xl') && !lead)));
  const faceTilt = off ? 0 : primary ? -0.8 : (strip?.tilt ?? 0);
  const fitRef = useFitLabel(labelText, primary ? 118 : 100, s.text);

  const face = {
    rest: { x: 0, y: 0 },
    hover: primary ? { x: -1, y: -2 } : { y: -2 },
    tap: primary ? { x: 3, y: 4 } : { y: 2, scale: 0.98 },
  };

  const hasLabel = label !== undefined && label !== null && label !== false && label !== '';
  const content = (
    <>
      {busy ? <Spinner className={cn('shrink-0', size === 'sm' ? 'size-5' : 'size-6')} /> : lead}
      {hasLabel && (
        <span ref={fitRef} className={cn('min-w-0 truncate py-0.5 leading-[1.2]', busy && 'opacity-80')}>
          {label}
        </span>
      )}
      {iconEnd}
      {showArrow && <HandArrow width={s.arrow[0]} height={s.arrow[1]} color={primary ? 'var(--color-yellow)' : 'currentColor'} className="-mr-1 mt-0.5" />}
    </>
  );

  const textClass = off
    ? cn('font-extrabold text-ink-soft', primary && 'font-wide uppercase')
    : primary
      ? 'font-wide uppercase text-[#fff6e0]'
      : variant === 'ghost'
        ? 'font-extrabold text-ink underline decoration-2 underline-offset-4 decoration-ink/25 hover:decoration-red'
        : cn('font-extrabold tracking-[-0.01em]', strip?.text ?? 'text-ink');

  return (
    <motion.button
      ref={ref}
      type={type}
      disabled={off || busy}
      aria-busy={busy || undefined}
      initial="rest"
      animate="rest"
      whileHover={off || busy ? undefined : 'hover'}
      whileTap={off || busy ? undefined : 'tap'}
      onClick={(e) => {
        if (sound) sfx.play('click');
        onClick?.(e);
      }}
      className={cn(
        rel(className),
        'group inline-flex select-none items-center justify-center whitespace-nowrap',
        // Never wider than its container: a long label condenses instead (see useFitLabel).
        block ? 'w-full min-w-0' : 'max-w-full shrink-0',
        busy && 'cursor-progress!',
        className,
      )}
      style={{ height: s.h, minWidth: s.h, ...style }}
      {...rest}
    >
      {primary && !off && (
        <TornLayer surface="bg-red" place="" edges="tblr" amp={3} style={{ top: s.back[0], right: s.back[1], bottom: s.back[2], left: s.back[3], rotate: '1.6deg' }} />
      )}
      <motion.span
        variants={face}
        transition={{ type: 'spring', stiffness: 700, damping: 30 }}
        className={cn(
          'relative flex size-full items-center justify-center',
          variant === 'outline' && !off && 'rounded-full bg-sheet shadow-[inset_0_0_0_2.5px_var(--color-ink),0_1px_1px_rgb(40_25_10/0.2),0_4px_10px_-4px_rgb(40_25_10/0.35)]',
          // Disabled: an empty slot drawn in pencil, waiting for its button.
          off && variant !== 'ghost' && cn('border-2 border-dashed border-ink/45 bg-sheet/45', variant === 'outline' ? 'rounded-full' : 'rounded-[3px]'),
        )}
        style={{ rotate: faceTilt ? `${faceTilt}deg` : undefined, paddingInline: variant === 'ghost' ? 8 : s.px, gap: s.gap }}
      >
        {primary && !off && (
          <span aria-hidden className="absolute inset-0 bg-ink">
            <span className="absolute inset-0 opacity-[0.18] mix-blend-screen" style={{ backgroundImage: 'var(--noise)', backgroundSize: '240px 240px' }} />
          </span>
        )}
        {strip && !off && <TornLayer surface={strip.surface} place="inset-0" edges="tb" amp={2.6} lift />}
        <span className={cn('relative flex min-w-0 items-center justify-center leading-none', textClass)} style={{ fontSize: s.text, gap: s.gap }}>
          {content}
        </span>
      </motion.span>
      {tape && !off && (primary || strip) && (
        <>
          <Tape width={s.h * 0.85} height={20} rotate={-32} className="-top-2 -left-3" />
          <Tape width={s.h * 0.8} height={20} rotate={-28} className="-right-2.5" style={{ top: s.h * 0.62 }} />
        </>
      )}
    </motion.button>
  );
});
