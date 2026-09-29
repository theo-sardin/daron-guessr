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
import { Icon } from '../../components/Icon';
import { IconBadge } from '../../components/IconBadge';
import { KindTag } from '../../components/KindTag';
import { Lightbox } from '../../components/Lightbox';
import { Polaroid } from '../../components/Polaroid';
import { Spinner } from '../../components/Spinner';
import { fakeDateStamp, Stamp } from '../../components/Stamp';
import { toast } from '../../components/Toast';
import { Viewfinder } from '../../components/Viewfinder';
import { useI18n } from '../../i18n';
import { burst } from '../../lib/confetti';
import { errorText } from '../../lib/errors';
import { compressImage } from '../../lib/image';
import { sfx } from '../../lib/sfx';
import { api } from '../../lib/store';
import { clamp, cn, hashString, vibrate } from '../../lib/util';
import { CardTitle } from './CardTitle';
import { KindPicker } from './KindPicker';

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

/** How the kind label behaves: one kind (fixed label), two (tap toggles), more (tap opens a picker). */
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
      toast(tpick(`lobby.photos.uploaded.${toastGroup(theme, kind)}`, hashString(res.photo.id)), 'success', { icon: 'camera' });
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
    toast(t('lobby.photos.removed'), 'info', { icon: 'trash' });
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
        <CardTitle icon="camera" tone="pink">
          {t(`lobby.photos.title.${theme}.${count === 1 ? 'one' : 'many'}`)}
        </CardTitle>
        {/* The frame counter of a disposable camera, printed on the card. */}
        <motion.span
          key={`${filledCount}/${count}`}
          initial={{ scale: 1.5, rotate: -6 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: 'spring', stiffness: 500, damping: 15 }}
          className="flex shrink-0 items-center gap-1.5"
        >
          {filledCount === count && (
            <span className="flex size-6 items-center justify-center rounded-full border-2 border-ink bg-mint" aria-hidden>
              <Icon name="check" weight="bold" className="size-3.5" />
            </span>
          )}
          <Stamp glow={false} size="md" ariaLabel={t('lobby.photos.count', { count: filledCount, max: count })}>
            {t('lobby.photos.count', { count: filledCount, max: count })}
          </Stamp>
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
                    wide={count === 1}
                    uploading={p?.stage === 'uploading'}
                    removing={removing[slot]}
                    locked={Boolean(p) || !photo}
                    dateStamp={photo && !p ? fakeDateStamp(photo.id) : undefined}
                    onOpen={() => setLightbox({ src, caption: t(`common.kind.${kind}`) })}
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
            <span className="mt-4 flex items-start gap-2.5 rounded-2xl border-2 border-ink bg-cream px-3 py-2.5 text-sm leading-snug font-bold">
              <IconBadge name="eye" tone="pink" size="xs" tilt={-6} className="mt-px" />
              <span>{t(`lobby.photos.nudge.${theme}`)}</span>
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
            {benched.length === 1 ? t('lobby.photos.benchedOne', { max }) : t('lobby.photos.benchedMany', { count: benched.length, max })}
          </span>
        </p>
      )}

      <p className="mt-4 flex items-start gap-2 text-sm leading-snug text-ink-soft">
        <Icon name="lock" className="mt-px size-4.5 shrink-0 text-ink" />
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

const TAG_WRAP = 'h-auto! min-h-[22px] py-0.5 [&>span:last-child]:whitespace-normal [&>span:last-child]:leading-[1.15]';
const TAG_TIGHT = `gap-1 pr-1.5! pl-1! [&>span:last-child]:tracking-[0.02em] ${TAG_WRAP}`;
/** TAG_TIGHT (+ the small size's 11px type) only when the card is narrow. */
const TAG_TIGHT_NARROW = [
  '@max-[18rem]:min-h-[22px] @max-[18rem]:h-auto! @max-[18rem]:py-0.5 @max-[18rem]:gap-1 @max-[18rem]:pr-1.5! @max-[18rem]:pl-1!',
  '@max-[18rem]:[&>span:last-child]:text-[11px] @max-[18rem]:[&>span:last-child]:tracking-[0.02em]',
  '@max-[18rem]:[&>span:last-child]:whitespace-normal @max-[18rem]:[&>span:last-child]:leading-[1.15]',
].join(' ');

