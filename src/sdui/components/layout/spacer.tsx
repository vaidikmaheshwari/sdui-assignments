import React from 'react';
import { View } from 'react-native';
import { z } from 'zod';
import type { ComponentDefinition } from '../../core/types';

const propsSchema = z.object({
  size: z.number().optional(),
});

type SpacerProps = z.infer<typeof propsSchema>;

export const spacer: ComponentDefinition<SpacerProps> = {
  type: 'spacer',
  typeVersion: 1,
  propsSchema,
  defaults: propsSchema.parse({}),
  Component: ({ id, props }) => (
    <View
      testID={id}
      style={
        props.size === undefined
          ? { flex: 1 }
          : { width: props.size, height: props.size }
      }
    />
  ),
};
