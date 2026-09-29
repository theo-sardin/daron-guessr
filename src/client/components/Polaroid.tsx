import { motion, type HTMLMotionProps } from 'motion/react';
import { useState, type ReactNode } from 'react';
import { cn } from '../lib/util';
import { Stamp } from './Stamp';
import { Viewfinder } from './Viewfinder';

export interface PolaroidProps extends Omit<HTMLMotionProps<'figure'>, 'children'> {
  src: string;
  alt?: string;
  /** Handwritten caption under the photo (Caveat). */
  caption?: ReactNode;
  /** Tilt in degrees. */
  tilt?: number;
  /** Tailwind classes for the image box aspect/size (default: square). */
  imageClassName?: string;
  /** Optional overlay rendered on top of the photo (stamps, badges…). */
  overlay?: ReactNode;
  onOpen?: () => void;
  /** Viewfinder brackets over the photo (true, or a bracket color). Snaps in on mount. */
  viewfinder?: boolean | string;
  /**
   * Orange date imprint in the photo's bottom-right corner. Give each print its own date:
   * `dateStamp={fakeDateStamp(photo.id)}` (from Stamp). With `viewfinder` it moves inside the brackets.
   */
  dateStamp?: string;
  /**
   * A strip of tape on the top edge (default off). One taped print per screen at most: it is a
   * garnish, not the frame.
   */
  tape?: boolean;
}

/** Bracket geometry when `viewfinder` is on (px). The date stamp tucks inside it. */
const VF = { inset: 10, length: 22, thickness: 3.5 };

/**
 * A photo in a white instant-camera frame, handwritten caption underneath. The photo fades in
 * once loaded so slow networks show a pleasant placeholder instead of a broken image.
 */
export function Polaroid({
  src,
  alt = '',
  caption,
  tilt = 0,
  imageClassName,
  overlay,
  onOpen,
  viewfinder,
  dateStamp,
  tape = false,
  className,
  ...rest
}: PolaroidProps) {
  const [loaded, setLoaded] = useState(false);
  return (
    <motion.figure
      style={{ rotate: tilt }}
      className={cn('relative m-0 inline-block rounded-md border-3 border-ink bg-white p-2.5 pb-3 text-ink shadow-pop', className)}
      {...rest}
    >
      {tape && (
        <span
          className="absolute -top-3 left-1/2 z-10 h-6 w-20 -translate-x-1/2 rotate-[-3deg] rounded-[3px] bg-sun/80 shadow-sm [mask-image:linear-gradient(90deg,transparent_0,black_4px,black_calc(100%-4px),transparent_100%)]"
          aria-hidden
        />
      )}
      <div
        className={cn('relative overflow-hidden rounded-sm bg-grape-200/40', imageClassName ?? 'aspect-square w-full', onOpen && 'cursor-zoom-in')}
        onClick={onOpen}
      >
        {!loaded && <div className="absolute inset-0 animate-pulse bg-gradient-to-br from-grape-200/60 to-pink/20" />}
        <img
          src={src}
          alt={alt}
          draggable={false}
          onLoad={() => setLoaded(true)}
          className={cn('h-full w-full object-cover transition-opacity duration-300', loaded ? 'opacity-100' : 'opacity-0')}
        />
        {viewfinder && (
          <Viewfinder
            className="pointer-events-none absolute inset-0"
            color={typeof viewfinder === 'string' ? viewfinder : '#ffffff'}
            gap={-VF.inset}
            length={VF.length}
            thickness={VF.thickness}
            snap
            shadow
          />
        )}
        {dateStamp && (
          <span
            className="pointer-events-none absolute leading-none"
            // Inside the frame: clear of the bottom-right bracket (arm + 6px) when there is one.
            style={viewfinder ? { right: VF.inset + VF.length + 6, bottom: VF.inset + 1 } : { right: 8, bottom: 7 }}
            aria-hidden
          >
            <Stamp size="xs" valueClassName="stamp-on-photo">
              {dateStamp}
            </Stamp>
          </span>
        )}
        {overlay}
      </div>
      {caption && <figcaption className="text-hand mt-1.5 text-center text-2xl leading-[1.05] text-ink">{caption}</figcaption>}
    </motion.figure>
  );
}
