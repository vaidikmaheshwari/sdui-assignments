import React from 'react';
import { View, type ViewStyle } from 'react-native';
import { z } from 'zod';
import type { ComponentDefinition } from '../../core/types';

const propsSchema = z.object({
  inset: z.number().default(0),
  thickness: z.number().default(1),
});

type DividerProps = z.infer<typeof propsSchema>;

const DEFAULT_LINE_COLOR = '#E0E0E0';

export const divider: ComponentDefinition<DividerProps> = {
  type: 'divider',
  typeVersion: 1,
  propsSchema,
  defaults: propsSchema.parse({}),
  Component: ({ id, props, style }) => (
    <View
      testID={id}
      style={[
        {
          height: props.thickness,
          marginHorizontal: props.inset,
          backgroundColor: DEFAULT_LINE_COLOR,
        },
        (style ?? {}) as ViewStyle,
      ]}
    />
  ),
};
