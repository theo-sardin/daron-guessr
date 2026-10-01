import { BLUR_VARIANT_WIDTHS, MAX_BLUR_VARIANT_BYTES, MAX_PHOTO_BYTES } from '../../shared/protocol';

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

type Source = ImageBitmap | HTMLImageElement;

function sizeOf(source: Source): { w: number; h: number } {
  const w = 'naturalWidth' in source ? source.naturalWidth : source.width;
  const h = 'naturalHeight' in source ? source.naturalHeight : source.height;
  if (!w || !h) throw new ImageReadError();
  return { w, h };
}

/** Draws `source` so that its longest edge is at most `maxEdge` px (never upscaled), on white. */
function drawScaled(source: Source, maxEdge: number): HTMLCanvasElement {
  const { w, h } = sizeOf(source);
  const scale = Math.min(1, maxEdge / Math.max(w, h));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(w * scale));
  canvas.height = Math.max(1, Math.round(h * scale));
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new ImageReadError();
  // JPEG has no alpha: paint transparent PNGs on white instead of black.
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(source, 0, 0, canvas.width, canvas.height);
  return canvas;
}

function release(source: Source): void {
  if ('close' in source) source.close();
}

/**
 * Downscales and re-encodes a picked image as JPEG. Re-encoding through a canvas also
 * strips EXIF metadata (location, camera, original date) before anything leaves the phone.
 */
export async function compressImage(file: Blob): Promise<Blob> {
  const source = await decode(file);
  let canvas: HTMLCanvasElement;
  try {
    canvas = drawScaled(source, MAX_EDGE);
  } finally {
    release(source);
  }
  for (const quality of [0.82, 0.72, 0.6, 0.45]) {
    const blob = await toBlob(canvas, quality);
    if (blob && blob.size <= MAX_PHOTO_BYTES) return blob;
  }
  throw new ImageReadError();
}

/**
 * Low-resolution JPEG copies of a photo for blurred rounds, one per BLUR_VARIANT_WIDTHS entry
 * (longest edge, in that order), sent along with the photo (`api.uploadPhoto`). While a round
 * is blurred the server only hands out the current step's copy, so the sharp photo cannot be
 * peeked at. Rejects (ImageReadError) when the image cannot be decoded or a copy comes out too
 * big; the caller then uploads the photo alone.
 */
export async function makeBlurVariants(file: Blob): Promise<Blob[]> {
  const source = await decode(file);
  try {
    const variants: Blob[] = [];
    for (const width of BLUR_VARIANT_WIDTHS) {
      const blob = await toBlob(drawScaled(source, width), 0.7);
      if (!blob || blob.size > MAX_BLUR_VARIANT_BYTES) throw new ImageReadError();
      variants.push(blob);
    }
    return variants;
  } finally {
    release(source);
  }
}
