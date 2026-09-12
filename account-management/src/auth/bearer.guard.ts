import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { createRemoteJWKSet, jwtVerify } from 'jose';

const issuer = process.env.OIDC_PUBLIC_ISSUER!;
const jwks = createRemoteJWKSet(new URL(`${process.env.OIDC_INTERNAL_ISSUER}/protocol/openid-connect/certs`));
const clockToleranceSeconds = 5;
const maxFutureIssuedAtSeconds = 60;

function claimAudience(value: unknown): string[] {
  if (typeof value === 'string') return [value];
  if (Array.isArray(value) && value.every((item) => typeof item === 'string')) return value;
  return [];
}

export function validateTokenClaims(claims: { aud?: unknown; azp?: unknown; iat?: unknown }, now = Math.floor(Date.now() / 1000)) {
  const audience = claimAudience(claims.aud);
  const authorizedParty = claims.azp;
  const issuedAt = claims.iat;
  if (!audience.length || typeof authorizedParty !== 'string' || !authorizedParty) throw new Error('invalid audience or authorized party');
  if (typeof issuedAt !== 'number' || !Number.isFinite(issuedAt) || issuedAt > now + maxFutureIssuedAtSeconds) throw new Error('invalid issued-at claim');
  return { audience, authorizedParty };
}

@Injectable()
export class BearerTokenGuard implements CanActivate {
  async canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest();
    const header = request.headers.authorization;
    if (!header?.startsWith('Bearer ')) throw new UnauthorizedException('Bearer access token required');
    try {
      const token = header.slice('Bearer '.length).trim();
      if (!token) throw new Error('empty token');
      const verified = await jwtVerify(token, jwks, {
        issuer,
        clockTolerance: clockToleranceSeconds,
        requiredClaims: ['sub', 'exp', 'iat', 'azp', 'aud'],
      });
      const claims = verified.payload;
      validateTokenClaims(claims);

      request.tokenClaims = verified.payload;
      return true;
    } catch {
      throw new UnauthorizedException('Invalid access token');
    }
  }
}
