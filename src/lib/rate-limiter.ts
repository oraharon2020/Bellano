/**
 * Simple in-memory rate limiter for API routes.
 * Tracks requests per IP within a sliding time window.
 * 
 * Note: On Vercel serverless, each function instance has its own memory,
 * so this provides per-instance protection. For most cases this is sufficient.
 */

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();

// Clean up expired entries every 5 minutes to prevent memory leaks
const CLEANUP_INTERVAL = 5 * 60 * 1000;
let lastCleanup = Date.now();

function cleanup() {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL) return;
  
  lastCleanup = now;
  for (const [key, entry] of rateLimitStore.entries()) {
    if (now > entry.resetTime) {
      rateLimitStore.delete(key);
    }
  }
}

interface RateLimitOptions {
  /** Maximum number of requests allowed within the window */
  maxRequests: number;
  /** Time window in seconds */
  windowSeconds: number;
  /** Prefix to namespace different limiters (e.g., 'create-order', 'create-payment') */
  prefix: string;
}

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetIn: number; // seconds until reset
}

/**
 * Check if a request is within rate limits.
 * 
 * @param ip - The client IP address
 * @param options - Rate limit configuration
 * @returns Whether the request is allowed
 */
export function checkRateLimit(ip: string, options: RateLimitOptions): RateLimitResult {
  cleanup();
  
  const key = `${options.prefix}:${ip}`;
  const now = Date.now();
  const windowMs = options.windowSeconds * 1000;
  
  const entry = rateLimitStore.get(key);
  
  // No existing entry or window expired — allow and start fresh
  if (!entry || now > entry.resetTime) {
    rateLimitStore.set(key, {
      count: 1,
      resetTime: now + windowMs,
    });
    return {
      allowed: true,
      remaining: options.maxRequests - 1,
      resetIn: options.windowSeconds,
    };
  }
  
  // Within window — check count
  if (entry.count < options.maxRequests) {
    entry.count++;
    return {
      allowed: true,
      remaining: options.maxRequests - entry.count,
      resetIn: Math.ceil((entry.resetTime - now) / 1000),
    };
  }
  
  // Rate limited
  return {
    allowed: false,
    remaining: 0,
    resetIn: Math.ceil((entry.resetTime - now) / 1000),
  };
}

/**
 * Extract client IP from Next.js request.
 * Checks x-forwarded-for (set by Vercel/proxies) first.
 */
export function getClientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    // x-forwarded-for can contain multiple IPs: client, proxy1, proxy2
    return forwarded.split(',')[0].trim();
  }
  
  const realIp = request.headers.get('x-real-ip');
  if (realIp) return realIp.trim();
  
  return 'unknown';
}
