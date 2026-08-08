import React, { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { EffectEvent } from './useActionEffects';

const VISIBLE_MS = 2400;

/**
 * Transient read-out of the last action intent the page dispatched.
 *
 * Deliberately not an SDUI component: this is the *host* reporting what it was asked to do, so
 * rendering it through the registry would blur exactly the boundary it exists to show.
 */
export function ActionBanner({
  effect,
  onDismiss,
}: {
  effect: EffectEvent | undefined;
  onDismiss: () => void;
}): React.ReactElement | null {
  const insets = useSafeAreaInsets();
  const seq = effect?.seq;

  useEffect(() => {
    if (seq === undefined) return;
    const timer = setTimeout(onDismiss, VISIBLE_MS);
    return () => clearTimeout(timer);
    // Keyed on seq so a repeat of the same intent restarts the timer rather than being swallowed.
  }, [seq, onDismiss]);

  if (!effect) return null;

  return (
    <View
      pointerEvents="none"
      style={[styles.container, { top: insets.top + 8 }]}
      testID="demo-action-banner"
    >
      <Text style={styles.kind}>{effect.kind}</Text>
      <Text style={styles.detail} numberOfLines={2}>
        {effect.detail}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 12,
    right: 12,
    backgroundColor: 'rgba(17,17,17,0.92)',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  kind: {
    color: '#7dd3fc',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  detail: {
    color: '#fff',
    fontSize: 14,
    marginTop: 2,
  },
});
