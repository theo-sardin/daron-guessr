import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import {
  PHOTO_SLOTS,
  PHOTOS_PER_PLAYER_OPTIONS,
  THEME_KINDS,
  defaultKindForSlot,
  isKindAllowed,
  type MyPhoto,
  type PhotoKind,
  type PhotoSlot,
  type Theme,
} from '../../../shared/protocol';
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
import { clamp, cn, hashString, vibrate } from '../../lib/util';
import { KindPicker } from './KindPicker';
import { kindChip, kindEmpty } from './look';

type PerSlot<T> = Record<PhotoSlot, T>;
const perSlot = <T,>(value: T): PerSlot<T> => ({ 0: value, 1: value, 2: value });

const TILT: PerSlot<number> = { 0: -3, 1: 3, 2: -2 };
/** How long we wait for the room state to confirm an action before trusting it anyway. */
const CONFIRM_TIMEOUT_MS = 5000;

/** Local, not-yet-confirmed upload in a slot. */
type Pending =
  | { stage: 'processing'; kind: PhotoKind }
  | { stage: 'uploading'; kind: PhotoKind; preview: string }
  | { stage: 'landing'; kind: PhotoKind; preview: string; photoId: string };

/** How the kind chip behaves: one kind (fixed label), two (tap toggles), more (tap opens a picker). */
type ChipMode = 'fixed' | 'toggle' | 'picker';

/** Toast list for an upload: kid and pick photos get their own jokes whatever the theme. */
const toastGroup = (theme: Theme, kind: PhotoKind): Theme =>
  kind === 'kid' ? 'childhood' : kind === 'pick' ? 'pick' : theme === 'childhood' || theme === 'pick' ? 'mix' : theme;

/**
 * "Your parents" / "You as a kid" / "Your picks"…: the active photo slots (settings.photosPerPlayer).
 * Only the viewer ever sees these photos in the lobby. Uploads show the local preview right away;
 * each action stays optimistic until the next room state confirms it (the server acks before it
 * broadcasts). Photos in slots beyond photosPerPlayer are kept by the server but sit this game out.
 */