/**
 * "SISTER": what the photo is, as a lab label. Tapping it toggles (2 kinds) or opens the picker
 * (3+); a little swap / chevron sticker on the label's corner says so without taking any width.
 */
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
  /** Three slots on the card: keep it small. */
  dense: boolean;
  /** Single slot: plenty of room. */
  wide: boolean;
  disabled: boolean;
  onClick: () => void;
}) {
  const t = useI18n().t;
  const label = t(`common.kind.${kind}`);
  const tag = (
    <AnimatePresence mode="popLayout" initial={false}>
      <motion.span
        key={kind}
        className="inline-flex min-w-0"
        initial={{ rotateX: 90, opacity: 0 }}
        animate={{ rotateX: 0, opacity: 1 }}
        exit={{ rotateX: -90, opacity: 0 }}
        transition={{ duration: 0.18 }}
      >
        <KindTag
          kind={kind}
          size={wide ? 'lg' : dense ? 'sm' : 'md'}
          tilt={-2}
          className={cn(
            // Three prints on the card, or two on a 320px phone: a tighter label that wraps onto
            // two lines rather than cutting a word ("MOI / PETIT·E", never "MOI…").
            dense ? TAG_TIGHT : !wide && TAG_TIGHT_NARROW,
          )}
        />
      </motion.span>
    </AnimatePresence>
  );
  if (mode === 'fixed') return <span className="inline-flex h-11 max-w-full items-center">{tag}</span>;
  const aria =
    mode === 'toggle' ? t('lobby.photos.switchKind', { kind: t(`common.kind.${next}`) }) : t('lobby.photos.chooseKind', { kind: label });
  return (
    <motion.button
      type="button"
      disabled={disabled}
      onClick={onClick}
      whileTap={{ scale: 0.92 }}
      aria-label={aria}
      title={aria}
      aria-haspopup={mode === 'picker' ? 'dialog' : undefined}
      className="group relative inline-flex h-11 max-w-full items-center pr-2 pl-0.5 font-sans disabled:opacity-60 @max-[18rem]:pr-1.5 @max-[18rem]:pl-0"
    >
      {tag}
      <span
        className={cn(
          'absolute right-0 flex items-center justify-center rounded-full border-2 border-ink bg-cream text-ink shadow-[0_1.5px_0_0_var(--color-ink)] transition-colors group-hover:bg-sun',
          // Sits on the label's corner, above the text line.
          wide ? 'top-0 size-5.5' : '-top-0.5 size-5 @max-[18rem]:size-4.5',
        )}
        aria-hidden
      >
        <Icon name={mode === 'toggle' ? 'swap' : 'chevron-down'} weight="bold" className={wide ? 'size-3.5' : 'size-3 @max-[18rem]:size-2.5'} />
      </span>
    </motion.button>
  );
}

