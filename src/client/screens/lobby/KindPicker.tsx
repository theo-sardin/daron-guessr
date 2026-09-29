import { motion } from 'motion/react';
import type { PhotoKind } from '../../../shared/protocol';
import { Modal } from '../../components/Modal';
import { useT } from '../../i18n';
import { cn } from '../../lib/util';
import { kindChip } from './look';

/**
 * "What is this photo?": the kinds the theme allows, as a sheet of stickers (bottom sheet on
 * phones, dialog on desktop). Kinds already used by another slot are marked, not forbidden
 * (two sisters is fine).
 */
export function KindPicker({
  open,
  kinds,
  current,
  used,
  onPick,
  onClose,
}: {
  open: boolean;
  kinds: readonly PhotoKind[];
  current: PhotoKind | null;
  used: readonly PhotoKind[];
  onPick: (kind: PhotoKind) => void;
  onClose: () => void;
}) {
  const t = useT();
  return (
    <Modal open={open} onClose={onClose} title={t('lobby.photos.pickerTitle')} className="max-h-[calc(100dvh-2rem)] overflow-y-auto p-5">
      <div role="radiogroup" aria-label={t('lobby.photos.pickerTitle')} className="grid grid-cols-3 gap-2.5 pt-1">
        {kinds.map((k, i) => {
          const selected = k === current;
          const taken = !selected && used.includes(k);
          return (
            <motion.button
              key={k}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => onPick(k)}
              initial={{ opacity: 0, y: 12, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ type: 'spring', stiffness: 500, damping: 24, delay: 0.03 * i }}
              whileHover={{ y: -2, rotate: i % 2 ? 2 : -2 }}
              whileTap={{ scale: 0.9 }}
              className={cn(
                'relative flex min-h-[5.5rem] min-w-0 flex-col items-center justify-center gap-1 rounded-2xl border-ink px-1.5 py-2 text-center transition-colors',
                selected ? cn('border-3 shadow-pop-sm', kindChip(k)) : 'border-2 bg-cream text-ink hover:bg-white',
              )}
            >
              {selected && (
                <span
                  className="absolute -top-2 -right-2 flex size-6 items-center justify-center rounded-full border-2 border-ink bg-white text-xs font-black text-ink"
                  aria-hidden
                >
                  ✓
                </span>
              )}
              <span className="text-3xl leading-none" aria-hidden>
                {t(`common.kindEmoji.${k}`)}
              </span>
              <span className="font-display text-sm leading-tight">{t(`common.kind.${k}`)}</span>
              {taken && (
                <span className="rounded-full bg-ink/10 px-1.5 text-[0.65rem] leading-4 font-extrabold text-ink-soft">
                  {t('lobby.photos.pickerUsed')}
                </span>
              )}
            </motion.button>
          );
        })}
      </div>
    </Modal>
  );
}
