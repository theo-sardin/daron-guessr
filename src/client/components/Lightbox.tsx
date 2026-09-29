import { AnimatePresence, motion } from 'motion/react';
import { useEffect } from 'react';
import { createPortal } from 'react-dom';

/** Full-screen photo viewer. Tap anywhere or press Escape to close. */
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
          className="fixed inset-0 z-[90] flex cursor-zoom-out flex-col items-center justify-center gap-3 bg-grape-950/90 p-4 backdrop-blur"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.img
            src={src}
            alt={caption ?? ''}
            className="max-h-[85dvh] max-w-full rounded-xl border-4 border-white object-contain shadow-2xl"
            initial={{ scale: 0.85, rotate: -3 }}
            animate={{ scale: 1, rotate: 0 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 26 }}
          />
          {caption && <p className="text-hand text-3xl text-cream">{caption}</p>}
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
