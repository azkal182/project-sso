import crypto from 'node:crypto';

export function ensureCsrfToken(req: any, _res: any, next: () => void) {
  if (!req.session.csrfToken) req.session.csrfToken = crypto.randomBytes(32).toString('base64url');
  next();
}

export function verifyCsrfToken(req: any, res: any, next: () => void) {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();
  if (!req.path.startsWith('/api/') && req.path !== '/auth/logout') return next();
  const expected = req.session?.csrfToken;
  const received = req.header('x-csrf-token');
  if (!expected || !received || received.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(received))) return res.status(403).json({ statusCode: 403, message: 'Invalid CSRF token' });
  next();
}
