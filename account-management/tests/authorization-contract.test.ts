import { strict as assert } from 'node:assert';
import { test, after } from 'node:test';
import { exportJWK, generateKeyPair, SignJWT } from 'jose';

process.env.OIDC_PUBLIC_ISSUER = 'http://issuer.test/realms/pondok';
process.env.OIDC_INTERNAL_ISSUER = 'http://issuer.test/realms/pondok';

const jwks = await (async () => {
  const { publicKey, privateKey } = await generateKeyPair('RS256');
  const publicJwk = await exportJWK(publicKey);
  const previousFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response(JSON.stringify({ keys: [publicJwk] }), { headers: { 'content-type': 'application/json' } });
  const guardModule = await import('../src/auth/bearer.guard');
  return { privateKey, guard: new guardModule.BearerTokenGuard(), validateTokenClaims: guardModule.validateTokenClaims, previousFetch };
})();

after(() => {
  globalThis.fetch = jwks.previousFetch;
});

async function token(overrides: Record<string, unknown> = {}, signingKey = jwks.privateKey) {
  const now = Math.floor(Date.now() / 1000);
  return new SignJWT({ iss: process.env.OIDC_PUBLIC_ISSUER, sub: 'user-1', aud: ['attendance-api'], azp: 'attendance-web', iat: now, exp: now + 300, ...overrides })
    .setProtectedHeader({ alg: 'RS256', typ: 'JWT' })
    .sign(signingKey);
}

function contextFor(jwt: string) {
  const request: any = { headers: { authorization: `Bearer ${jwt}` } };
  return { switchToHttp: () => ({ getRequest: () => request }) } as any;
}

test('accepts a signed token with valid issuer, time claims, audience, and azp', async () => {
  const request: any = contextFor(await token()).switchToHttp().getRequest();
  assert.equal(await jwks.guard.canActivate({ switchToHttp: () => ({ getRequest: () => request }) } as any), true);
  assert.equal(request.tokenClaims.sub, 'user-1');
});

test('rejects wrong issuer, expired token, future nbf, and future iat', async () => {
  await assert.rejects(async () => jwks.guard.canActivate(contextFor(await token({ iss: 'http://wrong.test' }))));
  await assert.rejects(async () => jwks.guard.canActivate(contextFor(await token({ exp: Math.floor(Date.now() / 1000) - 10 }))));
  await assert.rejects(async () => jwks.guard.canActivate(contextFor(await token({ nbf: Math.floor(Date.now() / 1000) + 120 }))));
  await assert.rejects(async () => jwks.guard.canActivate(contextFor(await token({ iat: Math.floor(Date.now() / 1000) + 120 }))));
});

test('requires structurally valid audience and authorized party claims', () => {
  assert.throws(() => jwks.validateTokenClaims({ aud: [], azp: 'client', iat: 100 }, 100));
  assert.throws(() => jwks.validateTokenClaims({ aud: ['api'], azp: '', iat: 100 }, 100));
  assert.throws(() => jwks.validateTokenClaims({ aud: ['api'], azp: 'client', iat: 200 }, 100));
  assert.deepEqual(jwks.validateTokenClaims({ aud: ['api'], azp: 'web', iat: 100 }, 100), { audience: ['api'], authorizedParty: 'web' });
});

test('requires azp and audience to resolve to clients in the same application', async () => {
  const { resolveApplicationClient } = await import('../src/authorization/authorization.controller');
  const clients = [{ clientId: 'attendance-web' }, { clientId: 'attendance-api' }];
  assert.equal(resolveApplicationClient(clients, { azp: 'attendance-web', aud: ['attendance-api'] }).clientId, 'attendance-web');
  assert.throws(() => resolveApplicationClient(clients, { azp: 'other-client', aud: ['attendance-api'] }), /not registered/);
  assert.throws(() => resolveApplicationClient(clients, { azp: 'attendance-web', aud: ['other-api'] }), /audience is not registered/);
});
