import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useRef, useState } from 'react';
import { REACTION_EMOJIS, type ReactionEmoji } from '../../shared/protocol';
import { useT } from '../i18n';
import { sfx } from '../lib/sfx';
import { api, getState, onReaction, playersById } from '../lib/store';
import { cn, vibrate } from '../lib/util';
import { paperColor } from './Avatar';
import { Icon } from './Icon';
import { Tape } from './Tape';
import { TornPaper } from './TornPaper';

interface Floating {
  key: string;
  emoji: string;
  name?: string;
  color?: string;
  x: number;
  drift: number;
  scale: number;
  tilt: number;
}

const MAX_FLOATING = 40;

/** Renders everybody's reactions as emoji stickers floating up the screen, with a name tag. */
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
          tilt: (Math.random() - 0.5) * 24,
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
            initial={{ y: 40, opacity: 0, scale: 0.4, rotate: i.tilt * 2 }}
            animate={{ y: '-75vh', x: [0, i.drift * 0.5, i.drift, i.drift * 0.4], opacity: [0, 1, 1, 0], scale: i.scale, rotate: i.tilt }}
            exit={{ opacity: 0 }}
            transition={{ duration: 3, ease: 'easeOut', times: [0, 0.15, 0.75, 1] }}
          >
            <span className="emoji text-5xl drop-shadow-[0_3px_3px_rgb(40_25_10/0.3)]">{i.emoji}</span>
            {i.name && (
              <span
                className="mt-0.5 max-w-24 truncate px-1.5 py-0.5 text-[11px] leading-none font-extrabold text-ink shadow-paper-sm"
                style={{ backgroundColor: paperColor(i.color), rotate: `${-i.tilt * 0.5}deg` }}
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
 * Floating 😂 button (a yellow round sticker) that opens a torn paper tray of reactions.
 * Sits in the BottomBar's lane (which reserves room for it on phones) so it never covers content.
 */
export function ReactionBar({ className, defaultOpen = false }: { className?: string; /** Start with the tray open (dev gallery). */ defaultOpen?: boolean }) {
  const t = useT();
  const [open, setOpen] = useState(defaultOpen);
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
    <div className={cn('fixed right-3 z-[56] flex flex-col items-end gap-3 sm:right-5', className)} style={{ bottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}>
      <AnimatePresence>
        {open && (
          <motion.div
            className="relative"
            initial={{ opacity: 0, scale: 0.6, y: 20, rotate: 6, originX: 1, originY: 1 }}
            animate={{ opacity: 1, scale: 1, y: 0, rotate: -1.5 }}
            exit={{ opacity: 0, scale: 0.6, y: 20, rotate: 6 }}
            transition={{ type: 'spring', stiffness: 500, damping: 28 }}
          >
            <TornPaper surface="grain" edges="tblr" amp={3} lift="lg" className="grid grid-cols-5 gap-0.5 p-2.5">
              {REACTION_EMOJIS.map((e) => (
                <motion.button
                  key={e}
                  type="button"
                  whileHover={{ scale: 1.15, rotate: -6 }}
                  whileTap={{ scale: 1.5, rotate: 12 }}
                  onClick={() => send(e)}
                  className="emoji flex size-11 items-center justify-center rounded-full text-[1.7rem]"
                  aria-label={e}
                >
                  {e}
                </motion.button>
              ))}
            </TornPaper>
            <Tape tone="yellow" width={54} height={18} rotate={-8} className="-top-2 left-5" />
          </motion.div>
        )}
      </AnimatePresence>
      <motion.button
        type="button"
        whileHover={{ rotate: -14, scale: 1.04 }}
        whileTap={{ scale: 0.88 }}
        animate={open ? { rotate: 12 } : { rotate: -8 }}
        onClick={() => {
          sfx.play('click');
          setOpen((o) => !o);
        }}
        aria-label={t('common.sendReaction')}
        aria-expanded={open}
        className="emoji flex size-[60px] items-center justify-center rounded-full bg-yellow text-[31px] text-ink"
        style={{ boxShadow: 'inset 0 0 0 2.5px var(--color-ink), 0 3px 0 var(--color-ink), 0 8px 14px -4px rgb(40 25 10 / 0.4)' }}
      >
        {open ? <Icon name="x" className="size-6" weight="bold" /> : '😂'}
      </motion.button>
    </div>
  );
}
