import { motion } from 'motion/react';
import type { PhotoKind } from '../../../shared/protocol';
import { KindTag } from '../../components/KindTag';
import { MarkerCheck } from '../../components/Marker';
import { Modal } from '../../components/Modal';
import { useT } from '../../i18n';
import { cn } from '../../lib/util';

/**
 * "What is this photo?" / "Which body part?": the kinds the theme allows, as labels on paper
 * scraps (bottom sheet on phones, dialog on desktop). The current one is ticked in red marker.
 * Kinds already used by another slot are marked, not forbidden (two sisters is fine).
 */
export function KindPicker({
  open,
  kinds,
  current,
  used,
  title,
  onPick,
  onClose,
}: {
  open: boolean;
  kinds: readonly PhotoKind[];
  current: PhotoKind | null;
  used: readonly PhotoKind[];
  title: string;
  onPick: (kind: PhotoKind) => void;
  onClose: () => void;
}) {
  const t = useT();
  return (
    <Modal open={open} onClose={onClose} title={title} className="max-h-[calc(100dvh-2rem)] overflow-y-auto p-5">
      <div role="radiogroup" aria-label={title} className="grid grid-cols-2 gap-2.5 pt-1 sm:grid-cols-3">
        {kinds.map((k, i) => {
          const selected = k === current;
          const taken = !selected && used.includes(k);
          return (
            <motion.button
              key={k}
              type="button"
              role="radio"
              aria-checked={selected}
              aria-label={taken ? `${t(`common.kind.${k}`)} (${t('lobby.photos.pickerUsed')})` : t(`common.kind.${k}`)}
              onClick={() => onPick(k)}
              initial={{ opacity: 0, y: 12, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1, rotate: i % 2 ? 0.8 : -0.8 }}
              transition={{ type: 'spring', stiffness: 500, damping: 24, delay: 0.025 * i }}
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.94 }}
              className={cn(
                'relative flex min-h-[3.75rem] min-w-0 flex-col items-center justify-center gap-1 px-1.5 py-2 text-center transition-colors',
                selected ? 'paper-postit shadow-paper-sm' : 'paper-sheet shadow-paper-sm hover:bg-paper',
              )}
            >
              {selected && <MarkerCheck className="absolute -top-2 -right-1 size-7" />}
              <KindTag
                kind={k}
                size="md"
                tilt={i % 2 ? 2 : -2}
                // Long labels wrap onto a second line instead of losing their end ("MOI / PETIT·E").
                className="h-auto! min-h-[26px] py-1 pr-2! [&>span:last-child]:text-center [&>span:last-child]:leading-[1.15] [&>span:last-child]:tracking-[0.03em] [&>span:last-child]:whitespace-normal"
              />
              {taken && <span className="label-type text-[0.68rem]">{t('lobby.photos.pickerUsed')}</span>}
            </motion.button>
          );
        })}
      </div>
    </Modal>
  );
}
