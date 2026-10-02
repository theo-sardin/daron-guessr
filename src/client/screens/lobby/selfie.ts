import { useRef, useState } from 'react';
import { toast } from '../../components/Toast';
import { useT } from '../../i18n';
import { errorText } from '../../lib/errors';
import { compressImage } from '../../lib/image';
import { sfx } from '../../lib/sfx';
import { api } from '../../lib/store';
import { vibrate } from '../../lib/util';

/** A selfie is shown as a small round face: ~512px is plenty (and keeps the upload tiny). */
const SELFIE_EDGE = 512;

/** Downscales an already compressed (EXIF-free, upright) JPEG so its longest edge is SELFIE_EDGE. */
async function shrink(blob: Blob, edge = SELFIE_EDGE): Promise<Blob> {
  if (!('createImageBitmap' in window)) return blob;
  let bmp: ImageBitmap;
  try {
    bmp = await createImageBitmap(blob);
  } catch {
    return blob;
  }
  const scale = Math.min(1, edge / Math.max(bmp.width, bmp.height));
  if (scale === 1) {
    bmp.close();
    return blob;
  }
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(bmp.width * scale));
  canvas.height = Math.max(1, Math.round(bmp.height * scale));
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    bmp.close();
    return blob;
  }
  ctx.drawImage(bmp, 0, 0, canvas.width, canvas.height);
  bmp.close();
  const out = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.85));
  return out && out.size < blob.size ? out : blob;
}

/**
 * Opens a file dialog through a throwaway <input type=file> (front camera with `capture`), so
 * the page never carries extra file inputs next to the photo slots. Removed once used.
 */
function openPicker(capture: boolean, onFile: (file: File) => void) {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'image/*';
  if (capture) input.setAttribute('capture', 'user');
  input.style.display = 'none';
  input.setAttribute('aria-hidden', 'true');
  const done = () => input.remove();
  input.addEventListener('change', () => {
    const file = input.files?.[0];
    done();
    if (file) onFile(file);
  });
  input.addEventListener('cancel', done);
  // iOS Safari only opens inputs that are in the document.
  document.body.appendChild(input);
  input.click();
}

/**
 * Take / pick / remove the player's selfie. `take()` opens the front camera on phones
 * (`capture="user"`), `pick()` the gallery; both upload right away (compressed, then shrunk to
 * ~512px), with a toast either way.
 */
export function useSelfie() {
  const t = useT();
  const [busy, setBusy] = useState<'upload' | 'remove' | null>(null);
  const busyRef = useRef(false);

  const upload = async (file: File) => {
    if (busyRef.current) return;
    busyRef.current = true;
    setBusy('upload');
    try {
      let blob: Blob;
      try {
        blob = await shrink(await compressImage(file));
      } catch {
        sfx.play('fail');
        toast(errorText(t, 'UNREADABLE_IMAGE'), 'error');
        return;
      }
      const res = await api.uploadSelfie(blob);
      if (!res.ok) {
        sfx.play('fail');
        toast(errorText(t, res.error), 'error');
        return;
      }
      sfx.play('success');
      vibrate([12, 40, 12]);
      toast(t('lobby.profile.selfieSaved'), 'success', { emoji: '🤳' });
    } finally {
      busyRef.current = false;
      setBusy(null);
    }
  };

  const remove = async () => {
    if (busyRef.current) return;
    busyRef.current = true;
    setBusy('remove');
    const res = await api.removeSelfie();
    busyRef.current = false;
    setBusy(null);
    if (!res.ok) {
      toast(errorText(t, res.error), 'error');
      return;
    }
    sfx.play('whoosh');
    toast(t('lobby.profile.selfieRemoved'), 'info', { emoji: '🗑️' });
  };

  return {
    busy,
    take: () => {
      if (!busyRef.current) openPicker(true, (f) => void upload(f));
    },
    pick: () => {
      if (!busyRef.current) openPicker(false, (f) => void upload(f));
    },
    remove,
  };
}
