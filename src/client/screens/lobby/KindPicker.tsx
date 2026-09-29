import { motion } from 'motion/react';
import type { PhotoKind } from '../../../shared/protocol';
import { Icon } from '../../components/Icon';
import { KindTag } from '../../components/KindTag';
import { Modal } from '../../components/Modal';
import { useT } from '../../i18n';
import { cn } from '../../lib/util';

/**
 * "What is this photo?": the kinds the theme allows, as a sheet of lab labels (bottom sheet on
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
      <div role="radiogroup" aria-label={t('lobby.photos.pickerTitle')} className="grid grid-cols-2 gap-2.5 pt-1">
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
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ type: 'spring', stiffness: 500, damping: 24, delay: 0.03 * i }}
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.94 }}
              className={cn(
                'relative flex min-h-[4.25rem] min-w-0 flex-col items-center justify-center gap-1.5 rounded-2xl px-1 py-2 text-center transition-colors',
                selected ? 'border-3 border-ink bg-white shadow-pop-sm' : 'border-2 border-dashed border-ink/25 bg-cream hover:border-ink/50 hover:bg-white',
              )}
            >
              {selected && (
                <span
                  className="absolute -top-2 -right-2 flex size-6 items-center justify-center rounded-full border-2 border-ink bg-mint text-ink"
                  aria-hidden
                >
                  <Icon name="check" weight="bold" className="size-3.5" />
                </span>
              )}
              <KindTag
                kind={k}
                size="md"
                tone={selected ? 'fill' : 'paper'}
                tilt={i % 2 ? 2 : -2}
                // Long labels wrap onto a second line instead of losing their end ("MOI / PETIT·E").
                className="h-auto! min-h-[26px] py-1 pr-2! [&>span:last-child]:text-center [&>span:last-child]:tracking-[0.03em] [&>span:last-child]:leading-[1.15] [&>span:last-child]:whitespace-normal"
              />
              {taken && <span className="label-mono text-[0.625rem] text-ink-soft">{t('lobby.photos.pickerUsed')}</span>}
            </motion.button>
          );
        })}
      </div>
    </Modal>
  );
}
