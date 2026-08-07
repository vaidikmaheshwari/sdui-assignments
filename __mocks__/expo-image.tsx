import React from 'react';
import { View, type ViewProps } from 'react-native';

// expo-image's native "oversized image" telemetry hook (ExpoObserve) crashes under
// jest-expo's native-module auto-mock in this dependency combo — not reachable from
// component code. This passthrough keeps every prop visible to tests without touching it.
export function Image(props: ViewProps) {
  return <View {...props} />;
}

// P7 item 5 calls Image.prefetch (src/perf/preloadImages.ts). Resolving true keeps the
// fire-and-forget prefetch a no-op under test rather than a TypeError.
Image.prefetch = jest.fn(async () => true);
