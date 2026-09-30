import { motion, type HTMLMotionProps } from 'motion/react';
import { forwardRef, type ReactNode } from 'react';
import { sfx } from '../lib/sfx';
import { cn } from '../lib/util';
import { useTornClip } from './paper/hooks';
import { Spinner } from './Spinner';
import { Tape } from './Tape';
import { rel } from './paper/cls';

/**
 * primary: a black paper strip on a torn red shadow, wide caps, a hand-drawn yellow arrow.
 * secondary: a kraft paper strip. outline: a round outlined pill (sheet + ink ring).
 * sun / mint / sky / danger: torn strips of post-it yellow / mint / sky / marker red paper.
 * ghost: ink text only (tertiary actions).
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
  sm: { h: 44, text: 15, px: 16, gap: 7, arrow: [26, 15], back: [4, -3, -5, 5] },
  md: { h: 52, text: 16.5, px: 20, gap: 9, arrow: [30, 17], back: [5, -4, -6, 6] },
  lg: { h: 60, text: 18.5, px: 24, gap: 10, arrow: [34, 19], back: [6, -5, -7, 7] },
  xl: { h: 68, text: 21, px: 28, gap: 12, arrow: [40, 22], back: [6, -5, -7, 7] },
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
  icon?: ReactNode;
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

/** A torn layer that fills its (positioned) parent. */
function TornLayer({ className, style, edges, amp }: { className: string; style?: React.CSSProperties; edges: string; amp: number }) {
  const [ref, clip] = useTornClip<HTMLSpanElement>({ edges, amp, step: 7 });
  return <span ref={ref} aria-hidden className={cn('pointer-events-none absolute', className)} style={{ ...style, clipPath: clip?.outer }} />;
}

/**
 * A button made of paper. Pressing pushes the strip into its shadow.
 *   <Button size="xl" block>Créer un salon</Button>
 *   <Button variant="secondary">J'ai déjà un code</Button>
 */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'primary', size = 'md', loading, icon, block, arrow, tape = false, sound = true, className, children, disabled, onClick, type = 'button', style, ...rest },
  ref,
) {
  const isDisabled = disabled || loading;
  const s = SIZES[size];
  const strip = STRIP[variant];
  const primary = variant === 'primary';
  const showArrow = arrow ?? (primary && (size === 'lg' || size === 'xl') && !icon);
  const faceTilt = primary ? -0.8 : (strip?.tilt ?? 0);

  const face = {
    rest: { x: 0, y: 0 },
    hover: primary ? { x: -1, y: -2 } : { y: -2 },
    tap: primary ? { x: 3, y: 4 } : { y: 2, scale: 0.98 },
  };

  const label = (
    <>
      {loading ? <Spinner className={cn('shrink-0', size === 'sm' ? 'size-4' : 'size-5')} /> : icon}
      {children !== undefined && children !== null && children !== false && <span className={cn('min-w-0 truncate py-0.5 leading-[1.2]', loading && 'opacity-80')}>{children}</span>}
      {showArrow && <HandArrow width={s.arrow[0]} height={s.arrow[1]} color={primary ? 'var(--color-yellow)' : 'currentColor'} className="-mr-1 mt-0.5" />}
    </>
  );

  const textClass = primary
    ? 'font-wide uppercase text-[#fff6e0]'
    : variant === 'ghost'
      ? 'font-extrabold text-ink underline decoration-2 underline-offset-4 decoration-ink/25 hover:decoration-red'
      : cn('font-extrabold tracking-[-0.01em]', strip?.text ?? 'text-ink');

  return (
    <motion.button
      ref={ref}
      type={type}
      disabled={isDisabled}
      initial="rest"
      animate="rest"
      whileHover={isDisabled ? undefined : 'hover'}
      whileTap={isDisabled ? undefined : 'tap'}
      onClick={(e) => {
        if (sound) sfx.play('click');
        onClick?.(e);
      }}
      className={cn(
        rel(className),
        'group inline-flex select-none items-center justify-center whitespace-nowrap',
        strip && 'lift-sm',
        block ? 'w-full min-w-0' : 'shrink-0',
        isDisabled && 'opacity-50 saturate-50',
        className,
      )}
      style={{ height: s.h, minWidth: s.h, ...style }}
      {...rest}
    >
      {primary && (
        <TornLayer className="bg-red" edges="tblr" amp={3} style={{ top: s.back[0], right: s.back[1], bottom: s.back[2], left: s.back[3], rotate: '1.6deg' }} />
      )}
      <motion.span
        variants={face}
        transition={{ type: 'spring', stiffness: 700, damping: 30 }}
        className={cn('relative flex size-full items-center justify-center', variant === 'outline' && 'rounded-full bg-sheet shadow-[inset_0_0_0_2.5px_var(--color-ink),0_1px_1px_rgb(40_25_10/0.2),0_4px_10px_-4px_rgb(40_25_10/0.35)]')}
        style={{ rotate: faceTilt ? `${faceTilt}deg` : undefined, paddingInline: variant === 'ghost' ? 8 : s.px, gap: s.gap }}
      >
        {primary && (
          <span aria-hidden className="absolute inset-0 bg-ink">
            <span className="absolute inset-0 opacity-[0.18] mix-blend-screen" style={{ backgroundImage: 'var(--noise)', backgroundSize: '240px 240px' }} />
          </span>
        )}
        {strip && <TornLayer className={cn('inset-0', strip.surface)} edges="tb" amp={2.6} />}
        <span className={cn('relative flex min-w-0 items-center justify-center leading-none', textClass)} style={{ fontSize: s.text, gap: s.gap }}>
          {label}
        </span>
      </motion.span>
      {tape && (primary || strip) && (
        <>
          <Tape width={s.h * 0.85} height={20} rotate={-32} className="-top-2 -left-3" />
          <Tape width={s.h * 0.8} height={20} rotate={-28} className="-right-2.5" style={{ top: s.h * 0.62 }} />
        </>
      )}
    </motion.button>
  );
});
