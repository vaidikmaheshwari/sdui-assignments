import React from 'react';
import { Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { z } from 'zod';
import type { ComponentDefinition } from '../../core/types';
import { resolveToken } from '../../core/theme';

const propsSchema = z.object({
  name: z.string(),
  size: z.number().default(24),
  color: z.string().default('color.textPrimary'),
});

type IconProps = z.infer<typeof propsSchema>;

export const icon: ComponentDefinition<IconProps> = {
  type: 'icon',
  typeVersion: 1,
  propsSchema,
  defaults: { size: 24, color: 'color.textPrimary' },
  Component: ({ id, props, theme, actions, dispatch }) => {
    const colorToken = theme
      ? (resolveToken('color', props.color, 'color', theme) as string | undefined)
      : undefined;

    const glyph = (
      <Ionicons
        name={props.name as React.ComponentProps<typeof Ionicons>['name']}
        size={props.size}
        color={colorToken}
      />
    );

    if (actions?.onTap) {
      return (
        <Pressable testID={id} onPress={() => dispatch(actions.onTap!)}>
          {glyph}
        </Pressable>
      );
    }

    return (
      <Ionicons
        testID={id}
        name={props.name as React.ComponentProps<typeof Ionicons>['name']}
        size={props.size}
        color={colorToken}
      />
    );
  },
};
