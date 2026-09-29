import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { PHOTO_SLOTS, type MyPhoto, type ParentKind, type PhotoSlot } from '../../../shared/protocol';
import { Card } from '../../components/Card';
import { Lightbox } from '../../components/Lightbox';
import { Polaroid } from '../../components/Polaroid';
import { Spinner } from '../../components/Spinner';
import { toast } from '../../components/Toast';
import { useI18n } from '../../i18n';
import { burst } from '../../lib/confetti';
import { errorText } from '../../lib/errors';
import { compressImage } from '../../lib/image';
import { sfx } from '../../lib/sfx';
import { api } from '../../lib/store';
import { cn, hashString, vibrate } from '../../lib/util';

const DEFAULT_KIND: Record<PhotoSlot, ParentKind> = { 0: 'daron', 1: 'daronne' };
const TILT: Record<PhotoSlot, number> = { 0: -3, 1: 3 };
const other = (k: ParentKind): ParentKind => (k === 'daron' ? 'daronne' : 'daron');
/** How long we wait for the room state to confirm an action before trusting it anyway. */
const CONFIRM_TIMEOUT_MS = 5000;

/** Local, not-yet-confirmed upload in a slot. */
type Pending =
  | { stage: 'processing'; kind: ParentKind }
  | { stage: 'uploading'; kind: ParentKind; preview: string }
  | { stage: 'landing'; kind: ParentKind; preview: string; photoId: string };

type PerSlot<T> = Record<PhotoSlot, T>;

/**
 * "Your parents": two photo slots. Only the viewer ever sees these photos in the lobby.
 * Uploads show the local preview right away; each action stays optimistic until the next
 * room state confirms it (the server acks before it broadcasts).
 */
