/**
 * Measurement scaffolding for the perf benchmarks (docs/SCHEMA.md §4.3, docs/PROMPTS.md
 * P4.5 and P6). Logs one greppable marker per event to logcat, each firing at most once
 * per cold start.
 *
 * markTTR/markFullRender are the original two markers from the P4.5 tile benchmark
 * (SDUI_TTR / SDUI_FULL_RENDER) — scripts/benchmark-tile.sh still greps for these exact
 * strings and PERF.md §4.3's numbers depend on it staying reproducible, so their log format
 * is untouched. The P6 static-twin-vs-SDUI benchmark needs five more markers; those are new
 * functions below, logged under a separate SDUI_MARK_* prefix so the two scripts never
 * collide on the same logcat line.
 */
let ttrLogged = false;
let fullRenderLogged = false;

export function markTTR(): void {
  if (ttrLogged) return;
  ttrLogged = true;
  // eslint-disable-next-line no-console
  console.log(`SDUI_TTR ${Date.now()}`);
}

export function markFullRender(): void {
  if (fullRenderLogged) return;
  fullRenderLogged = true;
  // eslint-disable-next-line no-console
  console.log(`SDUI_FULL_RENDER ${Date.now()}`);
}

/**
 * P6 markers (docs/PROMPTS.md P6): appStart, payloadReceived, parseEnd, validateEnd,
 * firstPaint, interactive, fullRender.
 *
 * payloadReceived/parseEnd/validateEnd are SDUI-only — the static twin has no JSON import,
 * no JSON.parse, and no Zod validation, and never calls them. scripts/benchmark-p6.sh treats
 * a marker that never appears in logcat for a given run as N/A for that variant, not 0ms.
 */
export type BenchmarkMarkerName =
  | 'appStart'
  | 'payloadReceived'
  | 'parseEnd'
  | 'validateEnd'
  | 'firstPaint'
  | 'interactive'
  | 'fullRender';

const logged = new Set<BenchmarkMarkerName>();

export function markBenchmark(name: BenchmarkMarkerName): void {
  if (logged.has(name)) return;
  logged.add(name);
  // eslint-disable-next-line no-console
  console.log(`SDUI_MARK_${name} ${Date.now()}`);
}

export function markAppStart(): void {
  markBenchmark('appStart');
}

export function markPayloadReceived(): void {
  markBenchmark('payloadReceived');
}

export function markParseEnd(): void {
  markBenchmark('parseEnd');
}

export function markValidateEnd(): void {
  markBenchmark('validateEnd');
}

export function markFirstPaint(): void {
  markBenchmark('firstPaint');
}

export function markInteractive(): void {
  markBenchmark('interactive');
}

export function markFullRenderP6(): void {
  markBenchmark('fullRender');
}
