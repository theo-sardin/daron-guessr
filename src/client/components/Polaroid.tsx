import { motion, type HTMLMotionProps } from 'motion/react';
import { useState, type ReactNode } from 'react';
import { cn } from '../lib/util';

export interface PolaroidProps extends Omit<HTMLMotionProps<'figure'>, 'children'> {
  src: string;
  alt?: string;
  /** Handwritten-style caption under the photo. */
  caption?: ReactNode;
  /** Tilt in degrees. */
  tilt?: number;
  /** Tailwind classes for the image box aspect/size (default: square). */
  imageClassName?: string;
  /** Optional overlay rendered on top of the photo (stamps, badges…). */
  overlay?: ReactNode;
  onOpen?: () => void;
}

/**
 * A photo in a white instant-camera frame with a strip of tape. The photo fades in once
 * loaded so slow networks show a pleasant placeholder instead of a broken image.
 */
export function Polaroid({ src, alt = '', caption, tilt = 0, imageClassName, overlay, onOpen, className, ...rest }: PolaroidProps) {
  const [loaded, setLoaded] = useState(false);
  return (
    <motion.figure
      style={{ rotate: tilt }}
      className={cn('relative m-0 inline-block rounded-md border-3 border-ink bg-white p-2.5 pb-3 text-ink shadow-pop', className)}
      {...rest}
    >
      <span className="absolute -top-3 left-1/2 h-6 w-20 -translate-x-1/2 rotate-[-3deg] rounded-sm bg-sun/80 shadow-sm" aria-hidden />
      <div
        className={cn('relative overflow-hidden rounded-sm bg-grape-200/40', imageClassName ?? 'aspect-square w-full', onOpen && 'cursor-zoom-in')}
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
        {!loaded && <div className="absolute inset-0 animate-pulse bg-gradient-to-br from-grape-200/60 to-pink/20" />}
        <img
          src={src}
          alt={alt}
          draggable={false}
          onLoad={() => setLoaded(true)}
          className={cn('h-full w-full object-cover transition-opacity duration-300', loaded ? 'opacity-100' : 'opacity-0')}
        />
        {overlay}
      </div>
      {caption && <figcaption className="mt-2 text-center font-display text-lg leading-tight">{caption}</figcaption>}
    </motion.figure>
  );
}
