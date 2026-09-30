/**
 * Image sniffing: uploads are trusted by their magic bytes and headers, never by the declared
 * mime. Images are never decoded server side, but every player's browser will decode them,
 * so the header must parse and declare sane dimensions (no garbage, no decompression bombs).
 */
import type { PhotoMime } from './game';

/** Largest accepted width / height. The client sends at most 1080 px. */
export const MAX_IMAGE_SIDE = 4096;

const JPEG = [0xff, 0xd8, 0xff];
const PNG = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

function startsWith(bytes: Uint8Array, signature: number[], offset = 0): boolean {
  return bytes.length >= offset + signature.length && signature.every((b, i) => bytes[offset + i] === b);
}

const ascii = (text: string) => Array.from(text, (ch) => ch.charCodeAt(0));

export function detectImageMime(bytes: Uint8Array): PhotoMime | null {
  if (startsWith(bytes, JPEG)) return 'image/jpeg';
  if (startsWith(bytes, PNG)) return 'image/png';
  if (startsWith(bytes, ascii('RIFF')) && startsWith(bytes, ascii('WEBP'), 8)) return 'image/webp';
  return null;
}

export interface ImageInfo {
  mime: PhotoMime;
  width: number;
  height: number;
}

/**
 * Mime and dimensions read from the image header, or null when the header does not parse
 * or declares a side of 0 or more than MAX_IMAGE_SIDE pixels.
 */
export function inspectImage(bytes: Uint8Array): ImageInfo | null {
  const mime = detectImageMime(bytes);
  if (!mime) return null;
  const size = mime === 'image/png' ? pngSize(bytes) : mime === 'image/jpeg' ? jpegSize(bytes) : webpSize(bytes);
  if (!size) return null;
  const [width, height] = size;
  const sane = (side: number) => Number.isInteger(side) && side >= 1 && side <= MAX_IMAGE_SIDE;
  return sane(width) && sane(height) ? { mime, width, height } : null;
}

type Size = [width: number, height: number];

const u16be = (b: Uint8Array, i: number) => (b[i] << 8) | b[i + 1];
const u32be = (b: Uint8Array, i: number) => ((b[i] << 24) | (b[i + 1] << 16) | (b[i + 2] << 8) | b[i + 3]) >>> 0;
const u24le = (b: Uint8Array, i: number) => b[i] | (b[i + 1] << 8) | (b[i + 2] << 16);

/** The first chunk must be IHDR: width and height are big-endian u32 at bytes 16 and 20. */
function pngSize(b: Uint8Array): Size | null {
  if (b.length < 24 || u32be(b, 8) !== 13 || !startsWith(b, ascii('IHDR'), 12)) return null;
  return [u32be(b, 16), u32be(b, 20)];
}

/** Walks the marker segments up to the first SOFn frame header. */
function jpegSize(b: Uint8Array): Size | null {
  let i = 2;
  while (i + 4 <= b.length) {
    if (b[i] !== 0xff) return null;
    while (b[i] === 0xff && i < b.length) i++; // fill bytes
    const marker = b[i++];
    if (marker === undefined || marker === 0x00) return null;
    // Standalone markers (no length): TEM, RSTn.
    if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) continue;
    // SOI again, EOI or start of scan before any frame header: not a usable image.
    if (marker === 0xd8 || marker === 0xd9 || marker === 0xda) return null;
    if (i + 2 > b.length) return null;
    const length = u16be(b, i);
    if (length < 2) return null;
    // SOF0..SOF15, except DHT (C4), JPG (C8) and DAC (CC): [length][precision][height][width].
    if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
      if (length < 7 || i + 7 > b.length) return null;
      return [u16be(b, i + 5), u16be(b, i + 3)];
    }
    i += length;
  }
  return null;
}

/** RIFF / WEBP, then the first chunk: VP8 (lossy), VP8L (lossless) or VP8X (extended). */
function webpSize(b: Uint8Array): Size | null {
  if (b.length < 30) return null;
  if (startsWith(b, ascii('VP8 '), 12)) {
    // Frame tag (3 bytes), start code 9d 01 2a, then 14-bit width and height (little endian).
    if (!startsWith(b, [0x9d, 0x01, 0x2a], 23)) return null;
    return [(b[26] | (b[27] << 8)) & 0x3fff, (b[28] | (b[29] << 8)) & 0x3fff];
  }
  if (startsWith(b, ascii('VP8L'), 12)) {
    // Signature 0x2f, then (width - 1) and (height - 1) on 14 bits each.
    if (b[20] !== 0x2f) return null;
    const width = 1 + (b[21] | ((b[22] & 0x3f) << 8));
    const height = 1 + ((b[22] >> 6) | (b[23] << 2) | ((b[24] & 0x0f) << 10));
    return [width, height];
  }
  if (startsWith(b, ascii('VP8X'), 12)) {
    // Flags (1 byte), reserved (3), then (canvas width - 1) and (height - 1) on 24 bits each.
    return [1 + u24le(b, 24), 1 + u24le(b, 27)];
  }
  return null;
}

/** Slack on a blur variant's longest edge (rounding in the uploader's resize). */
export const VARIANT_SIDE_TOLERANCE = 2;

/**
 * A blur variant (see BLUR_VARIANT_WIDTHS): any accepted image whose longest edge is at most
 * `width` (+ VARIANT_SIDE_TOLERANCE). There is no declared mime: the header decides.
 */
export function inspectVariant(bytes: Uint8Array, width: number): ImageInfo | null {
  const info = inspectImage(bytes);
  return info && Math.max(info.width, info.height) <= width + VARIANT_SIDE_TOLERANCE ? info : null;
}

/** Declared mime, with the common non-standard alias folded in. */
export function normalizeMime(mime: string): string {
  const m = mime.trim().toLowerCase();
  return m === 'image/jpg' ? 'image/jpeg' : m;
}

/** Copies socket binary data into a Buffer the room owns. */
export function toBuffer(data: ArrayBuffer | Uint8Array): Buffer {
  return data instanceof ArrayBuffer ? Buffer.from(new Uint8Array(data)) : Buffer.from(data);
}
