import { Injectable } from '@nestjs/common';
import crypto from 'node:crypto';
import { createRemoteJWKSet, jwtVerify } from 'jose';
import { and, eq } from 'drizzle-orm';
import { db } from '../db/database';
import { users } from '../db/schema';

const publicIssuer = process.env.OIDC_PUBLIC_ISSUER!;
const internalIssuer = process.env.OIDC_INTERNAL_ISSUER!;
const clientId = process.env.OIDC_CLIENT_ID!;
const jwks = createRemoteJWKSet(new URL(`${internalIssuer}/protocol/openid-connect/certs`));

@Injectable()
export class AuthService {
  private async discovery() { const response = await fetch(`${internalIssuer}/.well-known/openid-configuration`); if (!response.ok) throw new Error('OIDC discovery failed'); return response.json(); }
  private internalEndpoint(endpoint: string) { const target = new URL(endpoint); const internal = new URL(internalIssuer); target.protocol = internal.protocol; target.hostname = internal.hostname; target.port = internal.port; return target.toString(); }

  async login(session: any, forceLogin = false) {
    const state = crypto.randomBytes(24).toString('hex');
    const nonce = crypto.randomBytes(24).toString('hex');
    const codeVerifier = crypto.randomBytes(48).toString('base64url');
    const codeChallenge = crypto.createHash('sha256').update(codeVerifier).digest('base64url');
    session.oidc = { state, nonce, codeVerifier };
    const config = await this.discovery();
    const url = new URL(config.authorization_endpoint);
    const publicUrl = new URL(publicIssuer);
    url.protocol = publicUrl.protocol; url.hostname = publicUrl.hostname; url.port = publicUrl.port;
    const params: Record<string, string> = { client_id: clientId, redirect_uri: process.env.OIDC_REDIRECT_URI!, response_type: 'code', scope: 'openid profile email roles', state, nonce, code_challenge: codeChallenge, code_challenge_method: 'S256' };
    if (forceLogin) params.prompt = 'login';
    url.search = new URLSearchParams(params).toString();
    return url.toString();
  }

  async callback(code: string, session: any) {
    if (!session.oidc) throw new Error('OIDC session missing');
    const config = await this.discovery();
    const response = await fetch(this.internalEndpoint(config.token_endpoint), { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ grant_type: 'authorization_code', client_id: clientId, client_secret: process.env.OIDC_CLIENT_SECRET!, redirect_uri: process.env.OIDC_REDIRECT_URI!, code, code_verifier: session.oidc.codeVerifier }) });
    if (!response.ok) throw new Error('OIDC token exchange failed');
    const tokens = await response.json();
    const verified = await jwtVerify(tokens.id_token, jwks, { issuer: publicIssuer, audience: clientId });
    const claims: any = verified.payload;
    if (claims.nonce !== session.oidc.nonce) throw new Error('OIDC nonce mismatch');
    const local = await db.insert(users).values({ keycloakUserId: claims.sub, username: claims.preferred_username || claims.email || claims.sub, displayName: claims.name || claims.preferred_username, email: claims.email || null }).onConflictDoUpdate({ target: users.keycloakUserId, set: { username: claims.preferred_username || claims.email || claims.sub, displayName: claims.name || claims.preferred_username, email: claims.email || null, updatedAt: new Date() } }).returning();
    if (local[0].status === 'disabled') throw new Error('Account is disabled');
    return {
      user: { id: local[0].id, keycloakUserId: local[0].keycloakUserId, username: local[0].username, displayName: local[0].displayName, email: local[0].email, realmRoles: claims.realm_access?.roles || [], clientRoles: claims.resource_access?.[clientId]?.roles || [] },
      idToken: tokens.id_token,
    };
  }
}