/** An empty print waiting for its photo: an unexposed frame, the camera ready, what to add written underneath. */
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
  /** Kind label under the slot (none when the theme has a single kind). */
  chip: ReactNode;
  processing: boolean;
  onPick: () => void;
}) {
  const t = useI18n().t;
  const addLabel = t(`common.addKind.${kind}`);
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
        aria-label={processing ? t('lobby.photos.processing') : addLabel}
        style={{ rotate: TILT[slot] / 2 }}
        animate={processing ? { rotate: [0, -3, 3, -2, 2, 0] } : { rotate: TILT[slot] / 2 }}
        transition={processing ? { rotate: { duration: 0.6, repeat: Infinity } } : { type: 'spring', stiffness: 400, damping: 22 }}
        whileHover={processing ? undefined : { scale: 1.03, rotate: TILT[slot] }}
        whileTap={processing ? undefined : { scale: 0.95 }}
        className="group relative flex w-full flex-col rounded-md border-3 border-ink bg-white p-2 pb-1 text-ink shadow-pop-sm @sm:p-2.5 @sm:pb-1.5"
      >
        {/* The unexposed frame. */}
        <span className="relative flex aspect-[4/5] w-full flex-col items-center justify-center gap-2 overflow-hidden rounded-sm bg-cream shadow-[inset_0_2px_0_0_rgb(27_16_54/0.08)] transition-colors group-hover:bg-sun/20">
          <Viewfinder className="absolute inset-0" color="rgb(27 16 54 / 0.28)" gap={-10} length={16} thickness={3} />
          {processing ? (
            <>
              <Spinner className="size-11 text-ink" />
              <span className="font-display text-base">{t('lobby.photos.processing')}</span>
            </>
          ) : (
            <motion.span
              className="relative"
              animate={{ y: [0, -5, 0], rotate: [-4, slot % 2 ? 4 : -8, -4] }}
              transition={{ duration: 2.6, repeat: Infinity, ease: 'easeInOut', delay: slot * 0.7 }}
            >
              <IconBadge name="camera" tone="pink" size={dense ? 'md' : 'lg'} className={cn(dense && '@max-sm:size-16 @max-sm:[&>svg]:size-9')} />
              <span className="absolute -right-2.5 -bottom-2 flex size-7 items-center justify-center rounded-full border-2 border-ink bg-white shadow-[0_2px_0_0_var(--color-ink)] transition-transform group-hover:scale-110">
                <Icon name="plus" weight="bold" className="size-4" />
              </span>
            </motion.span>
          )}
        </span>
        {/* What to add, handwritten on the print. */}
        <span
          className={cn(
            'text-hand flex min-h-12 items-center justify-center px-1 text-center text-[1.4rem] leading-[0.95] text-ink',
            dense && '@sm:text-xl',
            processing && 'opacity-50',
          )}
        >
          {addLabel}
        </span>
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
  wide,
  uploading,
  removing,
  locked,
  dateStamp,
  onOpen,
  onReplace,
  onRemove,
}: {
  slot: PhotoSlot;
  src: string;
  kind: PhotoKind;
  chip: ReactNode;
  dense: boolean;
  /** Single slot: room for the button labels even on tiny phones. */
  wide: boolean;
  uploading: boolean;
  removing: boolean;
  /** Actions disabled while a local change is not confirmed yet. */
  locked: boolean;
  /** Camera date imprint (once the photo is on the server). */
  dateStamp?: string;
  onOpen: () => void;
  onReplace: () => void;
  onRemove: () => void;
}) {
  const t = useI18n().t;
  let overlay: ReactNode = null;
  if (uploading || removing) {
    overlay = (
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-grape-950/55 text-cream backdrop-blur-[2px]">
        <Spinner className="size-10 text-cream" />
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
          className={cn('w-full p-2 pb-1 @sm:p-2.5 @sm:pb-1.5', dense && '@sm:p-2 @sm:pb-1')}
          imageClassName="aspect-[4/5] w-full"
          overlay={overlay}
          dateStamp={uploading || removing ? undefined : dateStamp}
          onOpen={uploading ? undefined : onOpen}
          caption={<span className="flex min-h-11 items-center justify-center">{chip}</span>}
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
          className="flex h-11 min-w-0 flex-1 items-center justify-center gap-1.5 rounded-xl border-2 border-ink bg-cream px-2 font-display text-sm text-ink shadow-pop-sm transition-colors hover:bg-white disabled:opacity-50"
        >
          <Icon name="refresh" className="size-4.5 shrink-0" />
          <span className={cn('truncate', !wide && '@max-[19rem]:sr-only', dense && '@sm:sr-only')}>{t('lobby.photos.replace')}</span>
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
          // Quiet like Replace (the card's accent is its pink camera); red only under the pointer.
          className="flex size-11 shrink-0 items-center justify-center rounded-xl border-2 border-ink bg-cream text-danger-dark shadow-pop-sm transition-colors hover:bg-danger hover:text-ink disabled:opacity-50"
        >
          <Icon name="trash" className="size-5" />
        </motion.button>
      </div>
    </motion.div>
  );
}
