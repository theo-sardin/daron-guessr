/** Token buckets: `capacity` burst, refilled continuously at `perSecond`. */
export class TokenBucket {
  private tokens: number;
  private updatedAt: number;
  private readonly capacity: number;
  private readonly perMs: number;

  constructor(capacity: number, perSecond: number, now: number) {
    this.capacity = capacity;
    this.perMs = perSecond / 1000;
    this.tokens = capacity;
    this.updatedAt = now;
  }

  /** Takes `cost` tokens (default 1); false (and nothing taken) when there are not enough. */
  take(now: number, cost = 1): boolean {
    this.refill(now);
    if (this.tokens < cost) return false;
    this.tokens -= cost;
    return true;
  }

  /** Whether `cost` tokens could be taken right now (nothing is taken). */
  has(now: number, cost = 1): boolean {
    this.refill(now);
    return this.tokens >= cost;
  }

  isFull(now: number): boolean {
    this.refill(now);
    return this.tokens >= this.capacity;
  }

  private refill(now: number): void {
    this.tokens = Math.min(this.capacity, this.tokens + Math.max(0, now - this.updatedAt) * this.perMs);
    this.updatedAt = now;
  }
}

/** Default bound on the number of keys a KeyedRateLimiter remembers. */
export const DEFAULT_MAX_KEYS = 10_000;

/** One bucket per key (e.g. per IP). The number of remembered keys is bounded. */
export class KeyedRateLimiter {
  private readonly buckets = new Map<string, TokenBucket>();
  private readonly capacity: number;
  private readonly perSecond: number;
  private readonly maxKeys: number;

  constructor(capacity: number, perSecond: number, maxKeys = DEFAULT_MAX_KEYS) {
    this.capacity = capacity;
    this.perSecond = perSecond;
    this.maxKeys = maxKeys;
  }

  get size(): number {
    return this.buckets.size;
  }

  take(key: string, now: number, cost = 1): boolean {
    let bucket = this.buckets.get(key);
    if (!bucket) {
      this.makeRoom(now);
      bucket = new TokenBucket(this.capacity, this.perSecond, now);
      this.buckets.set(key, bucket);
    }
    return bucket.take(now, cost);
  }

  /** Whether `key` could take `cost` tokens right now (nothing is taken). */
  has(key: string, now: number, cost = 1): boolean {
    return this.buckets.get(key)?.has(now, cost) ?? cost <= this.capacity;
  }

  /** Forgets keys whose bucket refilled completely (they carry no information anymore). */
  sweep(now: number): void {
    for (const [key, bucket] of this.buckets) if (bucket.isFull(now)) this.buckets.delete(key);
  }

  /** Before adding a key at the limit: drop full buckets, then the oldest keys if still needed. */
  private makeRoom(now: number): void {
    if (this.buckets.size < this.maxKeys) return;
    this.sweep(now);
    for (const key of this.buckets.keys()) {
      if (this.buckets.size < this.maxKeys) break;
      this.buckets.delete(key);
    }
  }
}

/**
 * Client IP of a request. Behind a trusted reverse proxy (`trustProxy`), it is the LAST
 * X-Forwarded-For entry: the one the proxy appended. Earlier entries come from the client
 * and can be anything. IPv4-mapped IPv6 addresses are folded to plain IPv4.
 */
export function clientIp(forwarded: string | string[] | undefined, remoteAddress: string | undefined, trustProxy: boolean): string {
  const header = Array.isArray(forwarded) ? forwarded.join(',') : forwarded;
  const last = trustProxy && header ? header.split(',').at(-1)!.trim() : '';
  const ip = last || remoteAddress || 'unknown';
  return ip.startsWith('::ffff:') && ip.includes('.') ? ip.slice(7) : ip;
}
