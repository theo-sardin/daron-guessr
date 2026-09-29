import { AnimatePresence, motion } from 'motion/react';
import { cn } from '../../lib/util';

/** Validation message under a field: a small red sticker that pops in (readable on any card color). */
export function FieldError({ id, message, className }: { id?: string; message: string | null; className?: string }) {
  return (
    <AnimatePresence initial={false}>
      {message && (
        <motion.div
          key="field-error"
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.2 }}
          className={cn('overflow-hidden', className)}
        >
          <motion.p
            id={id}
            role="alert"
            key={message}
            initial={{ scale: 0.85, rotate: -2 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: 'spring', stiffness: 600, damping: 16 }}
            className="mt-2.5 inline-flex max-w-full items-start gap-1.5 rounded-xl border-2 border-ink bg-danger px-3 py-1.5 text-sm leading-snug font-extrabold text-white shadow-pop-sm"
          >
            <span aria-hidden>⚠️</span>
            <span>{message}</span>
          </motion.p>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
