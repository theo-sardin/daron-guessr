import { AnimatePresence, motion } from 'motion/react';
import { useRef } from 'react';
import { createPortal } from 'react-dom';
import { useI18n, type Lang } from '../i18n';
import { useDialogFocus } from '../lib/dialog';

/** Fallback description of the photo (kept here: only the lightbox needs it). */
const PHOTO_ALT: Record<Lang, string> = { fr: 'La photo en grand', en: 'The photo, full size' };

/**
 * Full-screen photo viewer. A modal dialog: focus moves to the close button, Tab stays inside,
 * and Escape, the close button or a tap anywhere closes it (focus returns to the photo that
 * opened it). `alt` describes the photo (default: the caption, or "the photo, full size").
 */
export function Lightbox({ src, onClose, caption, alt }: { src: string | null; onClose: () => void; caption?: string; alt?: string }) {
  const { t, lang } = useI18n();
  const dialog = useRef<HTMLDivElement>(null);
  useDialogFocus(!!src, dialog, onClose);
  const description = alt ?? caption ?? PHOTO_ALT[lang];

  return createPortal(
    <AnimatePresence>
      {src && (
        <motion.div
          ref={dialog}
          role="dialog"
          aria-modal="true"
          aria-label={description}
          tabIndex={-1}
          className="fixed inset-0 z-[90] flex cursor-zoom-out flex-col items-center justify-center gap-3 bg-grape-950/90 p-4 outline-none backdrop-blur"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <button
            type="button"
            data-autofocus
            onClick={onClose}
            aria-label={t('common.close')}
            className="absolute top-[max(0.75rem,env(safe-area-inset-top))] right-3 flex size-11 items-center justify-center rounded-full border-3 border-ink bg-cream font-display text-xl text-ink shadow-pop-sm"
          >
            ✕
          </button>
          <motion.img
            src={src}
            alt={description}
            className="max-h-[85dvh] max-w-full rounded-xl border-4 border-white object-contain shadow-2xl"
            initial={{ scale: 0.85, rotate: -3 }}
            animate={{ scale: 1, rotate: 0 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 26 }}
          />
          {caption && (
            <p className="font-display text-xl text-cream" aria-hidden>
              {caption}
            </p>
          )}
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
