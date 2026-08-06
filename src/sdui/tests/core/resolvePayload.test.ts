import fs from 'fs';
import path from 'path';
import { resolvePayload, CLIENT_SCHEMA_VERSION } from '../../core/resolvePayload';
import { clearDevLog, getDevLog } from '../../utils/devLog';
import type { Payload } from '../../core/types';

const homeRaw = JSON.parse(
  fs.readFileSync(path.join(__dirname, '../../../../payloads/home.json'), 'utf-8')
);
const homeTooNewRaw = JSON.parse(
  fs.readFileSync(path.join(__dirname, '../../../../payloads/home-too-new.json'), 'utf-8')
);

describe('resolvePayload', () => {
  test('a normal payload passes through unchanged and is not marked degraded', () => {
    const result = resolvePayload(homeRaw, homeRaw);
    expect(result.degraded).toBe(false);
    expect(result.reason).toBeUndefined();
    expect((result.payload as Payload).screenId).toBe('home');
  });

  test('minClientSchemaVersion above the client version falls back to the last-known-good and logs why', () => {
    clearDevLog();
    expect((homeTooNewRaw as Payload).minClientSchemaVersion).toBe('9.9.9');

    const result = resolvePayload(homeTooNewRaw, homeRaw, CLIENT_SCHEMA_VERSION);

    expect(result.degraded).toBe(true);
    expect(result.reason).toContain('minClientSchemaVersion 9.9.9');
    expect((result.payload as Payload).screenId).toBe('home');

    const log = getDevLog();
    expect(log.some((e) => e.message.includes('minClientSchemaVersion 9.9.9'))).toBe(true);
  });

  test('minClientSchemaVersion at or below the client version is not a degradation', () => {
    const payload = { ...homeRaw, minClientSchemaVersion: '1.0.0' };
    const result = resolvePayload(payload, homeRaw, CLIENT_SCHEMA_VERSION);
    expect(result.degraded).toBe(false);
  });

  test('a malformed envelope falls back to the last-known-good and logs why', () => {
    clearDevLog();
    const malformed = { screenId: 'home' }; // missing required schemaVersion/sections
    const result = resolvePayload(malformed, homeRaw);

    expect(result.degraded).toBe(true);
    expect(result.reason).toContain('malformed payload envelope');
    expect((result.payload as Payload).screenId).toBe('home');

    const log = getDevLog();
    expect(log.some((e) => e.message.includes('malformed payload envelope'))).toBe(true);
  });

  test('throws if even the bundled last-known-good fails to parse — a build-time bug, not a runtime degradation', () => {
    const malformed = { screenId: 'home' };
    expect(() => resolvePayload(malformed, malformed)).toThrow(/last-known-good/);
  });
});
