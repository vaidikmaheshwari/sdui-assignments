import { parsePayload } from './schema';
import type { Payload } from './types';
import { warn } from '../utils/devLog';

// The version this build of the client advertises (SCHEMA.md §10.1's `X-SDUI-Schema` header
// on the network side; this is the same number used locally to gate `minClientSchemaVersion`).
export const CLIENT_SCHEMA_VERSION = '1.1.0';

function compareSemver(a: string, b: string): number {
  const pa = a.split('.').map(Number);
  const pb = b.split('.').map(Number);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const diff = (pa[i] ?? 0) - (pb[i] ?? 0);
    if (diff !== 0) return diff;
  }
  return 0;
}

export interface ResolvedPayload {
  payload: Payload;
  degraded: boolean;
  reason?: string;
}

/**
 * SCHEMA.md §9: a malformed envelope or a `minClientSchemaVersion` this client can't satisfy
 * both fall back to the bundled last-known-good payload rather than blanking the page.
 * `lastKnownGoodRaw` is supplied by the caller (an app-level bundled asset) — core has no
 * opinion on which payload that is.
 */
export function resolvePayload(
  raw: unknown,
  lastKnownGoodRaw: unknown,
  clientVersion: string = CLIENT_SCHEMA_VERSION
): ResolvedPayload {
  const parsed = parsePayload(raw);
  if (!parsed.success) {
    const reason = `malformed payload envelope: ${parsed.error.issues
      .map((i) => `${i.path.join('.')} — ${i.message}`)
      .join('; ')}`;
    warn('resolvePayload', `${reason} — rendering bundled last-known-good`);
    return { payload: parseLastKnownGood(lastKnownGoodRaw), degraded: true, reason };
  }

  const required = parsed.data.minClientSchemaVersion;
  if (required && compareSemver(required, clientVersion) > 0) {
    const reason = `minClientSchemaVersion ${required} > client ${clientVersion}`;
    warn('resolvePayload', `${reason} — rendering bundled last-known-good`);
    return { payload: parseLastKnownGood(lastKnownGoodRaw), degraded: true, reason };
  }

  return { payload: parsed.data, degraded: false };
}

function parseLastKnownGood(raw: unknown): Payload {
  const parsed = parsePayload(raw);
  if (!parsed.success) {
    throw new Error(
      'bundled last-known-good payload failed schema validation — this is a build-time bug, not a runtime degradation'
    );
  }
  return parsed.data;
}
