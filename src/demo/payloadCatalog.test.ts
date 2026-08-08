import { resolvePayload } from '../sdui/core/resolvePayload';
import { PAYLOAD_CATALOG, DEFAULT_PAYLOAD_ID, catalogEntry } from './payloadCatalog';
import homeRaw from '../../payloads/home.json';

/**
 * The picker is the only place these fixtures are reachable outside Jest, so a fixture that
 * cannot be resolved would surface as a broken demo rather than a failed test. These assertions
 * exist so that failure lands here instead.
 */
describe('demo payload catalog', () => {
  it('every entry has a unique id', () => {
    const ids = PAYLOAD_CATALOG.map((entry) => entry.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('the default id is in the catalog', () => {
    expect(PAYLOAD_CATALOG.some((entry) => entry.id === DEFAULT_PAYLOAD_ID)).toBe(true);
    expect(catalogEntry(DEFAULT_PAYLOAD_ID).id).toBe(DEFAULT_PAYLOAD_ID);
  });

  it('an unknown id falls back to the first entry rather than throwing', () => {
    expect(catalogEntry('no-such-payload')).toBe(PAYLOAD_CATALOG[0]);
  });

  it.each(PAYLOAD_CATALOG.map((entry) => [entry.id, entry] as const))(
    '%s resolves to a renderable payload',
    (_id, entry) => {
      const resolved = resolvePayload(entry.raw, homeRaw);
      expect(resolved.payload.sections.length).toBeGreaterThan(0);
    }
  );

  it('only home-too-new degrades to the last-known-good', () => {
    const degraded = PAYLOAD_CATALOG.filter(
      (entry) => resolvePayload(entry.raw, homeRaw).degraded
    ).map((entry) => entry.id);
    // home-unknown is deliberately *not* here: an unrecognised component type is a node-local
    // degradation, not an envelope-level one, so the page still resolves as itself.
    expect(degraded).toEqual(['home-too-new']);
  });
});
