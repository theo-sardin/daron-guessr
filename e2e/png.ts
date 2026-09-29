import { deflateSync } from 'node:zlib';

/**
 * Minimal PNG encoder for test fixtures: draws a simple face on a colored background so
 * uploaded "parent photos" are real, decodable images without shipping binary files.
 */
const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(buf: Buffer): number {
  let c = 0xffffffff;
  for (const byte of buf) c = CRC_TABLE[(c ^ byte) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type: string, data: Buffer): Buffer {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

type RGB = [number, number, number];

export function makeFacePng(seed: number, size = 240): Buffer {
  const hue = (seed * 67) % 360;
  const bg = hslToRgb(hue, 0.6, 0.75);
  const skin = hslToRgb(28 + (seed % 5) * 4, 0.55, 0.55 + (seed % 3) * 0.08);
  const hair = hslToRgb((seed * 31) % 60, 0.4, 0.15 + (seed % 4) * 0.12);
  const cx = size / 2;
  const cy = size * 0.48;
  const rows: Buffer[] = [];
  for (let y = 0; y < size; y++) {
    const row = Buffer.alloc(1 + size * 3);
    row[0] = 0; // filter: none
    for (let x = 0; x < size; x++) {
      let color: RGB = bg;
      const dx = (x - cx) / (size * 0.3);
      const dy = (y - cy) / (size * 0.36);
      const inFace = dx * dx + dy * dy <= 1;
      if (inFace) color = skin;
      if (inFace && y < cy - size * 0.18) color = hair;
      const eyeY = cy - size * 0.03;
      for (const ex of [cx - size * 0.1, cx + size * 0.1]) {
        if ((x - ex) ** 2 + (y - eyeY) ** 2 < (size * 0.025) ** 2) color = [27, 16, 54];
      }
      if (inFace && Math.abs(y - (cy + size * 0.16)) < size * 0.012 && Math.abs(x - cx) < size * 0.09) color = [140, 40, 40];
      row.set(color, 1 + x * 3);
    }
    rows.push(row);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // color type: truecolor
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(Buffer.concat(rows))),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

function hslToRgb(h: number, s: number, l: number): RGB {
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    return Math.round(255 * (l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1))));
  };
  return [f(0), f(8), f(4)];
}
