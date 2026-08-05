import React from 'react';
import { View, type ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { z } from 'zod';
import type { ComponentDefinition } from '../../core/types';
import { resolveToken } from '../../core/theme';

const propsSchema = z.object({
  value: z.number(),
  max: z.number().default(5),
});

type RatingProps = z.infer<typeof propsSchema>;

function glyphAt(position: number, value: number): 'star' | 'star-half' | 'star-outline' {
  if (position < Math.floor(value)) return 'star';
  if (position === Math.floor(value) && value % 1 > 0) return 'star-half';
  return 'star-outline';
}

export const rating: ComponentDefinition<RatingProps> = {
  type: 'rating',
  typeVersion: 1,
  propsSchema,
  defaults: { max: 5 },
  Component: ({ id, props, style, theme }) => {
    const color = theme
      ? (resolveToken('value', 'color.brand', 'color', theme) as string | undefined)
      : undefined;

    return (
      <View testID={id} style={[{ flexDirection: 'row' }, (style ?? {}) as ViewStyle]}>
        {Array.from({ length: props.max }, (_, position) => (
          <Ionicons key={position} name={glyphAt(position, props.value)} size={14} color={color} />
        ))}
      </View>
    );
  },
};
