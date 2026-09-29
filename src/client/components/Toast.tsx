import { AnimatePresence, motion } from 'motion/react';
import { useSyncExternalStore } from 'react';
import { cn } from '../lib/util';
import { Icon, type IconName } from './Icon';

export type ToastKind = 'info' | 'success' | 'error';
interface ToastItem {
  id: number;
  message: string;
  kind: ToastKind;
  icon?: IconName;
  emoji?: string;
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

/** Shows a short message at the top of the screen. */
export function toast(message: string, kind: ToastKind = 'info', opts: ToastOptions = {}) {
  const id = nextId++;
  items = [...items.filter((t) => t.message !== message), { id, message, kind, icon: opts.icon, emoji: opts.emoji }].slice(-3);
  emit();
  window.setTimeout(() => {
    items = items.filter((t) => t.id !== id);
    emit();
  }, opts.durationMs ?? 3200);
}

const KIND_STYLE: Record<ToastKind, { box: string; badge: string }> = {
  info: { box: 'bg-cream text-ink', badge: 'bg-sun text-ink' },
  success: { box: 'bg-cream text-ink', badge: 'bg-mint text-ink' },
  error: { box: 'bg-danger text-white', badge: 'bg-white text-danger-dark' },
};

/** Success / error toasts get a default icon so they never read as a neutral note. */
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
    <div className="pointer-events-none fixed inset-x-0 top-[calc(max(0.5rem,env(safe-area-inset-top))_+_3.75rem)] z-[70] flex flex-col items-center gap-2 px-4" aria-live="polite">
      <AnimatePresence>
        {list.map((t) => {
          const style = KIND_STYLE[t.kind];
          const icon = t.icon ?? (t.emoji ? undefined : DEFAULT_ICON[t.kind]);
          return (
            <motion.div
              key={t.id}
              layout
              initial={{ opacity: 0, y: -20, scale: 0.9, rotate: -2 }}
              animate={{ opacity: 1, y: 0, scale: 1, rotate: 0 }}
              exit={{ opacity: 0, y: -12, scale: 0.95 }}
              transition={{ type: 'spring', stiffness: 520, damping: 30 }}
              className={cn(
                'pointer-events-auto flex max-w-sm items-center gap-2.5 rounded-2xl border-3 border-ink py-2 pr-4 pl-2 font-bold shadow-pop-sm',
                !icon && !t.emoji && 'pl-4',
                style.box,
              )}
            >
              {icon ? (
                <span className={cn('flex size-8 shrink-0 items-center justify-center rounded-xl border-2 border-ink', style.badge)}>
                  <Icon name={icon} className="size-[1.1rem]" strokeWidth={2.6} />
                </span>
              ) : (
                t.emoji && <span className="flex size-8 shrink-0 items-center justify-center text-xl leading-none">{t.emoji}</span>
              )}
              <span className="leading-snug">{t.message}</span>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
