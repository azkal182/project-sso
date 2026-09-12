import { describe, expect, test } from 'bun:test';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { OAuthClientDto } from '../src/applications/dto';

async function isValid(input: Record<string, unknown>) {
  const errors = await validate(plainToInstance(OAuthClientDto, input));
  return errors.length === 0;
}

describe('OAuth client configuration contract', () => {
  test('accepts exact HTTPS web redirect and origin', async () => {
    expect(await isValid({ clientId: 'attendance-web', name: 'Attendance', clientType: 'web', redirectUris: ['https://attendance.example.com/callback'], webOrigins: ['https://attendance.example.com'] })).toBe(true);
  });

  test('rejects wildcard, fragment, and non-local HTTP redirect configuration', async () => {
    expect(await isValid({ clientId: 'unsafe', name: 'Unsafe', clientType: 'web', redirectUris: ['https://example.com/*'] })).toBe(false);
    expect(await isValid({ clientId: 'unsafe', name: 'Unsafe', clientType: 'web', redirectUris: ['https://example.com/callback#token'] })).toBe(false);
    expect(await isValid({ clientId: 'unsafe', name: 'Unsafe', clientType: 'web', redirectUris: ['http://example.com/callback'] })).toBe(false);
  });

  test('allows loopback HTTP on any valid local port in production', async () => {
    const previousNodeEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    try {
      expect(await isValid({ clientId: 'local', name: 'Local', clientType: 'web', redirectUris: ['http://localhost:45678/auth/callback'], webOrigins: ['http://localhost:45678'] })).toBe(true);
      expect(await isValid({ clientId: 'local-ipv4', name: 'Local IPv4', clientType: 'web', redirectUris: ['http://127.0.0.1:4100/callback'], webOrigins: ['http://127.0.0.1:4100'] })).toBe(true);
      expect(await isValid({ clientId: 'local-ipv6', name: 'Local IPv6', clientType: 'web', redirectUris: ['http://[::1]:62000/callback'], webOrigins: ['http://[::1]:62000'] })).toBe(true);
      expect(await isValid({ clientId: 'unsafe', name: 'Unsafe', clientType: 'web', redirectUris: ['http://example.com:45678/callback'] })).toBe(false);
    } finally {
      if (previousNodeEnv === undefined) delete process.env.NODE_ENV;
      else process.env.NODE_ENV = previousNodeEnv;
    }
  });

  test('requires browser configuration only for browser-capable clients', async () => {
    expect(await isValid({ clientId: 'api', name: 'API', clientType: 'api' })).toBe(true);
    expect(await isValid({ clientId: 'api', name: 'API', clientType: 'api', redirectUris: ['https://example.com/callback'] })).toBe(false);
    expect(await isValid({ clientId: 'web', name: 'Web', clientType: 'web' })).toBe(false);
  });
});
