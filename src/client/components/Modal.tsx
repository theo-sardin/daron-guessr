import { AnimatePresence, motion } from 'motion/react';
import { useId, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useT } from '../i18n';
import { cn } from '../lib/util';
import { Button } from './Button';
import { useDialogFocus } from './paper/dialog';
import { Tape } from './Tape';

/**
 * A sheet of paper taped over the page (bottom sheet on phones, centered on desktop).
 * Escape or a tap outside closes it. Focus moves into it (first control, or an element with
 * `data-autofocus`), Tab stays inside, and focus returns to the trigger when it closes; the
 * title names the dialog (aria-labelledby), or pass `ariaLabel` when there is no title.
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
          className="fixed inset-0 z-[80] flex items-end justify-center bg-ink/55 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] backdrop-blur-[2px] sm:items-center"
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
            className="relative w-full max-w-md outline-none"
            initial={{ y: 70, rotate: -4, opacity: 0 }}
            animate={{ y: 0, rotate: -0.8, opacity: 1 }}
            exit={{ y: 50, rotate: 2, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 420, damping: 30 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={cn('paper-sheet-grain max-h-[85dvh] overflow-y-auto rounded-[3px] p-6 pt-7 text-ink shadow-paper-lg', className)}>
              {title && (
                <h2 id={titleId} className="mb-3 font-display text-[1.6rem] leading-[1.05]">
                  {title}
                </h2>
              )}
              {children}
            </div>
            <Tape width={92} height={26} rotate={-3} animate delay={0.1} className="-top-3 left-1/2 -translate-x-1/2" />
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
      {body && <div className="mb-6 font-medium text-ink-soft">{body}</div>}
      <div className="flex gap-4">
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