export function PhotoSlots({ myPhotos, theme, photosPerPlayer }: { myPhotos: MyPhoto[]; theme: Theme; photosPerPlayer: number }) {
  const { t, tpick } = useI18n();
  const [pending, setPending] = useState<PerSlot<Pending | null>>(() => perSlot(null));
  /** Photo ids removed on the server but maybe still in the last view. */
  const [removed, setRemoved] = useState<string[]>([]);
  const [removing, setRemoving] = useState<PerSlot<boolean>>(() => perSlot(false));
  /** photoId -> kind picked locally, until the view agrees. */
  const [kindOverride, setKindOverride] = useState<Record<string, PhotoKind>>({});
  /** Kind picked for an empty slot, used for its next upload. */
  const [chosen, setChosen] = useState<Partial<PerSlot<PhotoKind>>>({});
  const [pickerSlot, setPickerSlot] = useState<PhotoSlot | null>(null);
  const [lightbox, setLightbox] = useState<{ src: string; caption: string } | null>(null);
  const busy = useRef<PerSlot<boolean>>(perSlot(false));
  const kindSeq = useRef(0);
  const inputs = useRef<PerSlot<HTMLInputElement | null>>(perSlot(null));
  const slotEls = useRef<PerSlot<HTMLDivElement | null>>(perSlot(null));
  /** Kind chosen when the slot's button was tapped (the file dialog opens right after). */
  const pickKind = useRef<PerSlot<PhotoKind | null>>(perSlot<PhotoKind | null>(null));
  const previews = useRef(new Set<string>());

  const max = clamp(photosPerPlayer, PHOTOS_PER_PLAYER_OPTIONS[0], PHOTO_SLOTS.length);
  const active = PHOTO_SLOTS.filter((s) => s < max);
  const allowed = THEME_KINDS[theme];
  const mode: ChipMode = allowed.length === 1 ? 'fixed' : allowed.length === 2 ? 'toggle' : 'picker';

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

  // Drop local state once the room state caught up (or a theme switch made it moot).
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
      const next = Object.fromEntries(
        Object.entries(prev).filter(([id, kind]) => isKindAllowed(theme, kind) && myPhotos.some((ph) => ph.id === id && ph.kind !== kind)),
      );
      return Object.keys(next).length === Object.keys(prev).length ? prev : next;
    });
  }, [myPhotos, pending, theme]);

  // Never get stuck on a local preview if the confirming state never shows up.
  useEffect(() => {
    const landing = PHOTO_SLOTS.filter((s) => pending[s]?.stage === 'landing');
    if (!landing.length) return;
    const id = window.setTimeout(() => landing.forEach((s) => patchPending(s, null)), CONFIRM_TIMEOUT_MS);
    return () => window.clearTimeout(id);
  }, [pending]);

  // The picker's slot went away (host lowered photos per player).
  useEffect(() => {
    if (pickerSlot !== null && pickerSlot >= max) setPickerSlot(null);
  }, [pickerSlot, max]);

  const photoIn = (slot: PhotoSlot) => myPhotos.find((p) => p.slot === slot && !removed.includes(p.id)) ?? null;
  const kindOf = (photo: MyPhoto) => {
    const local = kindOverride[photo.id];
    return local && isKindAllowed(theme, local) ? local : photo.kind;
  };

  // Kind shown in each active slot: the photo's (or upload's), else the one picked for the empty
  // slot, else a suggestion — the slot's default unless another slot already has it.
  const slotKind = perSlot<PhotoKind | null>(null);
  const used: PhotoKind[] = [];
  for (const s of active) {
    const p = pending[s];
    const photo = photoIn(s);
    const pickedHere = chosen[s];
    const k = p ? p.kind : photo ? kindOf(photo) : pickedHere && isKindAllowed(theme, pickedHere) ? pickedHere : null;
    if (k) {
      slotKind[s] = k;
      used.push(k);
    }
  }
  /** Slots whose kind is settled (a photo, an upload or an explicit pick), not just suggested. */
  const settled = active.filter((s) => slotKind[s] !== null);
  for (const s of active) {
    if (slotKind[s]) continue;
    const preferred = defaultKindForSlot(theme, s);
    const k = used.includes(preferred) ? (allowed.find((a) => !used.includes(a)) ?? preferred) : preferred;
    slotKind[s] = k;
    used.push(k);
  }
  const kindAt = (slot: PhotoSlot): PhotoKind => slotKind[slot] ?? defaultKindForSlot(theme, slot);
  const otherKind = (k: PhotoKind): PhotoKind => allowed.find((a) => a !== k) ?? k;

  const pick = (slot: PhotoSlot, kind: PhotoKind) => {
    if (busy.current[slot]) return;
    pickKind.current[slot] = kind;
    inputs.current[slot]?.click();
  };

  const upload = async (slot: PhotoSlot, file: File) => {
    if (busy.current[slot]) return;
    busy.current[slot] = true;
    // The host may have switched theme while the file dialog was open: never send a kind the
    // current theme refuses.
    const tapped = pickKind.current[slot];
    const kind = tapped && isKindAllowed(theme, tapped) ? tapped : kindAt(slot);
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
      setChosen((c) => {
        if (!(slot in c)) return c;
        const next = { ...c };
        delete next[slot];
        return next;
      });
      sfx.play('success');
      vibrate([12, 40, 12]);
      const rect = slotEls.current[slot]?.getBoundingClientRect();
      burst({
        particleCount: 70,
        x: rect ? (rect.left + rect.width / 2) / window.innerWidth : 0.5,
        y: rect ? (rect.top + rect.height / 2) / window.innerHeight : 0.5,
      });
      toast(tpick(`lobby.photos.uploaded.${toastGroup(theme, kind)}`, hashString(res.photo.id)), 'success', { emoji: '📸' });
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
    // The emptied slot offers the same kind again.
    setChosen((c) => ({ ...c, [slot]: kindOf(photo) }));
    toast(t('lobby.photos.removed'), 'info', { emoji: '🗑️' });
  };

  /** Relabels a slot: the uploaded photo (server, optimistic) or the empty slot's next upload (local). */
  const setKind = async (slot: PhotoSlot, next: PhotoKind) => {
    const photo = photoIn(slot);
    if (next === kindAt(slot) || pending[slot]) return;
    sfx.play('pop');
    if (!photo) {
      setChosen((c) => ({ ...c, [slot]: next }));
      return;
    }
    const seq = ++kindSeq.current;
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

  const onChip = (slot: PhotoSlot) => {
    if (mode === 'toggle') void setKind(slot, otherKind(kindAt(slot)));
    else if (mode === 'picker') {
      sfx.play('click');
      setPickerSlot(slot);
    }
  };

  const filledCount = active.filter((s) => photoIn(s) || pending[s]?.stage === 'landing').length;
  const benched = myPhotos.filter((p) => p.slot >= max && !removed.includes(p.id));
  const count = active.length;

  return (
    <Card tone="white" className="@container p-4 sm:p-5">
      <div className="mb-4 flex items-center justify-between gap-2">
        <h2 className="min-w-0 font-display text-2xl leading-none">
          <span aria-hidden>📸 </span>
          {t(`lobby.photos.title.${theme}.${count === 1 ? 'one' : 'many'}`)}
        </h2>
        <motion.span
          key={`${filledCount}/${count}`}
          initial={{ scale: 1.5 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 500, damping: 15 }}
          className={cn(
            'shrink-0 rounded-full border-2 border-ink px-2.5 py-0.5 font-display text-sm',
            filledCount === 0 ? 'bg-cream' : filledCount < count ? 'bg-sun' : 'bg-mint',
          )}
        >
          {t('lobby.photos.count', { count: filledCount, max: count })}
        </motion.span>
      </div>

      <div
        className={cn(
          'grid gap-4',
          count === 1 && 'mx-auto w-full max-w-[13rem] grid-cols-1',
          count === 2 && 'grid-cols-2 @sm:gap-5',
          count === 3 && 'grid-cols-2 @sm:grid-cols-3 @sm:gap-3',
        )}
      >
        {active.map((slot) => {
          const photo = photoIn(slot);
          const p = pending[slot];
          const preview = p && 'preview' in p ? p.preview : null;
          // A replacement in flight shows its local preview over the old photo.
          const src = preview ?? photo?.url ?? null;
          const kind = kindAt(slot);
          const dense = count === 3;
          const chip = (
            <KindChip
              kind={kind}
              next={otherKind(kind)}
              mode={mode}
              dense={dense}
              wide={count === 1}
              disabled={Boolean(p) || (Boolean(src) && !photo)}
              onClick={() => onChip(slot)}
            />
          );
          return (
            <div
              key={slot}
              ref={(el) => void (slotEls.current[slot] = el)}
              className={cn(
                'min-w-0',
                dense &&
                  slot === 2 &&
                  'col-span-2 w-[calc(50%-0.5rem)] justify-self-center @sm:col-span-1 @sm:w-auto @sm:justify-self-stretch',
              )}
            >
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
                    chip={chip}
                    dense={dense}
                    uploading={p?.stage === 'uploading'}
                    removing={removing[slot]}
                    locked={Boolean(p) || !photo}
                    onOpen={() => setLightbox({ src, caption: `${t(`common.kindEmoji.${kind}`)} ${t(`common.kind.${kind}`)}` })}
                    onReplace={() => pick(slot, kind)}
                    onRemove={() => photo && void remove(slot, photo)}
                  />
                ) : (
                  <EmptySlot
                    key="empty"
                    slot={slot}
                    kind={kind}
                    dense={dense}
                    chip={mode === 'fixed' ? null : chip}
                    processing={p?.stage === 'processing'}
                    onPick={() => pick(slot, kind)}
                  />
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>

      <AnimatePresence initial={false}>
        {filledCount === 0 && !active.some((s) => pending[s]) && (
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
              {t(`lobby.photos.nudge.${theme}`)}
            </span>
          </motion.p>
        )}
      </AnimatePresence>

      {benched.length > 0 && (
        <p className="mt-4 flex items-center gap-2.5 rounded-2xl border-2 border-dashed border-ink/30 bg-cream px-3 py-2 text-sm leading-snug font-semibold text-ink-soft">
          <span className="flex shrink-0 -space-x-3" aria-hidden>
            {benched.map((b, i) => (
              <img
                key={b.id}
                src={b.url}
                alt=""
                draggable={false}
                className="size-9 rounded-md border-2 border-ink bg-white object-cover opacity-70 grayscale"
                style={{ rotate: `${i % 2 ? 6 : -6}deg` }}
              />
            ))}
          </span>
          <span className="min-w-0">
            <span aria-hidden>💤 </span>
            {benched.length === 1 ? t('lobby.photos.benchedOne', { max }) : t('lobby.photos.benchedMany', { count: benched.length, max })}
          </span>
        </p>
      )}

      <p className="mt-3 flex items-start gap-2 text-sm leading-snug text-ink-soft">
        <span className="text-lg leading-5" aria-hidden>
          🤫
        </span>
        <span>
          <strong className="font-extrabold text-ink">{t('lobby.photos.tipTitle')}</strong> {t(`lobby.photos.tip.${theme}`)}
        </span>
      </p>

      <KindPicker
        open={pickerSlot !== null}
        kinds={allowed}
        current={pickerSlot !== null ? kindAt(pickerSlot) : null}
        used={pickerSlot !== null ? settled.filter((s) => s !== pickerSlot).map(kindAt) : []}
        onPick={(k) => {
          if (pickerSlot !== null) void setKind(pickerSlot, k);
          setPickerSlot(null);
        }}
        onClose={() => setPickerSlot(null)}
      />
      <Lightbox src={lightbox?.src ?? null} caption={lightbox?.caption} onClose={() => setLightbox(null)} />
    </Card>
  );
}

/** "👧 Sister ▾": what the photo is. Tapping it toggles (2 kinds) or opens the picker (3+). */
function KindChip({
  kind,
  next,
  mode,
  dense,
  wide,
  disabled,
  onClick,
}: {
  kind: PhotoKind;
  /** Kind a tap switches to, in toggle mode. */
  next: PhotoKind;
  mode: ChipMode;
  /** Three slots side by side on a wide card: keep it small. */
  dense: boolean;
  /** Single slot: plenty of room. */
  wide: boolean;
  disabled: boolean;
  onClick: () => void;
}) {
  const t = useI18n().t;
  const label = t(`common.kind.${kind}`);
  const cls = cn(
    'inline-flex h-11 max-w-full items-center gap-1 rounded-full border-2 border-ink px-2 font-display text-sm shadow-pop-sm transition-colors',
    wide ? 'text-base px-2.5' : dense ? '@sm:h-10 @sm:gap-0.5 @sm:px-1.5' : '@sm:text-base @sm:px-2.5',
    kindChip(kind),
  );
  const content = (
    <AnimatePresence mode="popLayout" initial={false}>
      <motion.span
        key={kind}
        className="inline-flex min-w-0 items-center gap-1"
        initial={{ rotateX: 90, opacity: 0 }}
        animate={{ rotateX: 0, opacity: 1 }}
        exit={{ rotateX: -90, opacity: 0 }}
        transition={{ duration: 0.18 }}
      >
        <span aria-hidden>{t(`common.kindEmoji.${kind}`)}</span>
        <span className="truncate">{label}</span>
      </motion.span>
    </AnimatePresence>
  );
  if (mode === 'fixed') return <span className={cls}>{content}</span>;
  const aria =
    mode === 'toggle' ? t('lobby.photos.switchKind', { kind: t(`common.kind.${next}`) }) : t('lobby.photos.chooseKind', { kind: label });
  return (
    <motion.button
      type="button"
      disabled={disabled}
      onClick={onClick}
      whileTap={{ scale: 0.9 }}
      aria-label={aria}
      title={aria}
      aria-haspopup={mode === 'picker' ? 'dialog' : undefined}
      className={cn(cls, 'disabled:opacity-60')}
    >
      {content}
      <span className={cn('shrink-0 opacity-70', mode === 'toggle' ? 'text-sm' : 'text-[0.6rem]', dense && '@sm:hidden')} aria-hidden>
        {mode === 'toggle' ? '⇄' : '▼'}
      </span>
    </motion.button>
  );
}

function EmptySlot({
  slot,
  kind,
  dense,
  chip,
  processing,
  onPick,
}: {
  slot: PhotoSlot;
  kind: PhotoKind;
  dense: boolean;
  /** Kind chip under the slot (none when the theme has a single kind). */
  chip: ReactNode;
  processing: boolean;
  onPick: () => void;
}) {
  const t = useI18n().t;
  return (
    <motion.div
      className="flex flex-col items-center gap-3"
      initial={{ opacity: 0, scale: 0.85 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.85 }}
      transition={{ type: 'spring', stiffness: 400, damping: 22 }}
    >
      <motion.button
        type="button"
        onClick={onPick}
        disabled={processing}
        aria-busy={processing}
        animate={processing ? { rotate: [0, -3, 3, -2, 2, 0] } : { rotate: 0 }}
        transition={processing ? { rotate: { duration: 0.6, repeat: Infinity } } : { type: 'spring', stiffness: 400, damping: 22 }}
        whileHover={processing ? undefined : { scale: 1.03, rotate: TILT[slot] / 2 }}
        whileTap={processing ? undefined : { scale: 0.95 }}
        className={cn(
          'group flex w-full flex-col items-center justify-center gap-2 rounded-2xl border-3 border-dashed p-2 text-center text-ink transition-colors',
          chip ? 'aspect-[4/4.9]' : 'aspect-[4/5.6] md:aspect-[4/4.6]',
          kindEmpty(kind),
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
              className={cn('text-6xl leading-none drop-shadow-[0_3px_0_rgba(27,16,54,0.25)]', dense ? '@sm:text-5xl' : 'sm:text-7xl')}
              animate={{ y: [0, -6, 0], rotate: [0, slot % 2 ? 6 : -6, 0] }}
              transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut', delay: slot * 0.7 }}
              aria-hidden
            >
              {t(`common.kindEmoji.${kind}`)}
            </motion.span>
            <span className={cn('font-display text-lg leading-tight', dense ? '@sm:text-base' : 'sm:text-xl')}>
              {t(`common.addKind.${kind}`)}
            </span>
            <span
              className="flex size-9 shrink-0 items-center justify-center rounded-full border-3 border-ink bg-pink font-display text-2xl leading-none text-white shadow-pop-sm transition-transform group-hover:scale-110"
              aria-hidden
            >
              +
            </span>
          </>
        )}
      </motion.button>
      {chip}
    </motion.div>
  );
}

function FilledSlot({
  slot,
  src,
  kind,
  chip,
  dense,
  uploading,
  removing,
  locked,
  onOpen,
  onReplace,
  onRemove,
}: {
  slot: PhotoSlot;
  src: string;
  kind: PhotoKind;
  chip: ReactNode;
  dense: boolean;
  uploading: boolean;
  removing: boolean;
  /** Actions disabled while a local change is not confirmed yet. */
  locked: boolean;
  onOpen: () => void;
  onReplace: () => void;
  onRemove: () => void;
}) {
  const t = useI18n().t;
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
          className={cn('w-full', dense && '@sm:p-2')}
          imageClassName="aspect-[4/5] w-full"
          overlay={overlay}
          onOpen={uploading ? undefined : onOpen}
          caption={chip}
        />
      </motion.div>
      <div className={cn('flex w-full gap-2', dense && '@sm:gap-1.5')}>
        <motion.button
          type="button"
          disabled={locked || removing}
          onClick={() => {
            sfx.play('click');
            onReplace();
          }}
          whileTap={{ scale: 0.94, y: 2 }}
          aria-label={t('lobby.photos.replaceAria')}
          title={t('lobby.photos.replace')}
          className="flex h-11 min-w-0 flex-1 items-center justify-center gap-1 rounded-xl border-2 border-ink bg-cream px-2 font-display text-sm text-ink shadow-pop-sm disabled:opacity-50"
        >
          <span aria-hidden>🔄</span>
          <span className={cn('truncate', dense && '@sm:sr-only')}>{t('lobby.photos.replace')}</span>
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
