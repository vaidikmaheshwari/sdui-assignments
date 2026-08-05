import React from 'react';
import { View, type ViewProps } from 'react-native';

// expo-image's native "oversized image" telemetry hook (ExpoObserve) crashes under
// jest-expo's native-module auto-mock in this dependency combo — not reachable from
// component code. This passthrough keeps every prop visible to tests without touching it.
export function Image(props: ViewProps) {
  return <View {...props} />;
}
