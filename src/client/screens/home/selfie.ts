import { useCallback, useState } from 'react';
import { toast } from '../../components/Toast';
import { compressImage } from '../../lib/image';
import { api } from '../../lib/store';

/**
 * The optional selfie picked on the home / join screens, before the player has a seat. It is
 * kept on the device (a small JPEG data URL in localStorage, so it survives reloads) and
 * uploaded with `api.uploadSelfie` right after the room is created or joined.
 */
const SELFIE_KEY = 'dg:selfie';
/** Longest edge of the stored selfie (px): plenty for avatars and the reveal's comparison print. */
const SELFIE_EDGE = 512;

export function loadSelfie(): string | null {
  try {
    const v = localStorage.getItem(SELFIE_KEY);
    return v && v.startsWith('data:image/') ? v : null;
  } catch {
    return null;
  }
}

export function saveSelfie(dataUrl: string | null) {
  try {
    if (dataUrl) localStorage.setItem(SELFIE_KEY, dataUrl);
    else localStorage.removeItem(SELFIE_KEY);
  } catch {
    // Private mode / quota: the selfie just won't survive a reload.
  }
}

/**
 * Picked file -> small JPEG data URL. `compressImage` applies the EXIF orientation and strips the
 * metadata; the result is then shrunk to SELFIE_EDGE.
 */
export async function prepareSelfie(file: Blob): Promise<string> {
  const compressed = await compressImage(file);
  const bitmap = await createImageBitmap(compressed);
  const scale = Math.min(1, SELFIE_EDGE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('UNREADABLE_IMAGE');
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return canvas.toDataURL('image/jpeg', 0.82);
}

function dataUrlToBlob(dataUrl: string): Blob {
  const [head, body] = dataUrl.split(',', 2);
  const mime = head.match(/^data:([^;]+)/)?.[1] ?? 'image/jpeg';
  const bin = atob(body);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new Blob([bytes], { type: mime });
}

/**
 * Uploads the stored selfie once the player has a seat (fire and forget: navigation never waits
 * for it). A failure toasts `failedMessage`; the selfie stays stored for the next room.
 */
export async function uploadStoredSelfie(failedMessage: string): Promise<void> {
  const dataUrl = loadSelfie();
  if (!dataUrl) return;
  try {
    const res = await api.uploadSelfie(dataUrlToBlob(dataUrl));
    if (!res.ok) toast(failedMessage, 'error');
  } catch {
    toast(failedMessage, 'error');
  }
}

/** The selfie of the profile card: current data URL, pick (async, with a busy flag) and remove. */
export function useSelfie(unreadableMessage: string) {
  const [selfie, setSelfie] = useState<string | null>(loadSelfie);
  const [busy, setBusy] = useState(false);

  const pick = useCallback(
    async (file: File | undefined) => {
      if (!file) return;
      setBusy(true);
      try {
        const url = await prepareSelfie(file);
        setSelfie(url);
        saveSelfie(url);
      } catch {
        toast(unreadableMessage, 'error');
      } finally {
        setBusy(false);
      }
    },
    [unreadableMessage],
  );

  const remove = useCallback(() => {
    setSelfie(null);
    saveSelfie(null);
  }, []);

  return { selfie, busy, pick, remove };
}
