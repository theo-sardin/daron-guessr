import { motion } from 'motion/react';
import { AVATARS } from '../../shared/protocol';
import { sfx } from '../lib/sfx';
import { cn } from '../lib/util';
import { paperColor } from './Avatar';
import { MarkerCircle } from './Marker';

/** Grid of emoji stickers; the picked one gets the player's paper color and a marker loop. */
export function AvatarPicker({
  value,
  onChange,
  color = '#ffd23f',
  className,
}: {
  value: string;
  onChange: (avatar: string) => void;
  color?: string;
  className?: string;
}) {
  return (
    <div className={cn('grid grid-cols-6 gap-2 sm:grid-cols-8', className)} role="radiogroup">
      {AVATARS.map((a, i) => {
        const selected = a === value;
        return (
          <motion.button
            key={a}
            type="button"
            role="radio"
            aria-checked={selected}
            aria-label={a}
            whileTap={{ scale: 0.85 }}
            animate={selected ? { scale: 1.08, rotate: [0, -10, 6, 0] } : { scale: 1, rotate: 0 }}
            onClick={() => {
              sfx.play('pop');
              onChange(a);
            }}
            className="flex aspect-square min-h-11 items-center justify-center"
          >
            <MarkerCircle show={selected} pad={4} strokeWidth={2.8} seed={i} className="flex size-full items-center justify-center">
              <span
                className={cn('emoji flex aspect-square w-[88%] items-center justify-center rounded-full text-2xl transition-colors sm:text-3xl', !selected && 'hover:bg-ink/5')}
                style={
                  selected
                    ? { backgroundColor: paperColor(color), border: '3px solid #fff', boxShadow: '0 1px 1px rgb(40 25 10 / 0.25), 0 3px 7px -2px rgb(40 25 10 / 0.35)' }
                    : { backgroundColor: 'rgb(23 19 15 / 0.05)' }
                }
              >
                {a}
              </span>
            </MarkerCircle>
          </motion.button>
        );
      })}
    </div>
  );
}
