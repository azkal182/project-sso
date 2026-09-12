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

  test('requires browser configuration only for browser-capable clients', async () => {
    expect(await isValid({ clientId: 'api', name: 'API', clientType: 'api' })).toBe(true);
    expect(await isValid({ clientId: 'api', name: 'API', clientType: 'api', redirectUris: ['https://example.com/callback'] })).toBe(false);
    expect(await isValid({ clientId: 'web', name: 'Web', clientType: 'web' })).toBe(false);
  });
});
