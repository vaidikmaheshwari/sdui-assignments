import React from 'react';
import { View, type ViewStyle } from 'react-native';
import { z } from 'zod';
import type { ComponentDefinition } from '../../core/types';

const propsSchema = z.object({
  edge: z.enum(['top', 'bottom']).default('top'),
  elevation: z.number().default(4),
});

type StickyProps = z.infer<typeof propsSchema>;

export const sticky: ComponentDefinition<StickyProps> = {
  type: 'sticky',
  typeVersion: 1,
  propsSchema,
  defaults: propsSchema.parse({}),
  Component: ({ id, props, style, children }) => (
    <View
      testID={id}
      style={[
        {
          elevation: props.elevation,
          shadowColor: '#000',
          shadowOpacity: Math.min(0.05 * props.elevation, 0.4),
          shadowRadius: props.elevation,
          shadowOffset: { width: 0, height: props.edge === 'top' ? 2 : -2 },
        },
        (style ?? {}) as ViewStyle,
      ]}
    >
      {children}
    </View>
  ),
};
