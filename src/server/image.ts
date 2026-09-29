/** Image sniffing: uploads are trusted by their magic bytes, never by the declared mime. */
import type { PhotoMime } from './game';

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

/** Declared mime, with the common non-standard alias folded in. */
export function normalizeMime(mime: string): string {
  const m = mime.trim().toLowerCase();
  return m === 'image/jpg' ? 'image/jpeg' : m;
}

/** Copies socket binary data into a Buffer the room owns. */
export function toBuffer(data: ArrayBuffer | Uint8Array): Buffer {
  return data instanceof ArrayBuffer ? Buffer.from(new Uint8Array(data)) : Buffer.from(data);
}
