/**
 * The payloads the demo host can render, and what each one exists to prove.
 *
 * This is host chrome, not part of the SDUI system: `src/sdui/core/**` still knows nothing about
 * which payloads exist, and nothing here is reachable from a benchmark build (see
 * `DEMO_ENABLED` in App.tsx). The catalog exists so the recording can reach the fixtures that
 * until now were reachable only from Jest.
 */
import homeRaw from '../../payloads/home.json';
import pdpRaw from '../../payloads/pdp.json';
import listingRaw from '../../payloads/listing.json';
import homeUnknownRaw from '../../payloads/home-unknown.json';
import homeTooNewRaw from '../../payloads/home-too-new.json';
import carCardVersionsRaw from '../../payloads/car-card-versions.json';
import homeTileCompositeRaw from '../../payloads/home-tile-composite.json';

export interface CatalogEntry {
  readonly id: string;
  readonly label: string;
  /** One line on what this payload demonstrates — shown in the picker, and narratable on camera. */
  readonly proves: string;
  readonly raw: unknown;
}

export const PAYLOAD_CATALOG: readonly CatalogEntry[] = [
  {
    id: 'home',
    label: 'home.json',
    proves: 'Reference screen — 12 sections, rail + grid, chips drive set_state',
    raw: homeRaw,
  },
  {
    id: 'pdp',
    label: 'pdp.json',
    proves: 'Second screen, zero new components — tenure selector + bottom sheet',
    raw: pdpRaw,
  },
  {
    id: 'listing',
    label: 'listing.json',
    proves: 'Third screen — filter chips over two grids',
    raw: listingRaw,
  },
  {
    id: 'home-unknown',
    label: 'home-unknown.json',
    proves: 'Two unknown component types: one declares a fallback, one does not',
    raw: homeUnknownRaw,
  },
  {
    id: 'home-too-new',
    label: 'home-too-new.json',
    proves: 'minClientSchemaVersion 9.9.9 — degrades to the bundled last-known-good',
    raw: homeTooNewRaw,
  },
  {
    id: 'car-card-versions',
    label: 'car-card-versions.json',
    proves: 'car_card@1 and car_card@2 rendering side by side',
    raw: carCardVersionsRaw,
  },
  {
    id: 'home-tile-composite',
    label: 'home-tile-composite.json',
    proves: 'PERF.md §4.3 variant — tile as a composite instead of composed',
    raw: homeTileCompositeRaw,
  },
];

export const DEFAULT_PAYLOAD_ID = 'home';

export function catalogEntry(id: string): CatalogEntry {
  return PAYLOAD_CATALOG.find((entry) => entry.id === id) ?? PAYLOAD_CATALOG[0];
}
