/**
 * In-memory sliding-window rate limiter for Next.js route handlers.
 * Protects public endpoints (like feedback and token issuance) against
 * denial-of-service, scraping, and brute-force abuse.
 */

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

class MemoryRateLimiter {
  private map = new Map<string, RateLimitEntry>();
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor() {
    // Periodically prune stale entries to prevent memory leaks
    if (typeof setInterval !== "undefined") {
      this.cleanupInterval = setInterval(() => this.prune(), 60_000);
      if (this.cleanupInterval.unref) {
        this.cleanupInterval.unref();
      }
    }
  }

  private prune() {
    const now = Date.now();
    for (const [key, entry] of this.map.entries()) {
      if (entry.resetAt <= now) {
        this.map.delete(key);
      }
    }
  }

  /**
   * Check whether the key is within rate limits.
   * @param key Unique identifier (e.g. `ip:action`)
   * @param limit Maximum allowed requests in the window
   * @param windowSeconds Window length in seconds
   * @returns `{ allowed: boolean, remaining: number, resetInSeconds: number }`
   */
  check(key: string, limit: number, windowSeconds: number): { allowed: boolean; remaining: number; resetInSeconds: number } {
    const now = Date.now();
    const entry = this.map.get(key);

    if (!entry || entry.resetAt <= now) {
      this.map.set(key, { count: 1, resetAt: now + windowSeconds * 1000 });
      return { allowed: true, remaining: limit - 1, resetInSeconds: windowSeconds };
    }

    if (entry.count >= limit) {
      const resetInSeconds = Math.max(1, Math.ceil((entry.resetAt - now) / 1000));
      return { allowed: false, remaining: 0, resetInSeconds };
    }

    entry.count += 1;
    const resetInSeconds = Math.max(1, Math.ceil((entry.resetAt - now) / 1000));
    return { allowed: true, remaining: limit - entry.count, resetInSeconds };
  }
}

export const rateLimiter = new MemoryRateLimiter();

export function getClientIp(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    const ips = forwarded.split(",").map((ip) => ip.trim()).filter(Boolean);
    if (ips.length > 0) {
      return ips[0];
    }
  }
  const realIp = req.headers.get("x-real-ip");
  if (realIp) return realIp.trim();
  const cfConnectingIp = req.headers.get("cf-connecting-ip");
  if (cfConnectingIp) return cfConnectingIp.trim();
  return "127.0.0.1";
}

