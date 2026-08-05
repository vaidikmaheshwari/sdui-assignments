import React from 'react';
import { View, type ViewStyle } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { z } from 'zod';
import type { ComponentDefinition, SDUINode } from '../../core/types';

const propsSchema = z.object({
  spacing: z.number().default(0),
  snap: z.boolean().default(false),
  peek: z.number().default(0),
  contentInset: z.number().default(0),
  showsIndicator: z.boolean().default(false),
});

type RailProps = z.infer<typeof propsSchema>;

export const rail: ComponentDefinition<RailProps> = {
  type: 'rail',
  typeVersion: 1,
  propsSchema,
  defaults: propsSchema.parse({}),
  Component: ({ id, props, style, childNodes, renderNode }) => (
    <FlashList
      testID={id}
      style={style as ViewStyle}
      data={childNodes ?? []}
      horizontal
      showsHorizontalScrollIndicator={props.showsIndicator}
      keyExtractor={(item: SDUINode) => item.id}
      renderItem={({ item }: { item: SDUINode }) => <>{renderNode?.(item) ?? null}</>}
      ItemSeparatorComponent={() => <View style={{ width: props.spacing }} />}
      contentContainerStyle={{
        paddingLeft: props.contentInset,
        // peek trims the trailing inset so the next item bleeds toward the edge, hinting scrollability
        paddingRight: Math.max(props.contentInset - props.peek, 0),
      }}
      {...(props.snap ? { snapToAlignment: 'start' as const, decelerationRate: 'fast' as const } : {})}
    />
  ),
};
