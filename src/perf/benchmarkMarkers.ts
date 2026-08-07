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
/**
 * P7 adds two more (docs/PROMPTS.md P7). They are additive: the seven names above and the
 * two P4.5 strings keep their exact log format, so §4.3 and P6 stay reproducible.
 *
 * Item 6 (MessagePack) needs no new marker — `parseEnd - payloadReceived` already isolates
 * bytes-to-object decode cost, which is exactly the quantity in question.
 *
 * - `swapEnd` — item 1 only: the cache-first tree has been replaced by the network tree and
 *   the resulting re-render has committed. This is the *cost* side of cache-first, not its win.
 * - `aboveFoldImagesLoaded` — item 5 only: every image the payload marked `preload` has
 *   reported `onLoad`. Without this, item 5 is invisible: `fullRender` deliberately does not
 *   wait on image loads (see PERF.md §4.3 method), so preloading cannot move any existing
 *   marker and would measure as a flat no-op.
 */
export type BenchmarkMarkerName =
  | 'appStart'
  | 'payloadReceived'
  | 'parseEnd'
  | 'validateEnd'
  | 'firstPaint'
  | 'interactive'
  | 'fullRender'
  | 'swapEnd'
  | 'aboveFoldImagesLoaded';

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

export function markSwapEnd(): void {
  markBenchmark('swapEnd');
}

export function markAboveFoldImagesLoaded(): void {
  markBenchmark('aboveFoldImagesLoaded');
}

/**
 * Item 5's marker can only fire once *all* preloaded images have loaded, which no single
 * component knows. This counts them: the payload's preload count is registered up front, each
 * image reports in, and the marker fires on the last one. Registering 0 preloads means the
 * marker never fires and the benchmark reads it as N/A — correct for every variant except
 * item 5, rather than a misleading 0ms.
 */
let preloadExpected = 0;
let preloadSeen = 0;

export function registerPreloadCount(count: number): void {
  preloadExpected = count;
  preloadSeen = 0;
}

export function reportPreloadedImageLoaded(): void {
  if (preloadExpected === 0) return;
  preloadSeen += 1;
  if (preloadSeen >= preloadExpected) markAboveFoldImagesLoaded();
}
