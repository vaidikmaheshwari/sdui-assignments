import React, { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PAYLOAD_CATALOG } from './payloadCatalog';

/**
 * Floating picker over `PAYLOAD_CATALOG`.
 *
 * A floating pill rather than a top or bottom bar: `home.json` pins a header to the top and
 * `pdp.json` pins its CTA bar to the bottom, and covering either would hide the thing the
 * recording is meant to show. The pill sits clear of both.
 */
export function PayloadSwitcher({
  value,
  onChange,
  degradedReason,
}: {
  value: string;
  onChange: (id: string) => void;
  /** Set when `resolvePayload` fell back to the last-known-good — surfaced so the degradation is visible, not just logged. */
  degradedReason?: string;
}): React.ReactElement {
  const [open, setOpen] = useState(false);
  const insets = useSafeAreaInsets();
  const active = PAYLOAD_CATALOG.find((entry) => entry.id === value);

  return (
    <>
      <Pressable
        testID="demo-payload-switcher"
        onPress={() => setOpen(true)}
        style={[styles.pill, { bottom: insets.bottom + 96 }]}
      >
        <Text style={styles.pillLabel} numberOfLines={1}>
          {active?.label ?? value}
        </Text>
        {degradedReason ? <Text style={styles.pillDegraded}>degraded</Text> : null}
      </Pressable>

      <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.scrim} onPress={() => setOpen(false)} />
        <View style={[styles.sheet, { paddingBottom: insets.bottom + 16 }]}>
          <Text style={styles.title}>Payload</Text>
          <Text style={styles.subtitle}>
            Every entry is the same renderer and the same registry — only the JSON differs.
          </Text>
          {degradedReason ? (
            <View style={styles.degradedBox}>
              <Text style={styles.degradedText}>{degradedReason}</Text>
            </View>
          ) : null}
          <ScrollView style={styles.list}>
            {PAYLOAD_CATALOG.map((entry) => {
              const selected = entry.id === value;
              return (
                <Pressable
                  key={entry.id}
                  testID={`demo-payload-${entry.id}`}
                  onPress={() => {
                    onChange(entry.id);
                    setOpen(false);
                  }}
                  style={[styles.row, selected && styles.rowSelected]}
                >
                  <Text style={[styles.rowLabel, selected && styles.rowLabelSelected]}>
                    {entry.label}
                  </Text>
                  <Text style={styles.rowProves}>{entry.proves}</Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  pill: {
    position: 'absolute',
    right: 12,
    backgroundColor: 'rgba(17,17,17,0.88)',
    borderRadius: 999,
    paddingVertical: 9,
    paddingHorizontal: 14,
    maxWidth: 200,
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  pillLabel: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  pillDegraded: {
    color: '#fbbf24',
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  scrim: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingHorizontal: 16,
    paddingTop: 16,
    maxHeight: '72%',
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  degradedBox: {
    marginTop: 12,
    backgroundColor: '#fef3c7',
    borderRadius: 8,
    padding: 10,
  },
  degradedText: {
    fontSize: 12,
    color: '#92400e',
  },
  list: {
    marginTop: 12,
  },
  row: {
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 10,
    marginBottom: 6,
    backgroundColor: '#f4f4f5',
  },
  rowSelected: {
    backgroundColor: '#111',
  },
  rowLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111',
  },
  rowLabelSelected: {
    color: '#fff',
  },
  rowProves: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 3,
  },
});
