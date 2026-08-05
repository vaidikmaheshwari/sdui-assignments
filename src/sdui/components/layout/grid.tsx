import React from 'react';
import { View, type ViewStyle } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { z } from 'zod';
import type { ComponentDefinition, SDUINode } from '../../core/types';

const propsSchema = z.object({
  columns: z.number().int().min(1).default(2),
  gap: z.number().default(0),
  aspectRatio: z.number().optional(),
});

type GridProps = z.infer<typeof propsSchema>;

export const grid: ComponentDefinition<GridProps> = {
  type: 'grid',
  typeVersion: 1,
  propsSchema,
  defaults: propsSchema.parse({}),
  Component: ({ id, props, style, childNodes, renderNode }) => (
    <FlashList
      testID={id}
      style={style as ViewStyle}
      data={childNodes ?? []}
      numColumns={props.columns}
      keyExtractor={(item: SDUINode) => item.id}
      renderItem={({ item }: { item: SDUINode }) => (
        <View style={{ padding: props.gap / 2, aspectRatio: props.aspectRatio }}>
          {renderNode?.(item) ?? null}
        </View>
      )}
    />
  ),
};
