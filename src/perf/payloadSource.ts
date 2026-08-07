/**
 * P7 network payload source (docs/PROMPTS.md P7 items 1, 4, 6).
 *
 * Before P7 there was no network path: App.tsx imported payloads/home.json as a Metro-bundled
 * module, which Metro had already turned into a JS object at build time. App.tsx said so
 * explicitly — "there is no separate runtime JSON.parse step here". Items 1, 4 and 6 all
 * presuppose bytes arriving over a wire, so this module is the wire.
 *
 * Fires the P6 markers at their original meanings:
 *   payloadReceived — bytes are in hand (response body fully read)
 *   parseEnd        — bytes have become a JS object (JSON.parse, or MessagePack decode)
 * so `parseEnd - payloadReceived` is decode cost alone, which is what item 6 turns on.
 */
import { decode as msgpackDecode } from '@msgpack/msgpack';
import { markPayloadReceived, markParseEnd } from './benchmarkMarkers';
import { P7, PAYLOAD_HOST } from './p7Flags';
import { parseJsonOffThread, offThreadParseFailure } from './offThreadParse';

export interface FetchedPayload {
  raw: unknown;
  /** Bytes actually transferred, for the item 6 wire-size comparison. */
  byteLength: number;
  /** Set when a variant's intended decode path failed and a fallback was used instead. */
  degradedTo?: string;
}

// `text.length` is UTF-16 code units, not bytes — the payload contains ₹ and other non-ASCII,
// so it under-reports JSON while the msgpack path reports true bytes. Comparing those two
// directly would have quietly biased item 6. Content-Length is the actual wire size for both.
function wireBytes(res: Response, fallback: number): number {
  const header = res.headers.get('content-length');
  const parsed = header === null ? NaN : Number(header);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export async function fetchPayload(): Promise<FetchedPayload> {
  if (P7.msgpack) {
    const res = await fetch(`${PAYLOAD_HOST}/home.msgpack`);
    const buffer = await res.arrayBuffer();
    markPayloadReceived();
    const raw = msgpackDecode(new Uint8Array(buffer));
    markParseEnd();
    return { raw, byteLength: wireBytes(res, buffer.byteLength) };
  }

  const res = await fetch(`${PAYLOAD_HOST}/home.json`);
  const text = await res.text();
  markPayloadReceived();

  if (P7.offThreadParse) {
    try {
      const raw = await parseJsonOffThread(text);
      markParseEnd();
      return { raw, byteLength: wireBytes(res, text.length) };
    } catch (error) {
      // Recorded, not swallowed: item 4 producing a negative result is a legitimate outcome,
      // but it must be visible in the run rather than silently reading as a JS-thread parse.
      offThreadParseFailure(error);
    }
  }

  const raw = JSON.parse(text) as unknown;
  markParseEnd();
  return {
    raw,
    byteLength: wireBytes(res, text.length),
    degradedTo: P7.offThreadParse ? 'js-thread JSON.parse (worklet path failed)' : undefined,
  };
}
