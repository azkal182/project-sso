import crypto from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';
import { recordHttpRequest } from './metrics';

export function requestObservability(req: Request & { requestId?: string }, res: Response, next: NextFunction) {
  const incoming = req.header('x-request-id');
  const requestId = incoming && /^[A-Za-z0-9._:-]{1,96}$/.test(incoming) ? incoming : crypto.randomUUID();
  req.requestId = requestId;
  res.setHeader('X-Request-ID', requestId);
  const startedAt = Date.now();
  res.on('finish', () => {
    const durationMs = Date.now() - startedAt;
    const route = req.route?.path || req.path;
    recordHttpRequest(req.method, route, res.statusCode, durationMs);
    console.log(JSON.stringify({ event: 'http.request', requestId, method: req.method, path: req.path, statusCode: res.statusCode, durationMs }));
  });
  next();
}
