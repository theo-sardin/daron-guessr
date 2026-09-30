import { AnimatePresence, motion } from 'motion/react';
import { useSyncExternalStore } from 'react';
import { cn } from '../lib/util';
import type { IconName } from './Icon';
import { IconBadge, type IconBadgeTone } from './IconBadge';
import { Tape, type TapeTone } from './Tape';

export type ToastKind = 'info' | 'success' | 'error';
interface ToastItem {
  id: number;
  message: string;
  kind: ToastKind;
  icon?: IconName;
  emoji?: string;
  /** Tilt, alternating so a stack of notes looks stuck on by hand. */
  tilt: number;
}

export interface ToastOptions {
  /** Icon from the game's set (preferred). */
  icon?: IconName;
  /** An emoji instead of an icon: keep it for player avatars / reactions. */
  emoji?: string;
  durationMs?: number;
}

let items: ToastItem[] = [];
let nextId = 1;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

/** Shows a short note stuck at the top of the screen. */
export function toast(message: string, kind: ToastKind = 'info', opts: ToastOptions = {}) {
  const id = nextId++;
  const tilt = [-1.6, 1.2, -0.8, 1.8][id % 4];
  items = [...items.filter((t) => t.message !== message), { id, message, kind, icon: opts.icon, emoji: opts.emoji, tilt }].slice(-3);
  emit();
  window.setTimeout(() => {
    items = items.filter((t) => t.id !== id);
    emit();
  }, opts.durationMs ?? 3200);
}

/** Paper, text color, icon scrap and tape of each kind of note. */
const KIND_STYLE: Record<ToastKind, { paper: string; badge: IconBadgeTone; tape: TapeTone }> = {
  info: { paper: 'paper-sheet-grain text-ink', badge: 'sun', tape: 'cream' },
  success: { paper: 'paper-mint text-ink', badge: 'cream', tape: 'yellow' },
  error: { paper: 'paper-red text-white', badge: 'cream', tape: 'cream' },
};

/** Success / error notes get a default icon so they never read as a neutral note. */
const DEFAULT_ICON: Partial<Record<ToastKind, IconName>> = { success: 'check', error: 'alert' };

export function Toaster() {
  const list = useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => items,
  );
  return (
    <div className="pointer-events-none fixed inset-x-0 top-[calc(max(0.5rem,env(safe-area-inset-top))_+_4.25rem)] z-[70] flex flex-col items-center gap-3 px-4" aria-live="polite">
      <AnimatePresence>
        {list.map((t) => {
          const style = KIND_STYLE[t.kind];
          const icon = t.icon ?? (t.emoji ? undefined : DEFAULT_ICON[t.kind]);
          return (
            <motion.div
              key={t.id}
              layout
              initial={{ opacity: 0, y: -14, scale: 1.25, rotate: t.tilt * 4 }}
              animate={{ opacity: 1, y: 0, scale: 1, rotate: t.tilt }}
              exit={{ opacity: 0, y: -18, rotate: t.tilt * 3, transition: { duration: 0.18 } }}
              transition={{ type: 'spring', stiffness: 520, damping: 24 }}
              className="pointer-events-auto relative max-w-sm"
            >
              <div className={cn('flex items-center gap-2.5 py-2.5 pr-4 pl-2.5 font-bold shadow-paper', !icon && !t.emoji && 'pl-4', style.paper)}>
                {icon ? (
                  <IconBadge name={icon} tone={style.badge} size="sm" tilt={-4} />
                ) : (
                  t.emoji && <span className="emoji flex size-8 shrink-0 items-center justify-center text-2xl leading-none">{t.emoji}</span>
                )}
                <span className="leading-snug">{t.message}</span>
              </div>
              <Tape tone={style.tape} width={48} height={17} rotate={t.tilt > 0 ? -6 : 5} className="-top-2 left-1/2 -translate-x-1/2" />
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
