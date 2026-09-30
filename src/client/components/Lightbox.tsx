import { AnimatePresence, motion } from 'motion/react';
import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Tape } from './Tape';

/** Full-screen photo viewer: the print taped on a dark table. Tap anywhere or press Escape to close. */
export function Lightbox({ src, onClose, caption }: { src: string | null; onClose: () => void; caption?: string }) {
  useEffect(() => {
    if (!src) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [src, onClose]);

  return createPortal(
    <AnimatePresence>
      {src && (
        <motion.div
          className="fixed inset-0 z-[90] flex cursor-zoom-out items-center justify-center bg-ink/90 p-4 backdrop-blur-[2px]"
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
            <img src={src} alt={caption ?? ''} className="block max-h-[78dvh] max-w-full object-contain" />
            {caption ? <figcaption className="text-pen mt-1.5 -rotate-[1.5deg] px-2 text-center text-3xl">{caption}</figcaption> : <span className="h-4" />}
            <Tape width={96} height={28} rotate={3} className="-top-3.5 left-1/2 -translate-x-1/2" />
          </motion.figure>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