export function PhotoSlots({ myPhotos }: { myPhotos: MyPhoto[] }) {
  const { t, tpick } = useI18n();
  const [pending, setPending] = useState<PerSlot<Pending | null>>({ 0: null, 1: null });
  /** Photo ids removed on the server but maybe still in the last view. */
  const [removed, setRemoved] = useState<string[]>([]);
  const [removing, setRemoving] = useState<PerSlot<boolean>>({ 0: false, 1: false });
  /** photoId -> kind picked locally, until the view agrees. */
  const [kindOverride, setKindOverride] = useState<Record<string, ParentKind>>({});
  const [lightbox, setLightbox] = useState<{ src: string; caption: string } | null>(null);
  const busy = useRef<PerSlot<boolean>>({ 0: false, 1: false });
  const kindSeq = useRef(0);
  const inputs = useRef<PerSlot<HTMLInputElement | null>>({ 0: null, 1: null });
  const slotEls = useRef<PerSlot<HTMLDivElement | null>>({ 0: null, 1: null });
  const pickKind = useRef<PerSlot<ParentKind>>({ ...DEFAULT_KIND });
  const previews = useRef(new Set<string>());

  const patchPending = (slot: PhotoSlot, value: Pending | null) => {
    setPending((prev) => {
      const old = prev[slot];
      if (old && 'preview' in old && (!value || !('preview' in value) || value.preview !== old.preview)) {
        URL.revokeObjectURL(old.preview);
        previews.current.delete(old.preview);
      }
      return { ...prev, [slot]: value };
    });
  };

  // Free object URLs on unmount.
  useEffect(() => {
    const urls = previews.current;
    return () => urls.forEach((u) => URL.revokeObjectURL(u));
  }, []);

  // Drop local state once the room state caught up.
  useEffect(() => {
    for (const slot of PHOTO_SLOTS) {
      const p = pending[slot];
      if (p?.stage === 'landing' && myPhotos.some((ph) => ph.id === p.photoId)) patchPending(slot, null);
    }
    setRemoved((prev) => {
      const next = prev.filter((id) => myPhotos.some((ph) => ph.id === id));
      return next.length === prev.length ? prev : next;
    });
    setKindOverride((prev) => {
      const next = Object.fromEntries(Object.entries(prev).filter(([id, kind]) => myPhotos.some((ph) => ph.id === id && ph.kind !== kind)));
      return Object.keys(next).length === Object.keys(prev).length ? prev : next;
    });
  }, [myPhotos, pending]);

  // Never get stuck on a local preview if the confirming state never shows up.
  useEffect(() => {
    const landing = PHOTO_SLOTS.filter((s) => pending[s]?.stage === 'landing');
    if (!landing.length) return;
    const id = window.setTimeout(() => landing.forEach((s) => patchPending(s, null)), CONFIRM_TIMEOUT_MS);
    return () => window.clearTimeout(id);
  }, [pending]);

  const photoIn = (slot: PhotoSlot) => myPhotos.find((p) => p.slot === slot && !removed.includes(p.id)) ?? null;
  const kindOf = (photo: MyPhoto) => kindOverride[photo.id] ?? photo.kind;

  /** Kind suggested for an empty slot: its default, unless the other slot already is that kind. */
  const suggestedKind = (slot: PhotoSlot): ParentKind => {
    const otherSlot = PHOTO_SLOTS.find((s) => s !== slot) ?? slot;
    const otherPhoto = photoIn(otherSlot);
    const otherKind = otherPhoto ? kindOf(otherPhoto) : pending[otherSlot]?.kind;
    return otherKind === DEFAULT_KIND[slot] ? other(otherKind) : DEFAULT_KIND[slot];
  };

  const pick = (slot: PhotoSlot, kind: ParentKind) => {
    if (busy.current[slot]) return;
    pickKind.current[slot] = kind;
    inputs.current[slot]?.click();
  };

  const upload = async (slot: PhotoSlot, file: File) => {
    if (busy.current[slot]) return;
    busy.current[slot] = true;
    const kind = pickKind.current[slot];
    patchPending(slot, { stage: 'processing', kind });
    try {
      let blob: Blob;
      try {
        blob = await compressImage(file);
      } catch {
        patchPending(slot, null);
        sfx.play('fail');
        toast(errorText(t, 'UNREADABLE_IMAGE'), 'error');
        return;
      }
      const preview = URL.createObjectURL(blob);
      previews.current.add(preview);
      patchPending(slot, { stage: 'uploading', kind, preview });
      const res = await api.uploadPhoto(slot, kind, blob);
      if (!res.ok) {
        patchPending(slot, null);
        sfx.play('fail');
        toast(errorText(t, res.error), 'error');
        return;
      }
      patchPending(slot, { stage: 'landing', kind, preview, photoId: res.photo.id });
      sfx.play('success');
      vibrate([12, 40, 12]);
      const rect = slotEls.current[slot]?.getBoundingClientRect();
      burst({
        particleCount: 70,
        x: rect ? (rect.left + rect.width / 2) / window.innerWidth : 0.5,
        y: rect ? (rect.top + rect.height / 2) / window.innerHeight : 0.5,
      });
      toast(tpick('lobby.photos.uploaded', hashString(res.photo.id)), 'success', { emoji: '📸' });
    } finally {
      busy.current[slot] = false;
    }
  };

  const remove = async (slot: PhotoSlot, photo: MyPhoto) => {
    if (busy.current[slot]) return;
    busy.current[slot] = true;
    setRemoving((r) => ({ ...r, [slot]: true }));
    const res = await api.removePhoto(slot);
    busy.current[slot] = false;
    setRemoving((r) => ({ ...r, [slot]: false }));
    if (!res.ok) {
      toast(errorText(t, res.error), 'error');
      return;
    }
    sfx.play('whoosh');
    setRemoved((prev) => [...prev, photo.id]);
    toast(t('lobby.photos.removed'), 'info', { emoji: '🗑️' });
  };

  const toggleKind = async (slot: PhotoSlot, photo: MyPhoto) => {
    const next = other(kindOf(photo));
    const seq = ++kindSeq.current;
    sfx.play('pop');
    setKindOverride((o) => ({ ...o, [photo.id]: next }));
    const res = await api.setPhotoKind(slot, next);
    if (!res.ok && seq === kindSeq.current) {
      setKindOverride((o) => {
        const copy = { ...o };
        delete copy[photo.id];
        return copy;
      });
      toast(errorText(t, res.error), 'error');
    }
  };

  const filledCount = PHOTO_SLOTS.filter((s) => photoIn(s) || pending[s]?.stage === 'landing').length;

  return (
    <Card tone="white" className="p-4 sm:p-5">
      <div className="mb-4 flex items-center justify-between gap-2">
        <h2 className="font-display text-2xl leading-none">
          <span aria-hidden>📸 </span>
          {t('lobby.photos.title')}
        </h2>
        <motion.span
          key={filledCount}
          initial={{ scale: 1.5 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 500, damping: 15 }}
          className={cn(
            'rounded-full border-2 border-ink px-2.5 py-0.5 font-display text-sm',
            filledCount === 0 ? 'bg-cream' : filledCount === 1 ? 'bg-sun' : 'bg-mint',
          )}
        >
          {t('lobby.photos.count', { count: filledCount })}
        </motion.span>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:gap-5">
        {PHOTO_SLOTS.map((slot) => {
          const photo = photoIn(slot);
          const p = pending[slot];
          const preview = p && 'preview' in p ? p.preview : null;
          // A replacement in flight shows its local preview over the old photo.
          const src = preview ?? photo?.url ?? null;
          const kind = p ? p.kind : photo ? kindOf(photo) : suggestedKind(slot);
          return (
            <div key={slot} ref={(el) => void (slotEls.current[slot] = el)} className="min-w-0">
              <input
                ref={(el) => void (inputs.current[slot] = el)}
                type="file"
                accept="image/*"
                className="hidden"
                tabIndex={-1}
                aria-hidden
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  e.target.value = '';
                  if (file) void upload(slot, file);
                }}
              />
              <AnimatePresence mode="wait" initial={false}>
                {src ? (
                  <FilledSlot
                    key="filled"
                    slot={slot}
                    src={src}
                    kind={kind}
                    uploading={p?.stage === 'uploading'}
                    removing={removing[slot]}
                    locked={Boolean(p) || !photo}
                    onOpen={() => setLightbox({ src, caption: `${t(`common.kindEmoji.${kind}`)} ${t(`common.kind.${kind}`)}` })}
                    onToggleKind={() => photo && void toggleKind(slot, photo)}
                    onReplace={() => pick(slot, kind)}
                    onRemove={() => photo && void remove(slot, photo)}
                  />
                ) : (
                  <EmptySlot key="empty" slot={slot} kind={kind} processing={p?.stage === 'processing'} onPick={() => pick(slot, kind)} />
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>

      <AnimatePresence initial={false}>
        {filledCount === 0 && !PHOTO_SLOTS.some((s) => pending[s]) && (
          <motion.p
            key="nudge"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <span className="mt-4 flex items-start gap-2 rounded-2xl border-2 border-ink bg-sun/70 px-3 py-2 text-sm font-bold">
              <span className="text-lg leading-5" aria-hidden>
                👀
              </span>
              {t('lobby.photos.nudge')}
            </span>
          </motion.p>
        )}
      </AnimatePresence>

      <p className="mt-3 flex items-start gap-2 text-sm leading-snug text-ink-soft">
        <span className="text-lg leading-5" aria-hidden>
          🤫
        </span>
        <span>
          <strong className="font-extrabold text-ink">{t('lobby.photos.tipTitle')}</strong> {t('lobby.photos.tip')}
        </span>
      </p>

      <Lightbox src={lightbox?.src ?? null} caption={lightbox?.caption} onClose={() => setLightbox(null)} />
    </Card>
  );
}

function EmptySlot({ slot, kind, processing, onPick }: { slot: PhotoSlot; kind: ParentKind; processing: boolean; onPick: () => void }) {
  const t = useI18n().t;
  return (
    <motion.button
      type="button"
      onClick={onPick}
      disabled={processing}
      aria-busy={processing}
      initial={{ opacity: 0, scale: 0.85 }}
      animate={processing ? { opacity: 1, scale: 1, rotate: [0, -3, 3, -2, 2, 0] } : { opacity: 1, scale: 1, rotate: 0 }}
      exit={{ opacity: 0, scale: 0.85 }}
      transition={processing ? { rotate: { duration: 0.6, repeat: Infinity } } : { type: 'spring', stiffness: 400, damping: 22 }}
      whileHover={processing ? undefined : { scale: 1.03, rotate: TILT[slot] / 2 }}
      whileTap={processing ? undefined : { scale: 0.95 }}
      className={cn(
        'group flex aspect-[4/5.6] h-full w-full flex-col md:aspect-[4/4.6] items-center justify-center gap-2 rounded-2xl border-3 border-dashed p-2 text-center text-ink transition-colors',
        kind === 'daron' ? 'border-sky-dark bg-sky/15 hover:bg-sky/25' : 'border-pink-dark bg-pink/10 hover:bg-pink/20',
      )}
    >
      {processing ? (
        <>
          <Spinner className="size-10 text-ink" />
          <span className="font-display text-base">{t('lobby.photos.processing')}</span>
        </>
      ) : (
        <>
          <motion.span
            className="text-6xl leading-none drop-shadow-[0_3px_0_rgba(27,16,54,0.25)] sm:text-7xl"
            animate={{ y: [0, -6, 0], rotate: [0, slot ? 6 : -6, 0] }}
            transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut', delay: slot * 0.7 }}
            aria-hidden
          >
            {t(`common.kindEmoji.${kind}`)}
          </motion.span>
          <span className="font-display text-lg leading-tight sm:text-xl">{t(`lobby.photos.add.${kind}`)}</span>
          <span
            className="flex size-9 items-center justify-center rounded-full border-3 border-ink bg-pink font-display text-2xl leading-none text-white shadow-pop-sm transition-transform group-hover:scale-110"
            aria-hidden
          >
            +
          </span>
        </>
      )}
    </motion.button>
  );
}

function FilledSlot({
  slot,
  src,
  kind,
  uploading,
  removing,
  locked,
  onOpen,
  onToggleKind,
  onReplace,
  onRemove,
}: {
  slot: PhotoSlot;
  src: string;
  kind: ParentKind;
  uploading: boolean;
  removing: boolean;
  /** Actions disabled while a local change is not confirmed yet. */
  locked: boolean;
  onOpen: () => void;
  onToggleKind: () => void;
  onReplace: () => void;
  onRemove: () => void;
}) {
  const t = useI18n().t;
  const otherKind = other(kind);
  let overlay: ReactNode = null;
  if (uploading || removing) {
    overlay = (
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-grape-950/55 text-cream backdrop-blur-[2px]">
        <Spinner className="size-9 text-sun" />
        {uploading && <span className="font-display text-sm">{t('lobby.photos.uploading')}</span>}
      </div>
    );
  }
  return (
    <motion.div
      className="flex flex-col items-center gap-3"
      initial={{ opacity: 0, y: -30, scale: 0.6, rotate: TILT[slot] * 4 }}
      animate={{ opacity: 1, y: 0, scale: 1, rotate: 0 }}
      exit={{ opacity: 0, scale: 0.6, rotate: -TILT[slot] * 4, y: 20 }}
      transition={{ type: 'spring', stiffness: 380, damping: 18 }}
    >
      <motion.div
        className="w-full"
        animate={uploading ? { rotate: [TILT[slot], TILT[slot] - 4, TILT[slot] + 4, TILT[slot]] } : { rotate: TILT[slot] }}
        transition={uploading ? { duration: 0.7, repeat: Infinity } : { type: 'spring', stiffness: 300, damping: 15 }}
      >
        <Polaroid
          src={src}
          alt={t(`common.kind.${kind}`)}
          className="w-full"
          imageClassName="aspect-[4/5] w-full"
          overlay={overlay}
          onOpen={uploading ? undefined : onOpen}
          caption={
            <motion.button
              type="button"
              disabled={locked}
              onClick={onToggleKind}
              whileTap={{ scale: 0.9 }}
              aria-label={t('lobby.photos.switchKind', { kind: t(`common.kind.${otherKind}`) })}
              title={t('lobby.photos.switchKind', { kind: t(`common.kind.${otherKind}`) })}
              className={cn(
                'inline-flex h-11 max-w-full items-center gap-1 rounded-full border-2 border-ink px-2.5 font-display text-base shadow-pop-sm transition-colors disabled:opacity-60',
                kind === 'daron' ? 'bg-sky' : 'bg-pink text-white',
              )}
            >
              <AnimatePresence mode="popLayout" initial={false}>
                <motion.span
                  key={kind}
                  className="inline-flex items-center gap-1"
                  initial={{ rotateX: 90, opacity: 0 }}
                  animate={{ rotateX: 0, opacity: 1 }}
                  exit={{ rotateX: -90, opacity: 0 }}
                  transition={{ duration: 0.18 }}
                >
                  <span aria-hidden>{t(`common.kindEmoji.${kind}`)}</span>
                  <span className="truncate">{t(`common.kind.${kind}`)}</span>
                </motion.span>
              </AnimatePresence>
              <span className="text-sm opacity-70" aria-hidden>
                ⇄
              </span>
            </motion.button>
          }
        />
      </motion.div>
      <div className="flex w-full gap-2">
        <motion.button
          type="button"
          disabled={locked || removing}
          onClick={() => {
            sfx.play('click');
            onReplace();
          }}
          whileTap={{ scale: 0.94, y: 2 }}
          aria-label={t('lobby.photos.replaceAria')}
          className="flex h-11 min-w-0 flex-1 items-center justify-center gap-1 rounded-xl border-2 border-ink bg-cream px-2 font-display text-sm text-ink shadow-pop-sm disabled:opacity-50"
        >
          <span aria-hidden>🔄</span>
          <span className="truncate">{t('lobby.photos.replace')}</span>
        </motion.button>
        <motion.button
          type="button"
          disabled={locked || removing}
          onClick={() => {
            sfx.play('click');
            onRemove();
          }}
          whileTap={{ scale: 0.94, y: 2 }}
          aria-label={t('lobby.photos.removeAria')}
          title={t('lobby.photos.remove')}
          className="flex size-11 shrink-0 items-center justify-center rounded-xl border-2 border-ink bg-danger text-lg shadow-pop-sm disabled:opacity-50"
        >
          <span aria-hidden>🗑️</span>
        </motion.button>
      </div>
    </motion.div>
  );
}
