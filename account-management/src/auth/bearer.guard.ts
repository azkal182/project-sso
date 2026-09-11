import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { createRemoteJWKSet, jwtVerify } from 'jose';

const issuer = process.env.OIDC_PUBLIC_ISSUER!;
const jwks = createRemoteJWKSet(new URL(`${process.env.OIDC_INTERNAL_ISSUER}/protocol/openid-connect/certs`));

@Injectable()
export class BearerTokenGuard implements CanActivate {
  async canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest();
    const header = request.headers.authorization;
    if (!header?.startsWith('Bearer ')) throw new UnauthorizedException('Bearer access token required');
    try {
      const token = header.slice('Bearer '.length).trim();
      if (!token) throw new Error('empty token');
      const verified = await jwtVerify(token, jwks, { issuer });
      request.tokenClaims = verified.payload;
      return true;
    } catch {
      throw new UnauthorizedException('Invalid access token');
    }
  }
}
