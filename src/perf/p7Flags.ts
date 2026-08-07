/**
 * P7 optimisation flags (docs/PROMPTS.md P7).
 *
 * The P7 protocol is *isolated*: every optimisation is measured alone against one unchanged
 * baseline build, so each number is attributable to exactly one change and ordering can't
 * contaminate it. That means one release APK per variant, selected at build time — the same
 * approach `EXPO_PUBLIC_SDUI_PAYLOAD` already uses for the §4.3 and P6 variants.
 *
 * `EXPO_PUBLIC_SDUI_OPT` is a comma-separated list of opt ids:
 *   (unset)      — pre-P7 behaviour: bundled payload, no network. §4.3/P6 builds are unchanged.
 *   baseline     — P7 baseline: network-first (fetch → JSON.parse → Zod → render), no opts.
 *   opt1 … opt6  — baseline plus exactly that one optimisation.
 *   opt1,opt2,…  — the cumulative build. Spelled out explicitly rather than as an "all" alias
 *                  so the final cumulative run contains only the optimisations that actually
 *                  won, and the APK records which those were.
 */
const RAW: string = process.env.EXPO_PUBLIC_SDUI_OPT ?? '';

const enabled = new Set(
  RAW.split(',')
    .map((s) => s.trim())
    .filter(Boolean)
);

/** True when this build participates in P7 at all (i.e. uses the network payload source). */
export const P7_ENABLED = enabled.size > 0;

/** Verbatim env value, logged to logcat so a built APK can be checked against its label. */
export const P7_VARIANT_LABEL = RAW || 'none';

export const P7 = {
  /** Item 1 — render the bundled payload immediately, swap in the network payload on arrival. */
  cacheFirst: enabled.has('opt1'),
  /** Item 2 — hold back sections the payload marked `deferred` until after first interaction. */
  deferSections: enabled.has('opt2'),
  /** Item 3 — memoize node → element by id + resolved props, across container nodes too. */
  nodeMemo: enabled.has('opt3'),
  /** Item 4 — run JSON.parse on a separate worklet runtime instead of the JS thread. */
  offThreadParse: enabled.has('opt4'),
  /**
   * Item 5 v1, as originally specified — `Image.prefetch` every `preload` url *and* raise its
   * `<Image>` priority. Kept, and kept measurable, because it regressed badly (PERF.md P7 item
   * 5: 6 of 10 runs never finished loading the above-fold images) and deleting it would delete
   * the evidence.
   */
  imagePreload: enabled.has('opt5'),
  /**
   * Item 5 v2 — priority only, no prefetch. The regression came from prefetching urls that
   * mounted `<Image>` components were already requesting: one image, two in-flight requests.
   * `priority: 'high'` reorders the queue expo-image already has instead of adding to it.
   */
  imagePreloadV2: enabled.has('opt5b'),
  /** Item 6 — request the MessagePack encoding of the payload instead of JSON. */
  msgpack: enabled.has('opt6'),
} as const;

/**
 * Reached over `adb reverse tcp:8787 tcp:8787`, so from the device this really is localhost.
 * See scripts/payload-server.js for why the server injects a fixed latency.
 */
export const PAYLOAD_HOST = process.env.EXPO_PUBLIC_SDUI_HOST ?? 'http://127.0.0.1:8787';
