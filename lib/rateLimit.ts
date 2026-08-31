/**
 * In-memory sliding-window rate limiter, keyed by an arbitrary string (e.g.
 * `insights:${userId}`). Resets on server restart and isn't shared across
 * multiple server instances — fine for this app's scale, but not a fit for
 * a horizontally-scaled deployment (would need a shared store like Redis).
 */

const hits = new Map<string, number[]>();

export type RateLimitResult = {
  allowed: boolean;
  /** Milliseconds until the oldest hit in the window expires, when not allowed. */
  retryAfterMs: number;
};

export function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number,
): RateLimitResult {
  const now = Date.now();
  const windowStart = now - windowMs;

  const timestamps = (hits.get(key) ?? []).filter((t) => t > windowStart);

  if (timestamps.length >= limit) {
    const retryAfterMs = timestamps[0] + windowMs - now;
    hits.set(key, timestamps);
    return { allowed: false, retryAfterMs: Math.max(0, retryAfterMs) };
  }

  timestamps.push(now);
  hits.set(key, timestamps);
  return { allowed: true, retryAfterMs: 0 };
}
