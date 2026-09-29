import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useRef, useState } from 'react';
import { REACTION_EMOJIS, type ReactionEmoji } from '../../shared/protocol';
import { useT } from '../i18n';
import { sfx } from '../lib/sfx';
import { api, getState, onReaction, playersById } from '../lib/store';
import { cn, vibrate } from '../lib/util';

interface Floating {
  key: string;
  emoji: string;
  name?: string;
  color?: string;
  x: number;
  drift: number;
  scale: number;
}

const MAX_FLOATING = 40;

/** Renders everybody's reactions as emojis floating up the screen. */
export function ReactionsLayer() {
  const [items, setItems] = useState<Floating[]>([]);

  useEffect(
    () =>
      onReaction((r) => {
        const p = playersById(getState().view).get(r.playerId);
        const item: Floating = {
          key: r.id,
          emoji: r.emoji,
          name: p?.name,
          color: p?.color,
          x: 8 + Math.random() * 78,
          drift: (Math.random() - 0.5) * 80,
          scale: 0.9 + Math.random() * 0.6,
        };
        setItems((prev) => [...prev.slice(-(MAX_FLOATING - 1)), item]);
        window.setTimeout(() => setItems((prev) => prev.filter((i) => i.key !== item.key)), 3200);
      }),
    [],
  );

  return (
    <div className="pointer-events-none fixed inset-0 z-[55] overflow-hidden" aria-hidden>
      <AnimatePresence>
        {items.map((i) => (
          <motion.div
            key={i.key}
            className="absolute bottom-0 flex flex-col items-center"
            style={{ left: `${i.x}%` }}
            initial={{ y: 40, opacity: 0, scale: 0.4 }}
            animate={{ y: '-75vh', x: [0, i.drift * 0.5, i.drift, i.drift * 0.4], opacity: [0, 1, 1, 0], scale: i.scale }}
            exit={{ opacity: 0 }}
            transition={{ duration: 3, ease: 'easeOut', times: [0, 0.15, 0.75, 1] }}
          >
            <span className="text-5xl drop-shadow-[0_3px_0_rgba(27,16,54,0.6)]">{i.emoji}</span>
            {i.name && (
              <span
                className="mt-0.5 max-w-24 truncate rounded-full border-2 border-ink px-2 text-[11px] font-extrabold text-ink"
                style={{ backgroundColor: i.color ?? '#fff8ec' }}
              >
                {i.name}
              </span>
            )}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

/**
 * Floating 😂 button that opens a tray of reactions. Sits above screens' bottom bars.
 */
export function ReactionBar({ className }: { className?: string }) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const last = useRef(0);

  const send = (emoji: ReactionEmoji) => {
    const now = Date.now();
    if (now - last.current < 220) return;
    last.current = now;
    api.react(emoji);
    sfx.play('pop');
    vibrate(8);
  };

  return (
    <div className={cn('fixed right-3 bottom-24 z-[56] flex flex-col items-end gap-2 sm:right-5', className)}>
      <AnimatePresence>
        {open && (
          <motion.div
            className="grid grid-cols-5 gap-1 rounded-3xl border-3 border-ink bg-cream p-2 shadow-pop"
            initial={{ opacity: 0, scale: 0.6, y: 20, originX: 1, originY: 1 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.6, y: 20 }}
            transition={{ type: 'spring', stiffness: 500, damping: 30 }}
          >
            {REACTION_EMOJIS.map((e) => (
              <motion.button
                key={e}
                type="button"
                whileTap={{ scale: 1.5, rotate: 12 }}
                onClick={() => send(e)}
                className="flex size-11 items-center justify-center rounded-2xl text-2xl hover:bg-ink/10"
                aria-label={e}
              >
                {e}
              </motion.button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
      <motion.button
        type="button"
        whileTap={{ scale: 0.88 }}
        animate={open ? { rotate: 20 } : { rotate: 0 }}
        onClick={() => {
          sfx.play('click');
          setOpen((o) => !o);
        }}
        aria-label={t('common.sendReaction')}
        aria-expanded={open}
        className="flex size-14 items-center justify-center rounded-full border-3 border-ink bg-sun text-3xl shadow-pop"
      >
        {open ? '✕' : '😂'}
      </motion.button>
    </div>
  );
}
