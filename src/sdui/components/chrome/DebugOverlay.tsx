import React, { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { getDevLog, type DevLogEntry } from '../../utils/devLog';

// Dev-only demo surface (docs/PROMPTS.md P5 item 5): every unknown type, failed prop and
// missing binding already logs through devLog.ts (SCHEMA.md §9's "all logs surface in a
// dev-only debug overlay"). This just gives that log a UI. Polls rather than subscribing —
// devLog is a plain array, and a poll is the simplest thing that could work for a demo surface.
const POLL_MS = 500;

export function DebugOverlay(): React.ReactElement | null {
  const [open, setOpen] = useState(false);
  const [entries, setEntries] = useState<DevLogEntry[]>(() => getDevLog());

  useEffect(() => {
    const id = setInterval(() => setEntries([...getDevLog()]), POLL_MS);
    return () => clearInterval(id);
  }, []);

  if (!__DEV__) return null;

  return (
    <View pointerEvents="box-none" style={styles.root}>
      <Pressable
        testID="sdui-debug-overlay-toggle"
        style={styles.badge}
        onPress={() => setOpen((value) => !value)}
      >
        <Text style={styles.badgeText}>{open ? '✕' : `⚠ ${entries.length}`}</Text>
      </Pressable>
      {open && (
        <View testID="sdui-debug-overlay-panel" style={styles.panel}>
          <Text style={styles.panelTitle}>SDUI degradations — last render ({entries.length})</Text>
          <ScrollView style={styles.list}>
            {entries.length === 0 && <Text style={styles.entryText}>None.</Text>}
            {entries.map((entry, index) => (
              <Text key={index} style={styles.entryText}>
                [{entry.source}] {entry.message}
              </Text>
            ))}
          </ScrollView>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { position: 'absolute', right: 12, bottom: 24, zIndex: 999 },
  badge: {
    backgroundColor: '#E03131',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    alignSelf: 'flex-end',
  },
  badgeText: { color: '#FFFFFF', fontWeight: '600' },
  panel: {
    marginTop: 8,
    width: 300,
    maxHeight: 320,
    backgroundColor: '#101828',
    borderRadius: 8,
    padding: 8,
  },
  panelTitle: { color: '#FFFFFF', fontWeight: '600', marginBottom: 4 },
  list: { maxHeight: 280 },
  entryText: { color: '#EAECF0', fontSize: 12, marginBottom: 4 },
});
