import { describe, expect, it } from 'vitest';
import { MAX_IMAGE_SIDE, VARIANT_SIDE_TOLERANCE, inspectImage, inspectVariant } from './image';

const u32be = (n: number) => {
  const b = Buffer.alloc(4);
  b.writeUInt32BE(n);
  return b;
};
const u32le = (n: number) => {
  const b = Buffer.alloc(4);
  b.writeUInt32LE(n);
  return b;
};

/** Signature + IHDR chunk header of a PNG (the rest never matters here). */
function png(width: number, height: number): Buffer {
  const ihdr = Buffer.concat([u32be(width), u32be(height), Buffer.from([8, 6, 0, 0, 0])]);
  return Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), u32be(13), Buffer.from('IHDR'), ihdr, Buffer.alloc(4)]);
}

/** SOI, an APP0 segment, then a SOFn frame header. */
function jpeg(width: number, height: number, sof = 0xc0): Buffer {
  const app0 = Buffer.from([0xff, 0xe0, 0x00, 0x10, ...Buffer.from('JFIF\0'), 1, 1, 0, 0, 1, 0, 1, 0, 0]);
  const frame = Buffer.from([0xff, sof, 0x00, 0x0b, 8, height >> 8, height & 0xff, width >> 8, width & 0xff, 1, 1, 0x11, 0]);
  return Buffer.concat([Buffer.from([0xff, 0xd8]), app0, frame, Buffer.from([0xff, 0xd9])]);
}

function riff(chunk: string, data: Buffer): Buffer {
  const body = Buffer.concat([Buffer.from('WEBP'), Buffer.from(chunk), u32le(data.length), data, Buffer.alloc(8)]);
  return Buffer.concat([Buffer.from('RIFF'), u32le(body.length), body]);
}

const webpLossy = (w: number, h: number) =>
  riff('VP8 ', Buffer.from([0x30, 0x01, 0x00, 0x9d, 0x01, 0x2a, w & 0xff, (w >> 8) & 0x3f, h & 0xff, (h >> 8) & 0x3f]));

function webpLossless(w: number, h: number): Buffer {
  const bits = (w - 1) | ((h - 1) << 14);
  return riff('VP8L', Buffer.from([0x2f, bits & 0xff, (bits >> 8) & 0xff, (bits >> 16) & 0xff, (bits >>> 24) & 0xff]));
}

function webpExtended(w: number, h: number): Buffer {
  const b = Buffer.alloc(10);
  b.writeUIntLE(w - 1, 4, 3);
  b.writeUIntLE(h - 1, 7, 3);
  return riff('VP8X', b);
}

describe('inspectImage', () => {
  it('reads the dimensions of PNG, JPEG (baseline and progressive) and WebP (VP8, VP8L, VP8X)', () => {
    expect(inspectImage(png(1280, 960))).toEqual({ mime: 'image/png', width: 1280, height: 960 });
    expect(inspectImage(jpeg(1280, 720))).toEqual({ mime: 'image/jpeg', width: 1280, height: 720 });
    expect(inspectImage(jpeg(800, 1280, 0xc2))).toEqual({ mime: 'image/jpeg', width: 800, height: 1280 });
    expect(inspectImage(webpLossy(640, 480))).toEqual({ mime: 'image/webp', width: 640, height: 480 });
    expect(inspectImage(webpLossless(1000, 3000))).toEqual({ mime: 'image/webp', width: 1000, height: 3000 });
    expect(inspectImage(webpExtended(4096, 1))).toEqual({ mime: 'image/webp', width: 4096, height: 1 });
  });

  it('rejects oversized images (decompression bombs)', () => {
    expect(inspectImage(png(50_000, 50_000))).toBeNull();
    expect(inspectImage(png(MAX_IMAGE_SIDE + 1, 10))).toBeNull();
    expect(inspectImage(png(MAX_IMAGE_SIDE, MAX_IMAGE_SIDE))).not.toBeNull();
    expect(inspectImage(jpeg(10, MAX_IMAGE_SIDE + 1))).toBeNull();
    expect(inspectImage(webpLossless(MAX_IMAGE_SIDE + 1, 5))).toBeNull();
    expect(inspectImage(webpExtended(100_000, 100_000))).toBeNull();
  });

  it('rejects headers that do not parse, even with valid magic bytes', () => {
    expect(inspectImage(Buffer.concat([Buffer.from([0xff, 0xd8, 0xff]), Buffer.alloc(3 * 1024)]))).toBeNull();
    expect(inspectImage(png(1, 1).subarray(0, 20))).toBeNull();
    expect(inspectImage(png(0, 10))).toBeNull();
    expect(inspectImage(jpeg(0, 10))).toBeNull();
    // Start of scan before any frame header.
    expect(inspectImage(Buffer.from([0xff, 0xd8, 0xff, 0xda, 0x00, 0x08, 1, 2, 3, 4, 5, 6]))).toBeNull();
    // Truncated in the middle of a segment.
    expect(inspectImage(jpeg(10, 10).subarray(0, 12))).toBeNull();
    const badLossless = webpLossless(10, 10);
    badLossless[20] = 0;
    expect(inspectImage(badLossless)).toBeNull();
    expect(inspectImage(riff('VP8 ', Buffer.alloc(10)))).toBeNull();
    expect(inspectImage(riff('ANIM', Buffer.alloc(10)))).toBeNull();
    expect(inspectImage(Buffer.from('GIF89a'))).toBeNull();
    expect(inspectImage(new Uint8Array(0))).toBeNull();
  });
});

describe('inspectVariant', () => {
  it('accepts any image whose longest edge fits the blur step width (with a little slack)', () => {
    expect(inspectVariant(png(12, 9), 12)).toEqual({ mime: 'image/png', width: 12, height: 9 });
    expect(inspectVariant(jpeg(18, 24), 24)).toEqual({ mime: 'image/jpeg', width: 18, height: 24 });
    expect(inspectVariant(webpLossy(96 + VARIANT_SIDE_TOLERANCE, 40), 96)).toEqual({ mime: 'image/webp', width: 98, height: 40 });
    expect(inspectVariant(png(1, 1), 48)).not.toBeNull();
  });

  it('rejects bigger images (a sharp photo passed off as a variant) and garbage', () => {
    expect(inspectVariant(png(12 + VARIANT_SIDE_TOLERANCE + 1, 5), 12)).toBeNull();
    expect(inspectVariant(jpeg(10, 200), 96)).toBeNull();
    expect(inspectVariant(png(1080, 720), 96)).toBeNull();
    expect(inspectVariant(Buffer.from('GIF89a'), 96)).toBeNull();
    expect(inspectVariant(png(0, 10), 96)).toBeNull();
  });
});
