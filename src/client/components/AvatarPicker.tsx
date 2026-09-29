import { motion } from 'motion/react';
import { AVATARS } from '../../shared/protocol';
import { sfx } from '../lib/sfx';
import { cn } from '../lib/util';

/** Grid of emoji avatars; `color` tints the selected one like the in-game avatar. */
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
      {AVATARS.map((a) => {
        const selected = a === value;
        return (
          <motion.button
            key={a}
            type="button"
            role="radio"
            aria-checked={selected}
            aria-label={a}
            whileTap={{ scale: 0.85 }}
            animate={selected ? { scale: 1.12, rotate: [0, -10, 10, 0] } : { scale: 1, rotate: 0 }}
            onClick={() => {
              sfx.play('pop');
              onChange(a);
            }}
            className={cn(
              'flex aspect-square items-center justify-center rounded-2xl border-2 text-2xl transition-colors sm:text-3xl',
              selected ? 'border-ink shadow-pop-sm' : 'border-transparent bg-ink/5 hover:bg-ink/10',
            )}
            style={selected ? { backgroundColor: color } : undefined}
          >
            {a}
          </motion.button>
        );
      })}
    </div>
  );
}
