import type { NextFunction, Request, Response } from 'express';

type Bucket = { count: number; resetAt: number };

export function createRateLimitMiddleware(options: { name: string; windowMs: number; max: number; key?: (req: Request) => string }) {
  const buckets = new Map<string, Bucket>();
  const key = options.key || ((req: Request) => req.ip || req.socket.remoteAddress || 'unknown');
  return (req: Request, res: Response, next: NextFunction) => {
    const now = Date.now();
    if (buckets.size > 10000) for (const [bucketKey, bucket] of buckets) if (bucket.resetAt <= now) buckets.delete(bucketKey);
    const bucketKey = `${options.name}:${key(req)}`;
    const current = buckets.get(bucketKey);
    const bucket = !current || current.resetAt <= now ? { count: 0, resetAt: now + options.windowMs } : current;
    bucket.count += 1;
    buckets.set(bucketKey, bucket);
    res.setHeader('X-RateLimit-Limit', options.max);
    res.setHeader('X-RateLimit-Remaining', Math.max(0, options.max - bucket.count));
    res.setHeader('X-RateLimit-Reset', Math.ceil(bucket.resetAt / 1000));
    if (bucket.count > options.max) {
      res.setHeader('Retry-After', Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)));
      return res.status(429).json({ statusCode: 429, message: 'Too many requests' });
    }
    next();
  };
}
