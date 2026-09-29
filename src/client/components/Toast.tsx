import { AnimatePresence, motion } from 'motion/react';
import { useSyncExternalStore } from 'react';
import { cn } from '../lib/util';

export type ToastKind = 'info' | 'success' | 'error';
interface ToastItem {
  id: number;
  message: string;
  kind: ToastKind;
  emoji?: string;
}

let items: ToastItem[] = [];
let nextId = 1;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

/** Shows a short message at the top of the screen. */
export function toast(message: string, kind: ToastKind = 'info', opts: { emoji?: string; durationMs?: number } = {}) {
  const id = nextId++;
  items = [...items.filter((t) => t.message !== message), { id, message, kind, emoji: opts.emoji }].slice(-3);
  emit();
  window.setTimeout(() => {
    items = items.filter((t) => t.id !== id);
    emit();
  }, opts.durationMs ?? 3200);
}

const KIND_STYLE: Record<ToastKind, string> = {
  info: 'bg-cream text-ink',
  success: 'bg-mint text-ink',
  error: 'bg-danger text-white',
};

export function Toaster() {
  const list = useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => items,
  );
  return (
    <div className="pointer-events-none fixed inset-x-0 top-16 z-[70] flex flex-col items-center gap-2 px-4" aria-live="polite">
      <AnimatePresence>
        {list.map((t) => (
          <motion.div
            key={t.id}
            layout
            initial={{ opacity: 0, y: -20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -12, scale: 0.95 }}
            className={cn('pointer-events-auto flex max-w-sm items-center gap-2 rounded-2xl border-3 border-ink px-4 py-2.5 font-bold shadow-pop-sm', KIND_STYLE[t.kind])}
          >
            {t.emoji && <span className="text-xl">{t.emoji}</span>}
            <span>{t.message}</span>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
