import { useEffect, useMemo, useRef, useState } from 'react';
import { InteractionManager, StyleSheet, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import homePayloadRaw from './payloads/home.json';
import homeTileCompositePayloadRaw from './payloads/home-tile-composite.json';
import { resolvePayload, type ResolvedPayload } from './src/sdui/core/resolvePayload';
import { setNodeMemoEnabled } from './src/sdui/core/SDUINode';
import { setImagePreloadEnabled, setPreloadedImageLoadReporter } from './src/sdui/components/atoms/image';
import { registry } from './src/sdui/components';
import { SDUIScreen } from './src/sdui/screens/SDUIScreen/SDUIScreen';
import { StaticHome } from './src/screens/StaticHome';
import { PayloadSwitcher } from './src/demo/PayloadSwitcher';
import { ActionBanner } from './src/demo/ActionBanner';
import { catalogEntry, DEFAULT_PAYLOAD_ID } from './src/demo/payloadCatalog';
import { useActionEffects } from './src/demo/useActionEffects';
import { P7, P7_ENABLED, P7_VARIANT_LABEL } from './src/perf/p7Flags';
import { fetchPayload } from './src/perf/payloadSource';
import { collectPreloadUrls, prefetchPreloadUrls } from './src/perf/preloadImages';
import {
  markTTR,
  markFullRender,
  markAppStart,
  markPayloadReceived,
  markParseEnd,
  markValidateEnd,
  markFirstPaint,
  markInteractive,
  markFullRenderP6,
  markSwapEnd,
  registerPreloadCount,
  reportPreloadedImageLoaded,
} from './src/perf/benchmarkMarkers';

// P6 (docs/PROMPTS.md P6): this module evaluating is the earliest point available to mark
// "app start" — true process start is `am start -W`'s own TotalTime, measured outside the app.
markAppStart();

// Measurement scaffolding for the §4.3 tile benchmark and the P6 static-twin benchmark — picks
// which variant to build, so all three can be release-built without a second entry point.
const SDUI_VARIANT: 'composition' | 'tile-composite' | 'static' =
  process.env.EXPO_PUBLIC_SDUI_PAYLOAD === 'static'
    ? 'static'
    : process.env.EXPO_PUBLIC_SDUI_PAYLOAD === 'tile-composite'
      ? 'tile-composite'
      : 'composition';
const IS_STATIC = SDUI_VARIANT === 'static';

// Demo host (docs/PROMPTS.md P9 — the submission's screen recording). Off unless explicitly
// asked for, and additionally refused for the static twin and for any P7 build, so that every
// measured variant in PERF.md runs the exact code path it was measured on. A benchmark build
// cannot accidentally acquire a payload picker, because no benchmark script sets this flag.
const DEMO_ENABLED = process.env.EXPO_PUBLIC_SDUI_DEMO === '1' && !IS_STATIC && !P7_ENABLED;

// P7 flags are process-wide switches inside core/**, set once here rather than threaded through
// the render tree: they exist to make one build differ from another, not to vary per node.
setNodeMemoEnabled(P7.nodeMemo);
// Both item 5 variants raise priority; only v1 also prefetches. That single difference is what
// the opt5 → opt5b comparison isolates.
setImagePreloadEnabled(P7.imagePreload || P7.imagePreloadV2);
setPreloadedImageLoadReporter(reportPreloadedImageLoaded);

// home.json is the bundled last-known-good (SCHEMA.md §9/§10.6): a malformed envelope or a
// minClientSchemaVersion this build can't satisfy falls back to it instead of blanking the page.
// The static variant has no payload at all, so none of this runs for it.
//
// P7 splits this into two worlds:
//   - P7 off (§4.3 / P6 builds, unchanged): resolve the bundled payload at module scope. Metro
//     already turned the JSON into an object at bundle time, so there is no runtime parse here.
//   - P7 on: the payload comes off the wire (src/perf/payloadSource.ts). The *baseline* waits
//     for it before rendering anything; item 1 (cacheFirst) renders the bundled copy first and
//     swaps. That difference is the whole of item 1.
let bundledResolved: ResolvedPayload | undefined;
let fatalError: unknown;
if (!IS_STATIC && (!P7_ENABLED || P7.cacheFirst)) {
  const activePayloadRaw = SDUI_VARIANT === 'tile-composite' ? homeTileCompositePayloadRaw : homePayloadRaw;
  if (!P7_ENABLED) {
    markPayloadReceived();
    markParseEnd();
  }
  try {
    bundledResolved = resolvePayload(activePayloadRaw, homePayloadRaw);
    if (!P7_ENABLED) markValidateEnd();
  } catch (error) {
    fatalError = error;
  }
}

// eslint-disable-next-line no-console
console.log(`SDUI_VARIANT ${SDUI_VARIANT}`);
// eslint-disable-next-line no-console
console.log(`SDUI_P7_OPT ${P7_VARIANT_LABEL}`);

export default function App() {
  // P7 on: `resolved` starts as the bundled payload for item 1 and as undefined for every other
  // variant, which is exactly the difference being measured.
  const [resolved, setResolved] = useState<ResolvedPayload | undefined>(bundledResolved);
  const [networkError, setNetworkError] = useState<unknown>();
  const swapPending = useRef(false);

  // Demo-only. Both hooks run unconditionally (rules of hooks) but produce nothing when the demo
  // host is off: `demoResolved` stays undefined and `effects` is never dispatched to, since no
  // benchmark run taps anything.
  const [demoPayloadId, setDemoPayloadId] = useState(DEFAULT_PAYLOAD_ID);
  const demoResolved = useMemo(
    () => (DEMO_ENABLED ? resolvePayload(catalogEntry(demoPayloadId).raw, homePayloadRaw) : undefined),
    [demoPayloadId]
  );
  const { effects, lastEffect, dismiss } = useActionEffects();

  // With the demo host off this is `resolved` by identity, so every marker below and every
  // dependency array is unchanged from the build PERF.md measured.
  const active = DEMO_ENABLED ? demoResolved : resolved;

  useEffect(() => {
    if (IS_STATIC || !P7_ENABLED) return;
    let cancelled = false;
    void (async () => {
      try {
        const { raw, byteLength } = await fetchPayload();
        // eslint-disable-next-line no-console
        console.log(`SDUI_P7_BYTES ${byteLength}`);
        const next = resolvePayload(raw, homePayloadRaw);
        markValidateEnd();
        if (cancelled) return;
        // Item 1 only: this setState replaces an already-mounted tree. swapPending makes the
        // *commit* observable, so the cost of the swap is reported rather than hidden behind
        // the win it pays for.
        if (P7.cacheFirst) swapPending.current = true;
        setResolved(next);
      } catch (error) {
        // Greppable: a release build silently failing to reach the payload server produces a
        // blank page and a marker set that just stops after appStart, which reads like a hang
        // rather than a network error. It cost a debugging cycle here before this line existed
        // (release manifests block cleartext — see scripts/p7-enable-cleartext.sh).
        // eslint-disable-next-line no-console
        console.log(`SDUI_P7_FETCH_ERROR ${String(error)}`);
        if (!cancelled) setNetworkError(error);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (swapPending.current) {
      swapPending.current = false;
      markSwapEnd();
    }
  }, [resolved]);

  // Item 5's denominator. Registered from whichever payload is currently rendering, so the
  // count matches the tree that will actually fire onLoad — and so the count is identical in
  // every variant, which is what makes aboveFoldImagesLoaded comparable across them.
  useEffect(() => {
    if (IS_STATIC || !active) return;
    const urls = collectPreloadUrls(active.payload);
    registerPreloadCount(urls.length);
    // v1 only. v2 deliberately issues no request of its own — see prefetchPreloadUrls.
    if (P7.imagePreload) prefetchPreloadUrls(urls);
  }, [active]);

  useEffect(() => {
    if (!IS_STATIC) markTTR();
  }, []);

  // `interactive` is registered once there is something to be interactive *with*. Under P7 the
  // baseline renders nothing until the payload lands, so registering this at mount (as P6 did)
  // would have timed an empty screen becoming idle and reported it as a win.
  useEffect(() => {
    if (!IS_STATIC && !active) return;
    const handle = InteractionManager.runAfterInteractions(markInteractive);
    return () => handle.cancel();
  }, [active]);

  if (IS_STATIC) {
    return (
      <SafeAreaProvider>
        <StaticHome
          onFirstPaint={markFirstPaint}
          onContentSizeChange={markFullRenderP6}
        />
        <StatusBar style="auto" />
      </SafeAreaProvider>
    );
  }

  if (!active) {
    // Under P7 this is the pre-payload state of every non-cache-first variant: a blank page for
    // as long as the network takes. That blank window is precisely what item 1 removes, so it
    // is left genuinely blank rather than filled with a spinner or skeleton that would muddy
    // what firstPaint means.
    if (P7_ENABLED && !networkError) {
      return (
        <SafeAreaProvider>
          <View style={styles.errorContainer} />
          <StatusBar style="auto" />
        </SafeAreaProvider>
      );
    }
    // eslint-disable-next-line no-console
    console.warn('[sdui:home] payload could not be resolved', fatalError ?? networkError);
    return (
      <SafeAreaProvider>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>
            payloads/home.json (the bundled last-known-good) failed schema validation — see console
            for details.
          </Text>
          <StatusBar style="auto" />
        </View>
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <SDUIScreen
        // Remounting on payload change resets the page-local state, which `useReducer` seeds
        // only at mount. Without it, switching to a payload whose `state` block differs would
        // render the new tree against the previous screen's state.
        key={DEMO_ENABLED ? demoPayloadId : undefined}
        payload={active.payload}
        registry={registry}
        effects={effects}
        honourDeferred={P7.deferSections}
        onFirstPaint={markFirstPaint}
        onContentSizeChange={() => {
          markFullRender();
          markFullRenderP6();
        }}
      />
      {DEMO_ENABLED && (
        <>
          <ActionBanner effect={lastEffect} onDismiss={dismiss} />
          <PayloadSwitcher
            value={demoPayloadId}
            onChange={setDemoPayloadId}
            degradedReason={active.degraded ? active.reason : undefined}
          />
        </>
      )}
      <StatusBar style="auto" />
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  errorContainer: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  errorText: {
    textAlign: 'center',
  },
});
