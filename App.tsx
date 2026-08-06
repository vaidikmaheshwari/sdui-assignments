import { useEffect } from 'react';
import { InteractionManager, StyleSheet, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import homePayloadRaw from './payloads/home.json';
import homeTileCompositePayloadRaw from './payloads/home-tile-composite.json';
import { resolvePayload } from './src/sdui/core/resolvePayload';
import { registry } from './src/sdui/components';
import { SDUIScreen } from './src/sdui/screens/SDUIScreen';
import { StaticHome } from './src/screens/StaticHome';
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

// home.json is the bundled last-known-good (SCHEMA.md §9/§10.6): a malformed envelope or a
// minClientSchemaVersion this build can't satisfy falls back to it instead of blanking the page.
// The static variant has no payload at all, so none of this runs for it.
let resolved: ReturnType<typeof resolvePayload> | undefined;
let fatalError: unknown;
if (!IS_STATIC) {
  const activePayloadRaw = SDUI_VARIANT === 'tile-composite' ? homeTileCompositePayloadRaw : homePayloadRaw;
  markPayloadReceived();
  try {
    // The payload is a bundled JSON module (already structurally parsed by Metro at bundle
    // time), so there is no separate runtime JSON.parse step here — parseEnd/validateEnd both
    // bracket the one real cost this architecture has: resolvePayload's Zod validation.
    markParseEnd();
    resolved = resolvePayload(activePayloadRaw, homePayloadRaw);
    markValidateEnd();
  } catch (error) {
    fatalError = error;
  }
}

// eslint-disable-next-line no-console
console.log(`SDUI_VARIANT ${SDUI_VARIANT}`);

export default function App() {
  useEffect(() => {
    if (!IS_STATIC) markTTR();
    const handle = InteractionManager.runAfterInteractions(markInteractive);
    return () => handle.cancel();
  }, []);

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

  if (!resolved) {
    // eslint-disable-next-line no-console
    console.warn('[sdui:home] payload could not be resolved', fatalError);
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
        payload={resolved.payload}
        registry={registry}
        onFirstPaint={markFirstPaint}
        onContentSizeChange={() => {
          markFullRender();
          markFullRenderP6();
        }}
      />
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
