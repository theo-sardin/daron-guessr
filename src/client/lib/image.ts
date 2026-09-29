import { MAX_PHOTO_BYTES } from '../../shared/protocol';

export class ImageReadError extends Error {
  constructor() {
    super('UNREADABLE_IMAGE');
  }
}

// Plenty for phone screens and the lightbox; keeps uploads around 150-400 KB.
const MAX_EDGE = 1080;

async function decode(file: Blob): Promise<ImageBitmap | HTMLImageElement> {
  if ('createImageBitmap' in window) {
    try {
      // Applies EXIF orientation so phone photos are not sideways.
      return await createImageBitmap(file, { imageOrientation: 'from-image' });
    } catch {
      // fall through to <img>, which some browsers decode more leniently
    }
  }
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.decoding = 'async';
    img.src = url;
    await img.decode();
    return img;
  } catch {
    throw new ImageReadError();
  } finally {
    URL.revokeObjectURL(url);
  }
}

function toBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality));
}

/**
 * Downscales and re-encodes a picked image as JPEG. Re-encoding through a canvas also
 * strips EXIF metadata (location, camera, original date) before anything leaves the phone.
 */
export async function compressImage(file: Blob): Promise<Blob> {
  const source = await decode(file);
  const w = 'naturalWidth' in source ? source.naturalWidth : source.width;
  const h = 'naturalHeight' in source ? source.naturalHeight : source.height;
  if (!w || !h) throw new ImageReadError();

  const scale = Math.min(1, MAX_EDGE / Math.max(w, h));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(w * scale));
  canvas.height = Math.max(1, Math.round(h * scale));
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new ImageReadError();
  // JPEG has no alpha: paint transparent PNGs on white instead of black.
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(source, 0, 0, canvas.width, canvas.height);
  if ('close' in source) source.close();

  for (const quality of [0.82, 0.72, 0.6, 0.45]) {
    const blob = await toBlob(canvas, quality);
    if (blob && blob.size <= MAX_PHOTO_BYTES) return blob;
  }
  throw new ImageReadError();
}
