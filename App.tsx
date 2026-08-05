import { StyleSheet, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import homePayloadRaw from './payloads/home.json';
import { parsePayload } from './src/sdui/core/schema';
import { registry } from './src/sdui/components';
import { SDUIScreen } from './src/sdui/screens/SDUIScreen';

const parsedHome = parsePayload(homePayloadRaw);

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

  return (
    <SafeAreaProvider>
      <SDUIScreen payload={parsedHome.data} registry={registry} />
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
