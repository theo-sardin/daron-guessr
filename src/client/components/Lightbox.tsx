import { AnimatePresence, motion } from 'motion/react';
import { useRef } from 'react';
import { createPortal } from 'react-dom';
import { useI18n, type Lang } from '../i18n';
import { Icon } from './Icon';
import { useDialogFocus } from './paper/dialog';
import { RoundButton } from './RoundButton';
import { Tape } from './Tape';

/** Fallback description of the photo (kept here: only the lightbox needs it). */
const PHOTO_ALT: Record<Lang, string> = { fr: 'La photo en grand', en: 'The photo, full size' };

/**
 * Full-screen photo viewer: the print taped on a dark table, a round close button taped to its
 * corner. A modal dialog: focus moves to the close button, Tab stays inside, Escape, the close
 * button or a tap anywhere closes it, and focus returns to the photo that opened it.
 * `alt` describes the photo (default: the caption, or "the photo, full size").
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
          className="fixed inset-0 z-[90] flex cursor-zoom-out items-center justify-center bg-ink/90 p-4 pt-10 outline-none backdrop-blur-[2px]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.figure
            className="relative m-0 flex max-w-full flex-col items-center bg-[linear-gradient(160deg,#fffefa,#f5f1e6)] p-2.5 pb-2 shadow-paper-lg sm:p-3.5"
            initial={{ scale: 0.85, rotate: -4, y: 20 }}
            animate={{ scale: 1, rotate: -1, y: 0 }}
            exit={{ scale: 0.92, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 26 }}
          >
            <img src={src} alt={description} className="block max-h-[74dvh] max-w-full object-contain" />
            {caption ? (
              <figcaption className="text-pen mt-1.5 -rotate-[1.5deg] px-2 text-center text-3xl" aria-hidden>
                {caption}
              </figcaption>
            ) : (
              <span className="h-4" />
            )}
            <Tape width={96} height={28} rotate={3} className="-top-3.5 left-1/2 -translate-x-1/2" />
            {/* Close: a round paper button taped over the print's top right corner. */}
            <span className="absolute -top-5 -right-3 z-20">
              <RoundButton
                label={t('common.close')}
                tilt={6}
                data-autofocus
                onClick={(e) => {
                  e.stopPropagation();
                  onClose();
                }}
              >
                <Icon name="x" weight="bold" className="size-5" />
              </RoundButton>
              <Tape tone="yellow" width={34} height={14} rotate={-38} className="-top-1 -left-2" />
            </span>
          </motion.figure>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
