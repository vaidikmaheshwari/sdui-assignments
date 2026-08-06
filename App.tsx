import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import homePayloadRaw from './payloads/home.json';
import homeTileCompositePayloadRaw from './payloads/home-tile-composite.json';
import { parsePayload } from './src/sdui/core/schema';
import { registry } from './src/sdui/components';
import { SDUIScreen } from './src/sdui/screens/SDUIScreen';
import { markTTR, markFullRender } from './src/perf/benchmarkMarkers';

// Measurement scaffolding for the §4.3 tile benchmark (docs/SCHEMA.md §4.3) — picks which
// payload variant to build, so both can be release-built without a second entry point.
// Remove once the tile composite question is resolved.
const activePayloadRaw =
  process.env.EXPO_PUBLIC_SDUI_PAYLOAD === 'tile-composite' ? homeTileCompositePayloadRaw : homePayloadRaw;

const parsedHome = parsePayload(activePayloadRaw);

// eslint-disable-next-line no-console
console.log(
  `SDUI_VARIANT ${process.env.EXPO_PUBLIC_SDUI_PAYLOAD === 'tile-composite' ? 'tile-composite' : 'composition'}`
);

export default function App() {
  if (!parsedHome.success) {
    // eslint-disable-next-line no-console
    console.warn('[sdui:home] payload failed schema validation', parsedHome.error);
    return (
      <SafeAreaProvider>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>
            payloads/home.json failed schema validation — see console for details.
          </Text>
          <StatusBar style="auto" />
        </View>
      </SafeAreaProvider>
    );
  }

  useEffect(() => {
    markTTR();
  }, []);

  return (
    <SafeAreaProvider>
      <SDUIScreen payload={parsedHome.data} registry={registry} onContentSizeChange={markFullRender} />
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
