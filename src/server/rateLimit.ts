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

  /** Takes one token; false when empty. */
  take(now: number): boolean {
    this.refill(now);
    if (this.tokens < 1) return false;
    this.tokens -= 1;
    return true;
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

/** One bucket per key (e.g. per IP). */
export class KeyedRateLimiter {
  private readonly buckets = new Map<string, TokenBucket>();
  private readonly capacity: number;
  private readonly perSecond: number;

  constructor(capacity: number, perSecond: number) {
    this.capacity = capacity;
    this.perSecond = perSecond;
  }

  take(key: string, now: number): boolean {
    let bucket = this.buckets.get(key);
    if (!bucket) {
      bucket = new TokenBucket(this.capacity, this.perSecond, now);
      this.buckets.set(key, bucket);
    }
    return bucket.take(now);
  }

  /** Forgets keys whose bucket refilled completely (they carry no information anymore). */
  sweep(now: number): void {
    for (const [key, bucket] of this.buckets) if (bucket.isFull(now)) this.buckets.delete(key);
  }
}
