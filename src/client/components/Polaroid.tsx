import { motion, type HTMLMotionProps } from 'motion/react';
import { useState, type ReactNode } from 'react';
import { cn } from '../lib/util';
import { Tape, type TapeTone } from './Tape';
import { rel } from './paper/cls';

export interface PolaroidProps extends Omit<HTMLMotionProps<'figure'>, 'children'> {
  src: string;
  alt?: string;
  /** Handwritten caption under the photo (blue ballpoint). */
  caption?: ReactNode;
  /** Tilt in degrees. */
  tilt?: number;
  /** Tailwind classes for the image box aspect/size (default: square, full width). */
  imageClassName?: string;
  /** Classes of the caption line (e.g. a size). */
  captionClassName?: string;
  /** Optional overlay rendered on top of the photo (stamps, badges…). */
  overlay?: ReactNode;
  onOpen?: () => void;
  /** Masking tape on the top edge: true (cream) or a tape color (default none). */
  tape?: boolean | TapeTone;
  /** A soft vignette on the photo, like an old print (default true). */
  vintage?: boolean;
  /** @deprecated No-op (the viewfinder brackets are gone). */
  viewfinder?: boolean | string;
  /** @deprecated No-op (the camera date imprints are gone). */
  dateStamp?: string;
}

/**
 * A photo in a white instant-print frame, pinned with masking tape, a handwritten caption in
 * blue ballpoint underneath. The photo fades in once loaded (paper-colored placeholder before).
 */
export function Polaroid({
  src,
  alt = '',
  caption,
  tilt = 0,
  imageClassName,
  captionClassName,
  overlay,
  onOpen,
  tape = false,
  vintage = true,
  viewfinder: _viewfinder,
  dateStamp: _dateStamp,
  className,
  ...rest
}: PolaroidProps) {
  const [loaded, setLoaded] = useState(false);
  const tapeTone: TapeTone | null = tape === true ? 'cream' : tape || null;
  return (
    <motion.figure
      style={{ rotate: tilt }}
      className={cn(
        rel(className),
        'm-0 inline-block bg-[linear-gradient(160deg,#fffefa,#f5f1e6)] p-[9px] pb-2 text-ink shadow-paper',
        className,
      )}
      {...rest}
    >
      {tapeTone && <Tape tone={tapeTone} width={84} height={24} rotate={tilt > 0 ? -4 : 3} className="-top-3 left-1/2 -translate-x-1/2" />}
      <div
        className={cn('relative overflow-hidden bg-paper-dark', imageClassName ?? 'aspect-square w-full', onOpen && 'cursor-zoom-in')}
        onClick={onOpen}
        role={onOpen ? 'button' : undefined}
        tabIndex={onOpen ? 0 : undefined}
        aria-label={onOpen ? alt || (typeof caption === 'string' ? caption : undefined) : undefined}
        onKeyDown={
          onOpen
            ? (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onOpen();
                }
              }
            : undefined
        }
      >
        {!loaded && <div className="absolute inset-0 animate-pulse bg-[linear-gradient(135deg,var(--color-paper-dark),var(--color-kraft))] opacity-60" />}
        <img
          src={src}
          alt={alt}
          draggable={false}
          onLoad={() => setLoaded(true)}
          className={cn('h-full w-full object-cover transition-opacity duration-300', loaded ? 'opacity-100' : 'opacity-0')}
        />
        {/* Print edge + a soft vignette, like an old print. */}
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            boxShadow: 'inset 0 0 0 1px rgb(0 0 0 / 0.1)',
            background: vintage ? 'radial-gradient(ellipse at 50% 46%, transparent 58%, rgb(42 20 4 / 0.22) 100%)' : undefined,
          }}
        />
        {overlay}
      </div>
      {caption && (
        <figcaption className={cn('text-pen mt-1.5 -rotate-[1.5deg] text-center text-[1.4rem] leading-[1.02]', captionClassName)}>{caption}</figcaption>
      )}
    </motion.figure>
  );
}
