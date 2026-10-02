import { AnimatePresence, motion } from 'motion/react';
import { useId, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useT } from '../i18n';
import { useDialogFocus } from '../lib/dialog';
import { cn } from '../lib/util';
import { Button } from './Button';

/**
 * A sticker card over the page (bottom sheet on phones, centered on desktop). Escape or a tap
 * outside closes it. Focus moves into it (first control, or an element with `data-autofocus`),
 * Tab stays inside, and focus returns to the trigger when it closes; the title names the dialog,
 * or pass `ariaLabel` when there is no title.
 */
export function Modal({
  open,
  onClose,
  title,
  children,
  className,
  ariaLabel,
}: {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  children?: ReactNode;
  className?: string;
  /** Accessible name when there is no `title`. */
  ariaLabel?: string;
}) {
  const titleId = useId();
  const dialog = useRef<HTMLDivElement>(null);
  useDialogFocus(open, dialog, onClose);

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[80] flex items-end justify-center bg-grape-950/70 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] backdrop-blur-sm sm:items-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            ref={dialog}
            role="dialog"
            aria-modal="true"
            aria-labelledby={title ? titleId : undefined}
            aria-label={title ? undefined : ariaLabel}
            tabIndex={-1}
            className={cn('sticker max-h-[85dvh] w-full max-w-md overflow-y-auto p-6 outline-none', className)}
            initial={{ y: 60, scale: 0.9, opacity: 0 }}
            animate={{ y: 0, scale: 1, opacity: 1 }}
            exit={{ y: 40, scale: 0.95, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 420, damping: 30 }}
            onClick={(e) => e.stopPropagation()}
          >
            {title && (
              <h2 id={titleId} className="mb-3 font-display text-2xl">
                {title}
              </h2>
            )}
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}

export function ConfirmDialog({
  open,
  title,
  body,
  confirmLabel,
  danger,
  loading,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: ReactNode;
  body?: ReactNode;
  confirmLabel?: string;
  danger?: boolean;
  /** Shows a spinner on the confirm button and disables both buttons. */
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const t = useT();
  return (
    <Modal open={open} onClose={onCancel} title={title}>
      {body && <div className="mb-5 text-ink-soft">{body}</div>}
      <div className="flex gap-3">
        <Button variant="secondary" block onClick={onCancel} disabled={loading}>
          {t('common.cancel')}
        </Button>
        <Button variant={danger ? 'danger' : 'primary'} block onClick={onConfirm} loading={loading}>
          {confirmLabel ?? t('common.confirm')}
        </Button>
      </div>
    </Modal>
  );
}
