import React from 'react';
import { Pressable, Text as RNText, type TextStyle } from 'react-native';
import { z } from 'zod';
import type { ComponentDefinition } from '../../core/types';
import { resolveToken } from '../../core/theme';

const propsSchema = z.object({
  value: z.string(),
  variant: z.string().default('type.body'),
  color: z.string().default('color.textPrimary'),
  maxLines: z.number().optional(),
  align: z.enum(['left', 'center', 'right']).default('left'),
  opacity: z.number().default(1),
});

type TextProps = z.infer<typeof propsSchema>;

export const text: ComponentDefinition<TextProps> = {
  type: 'text',
  typeVersion: 1,
  propsSchema,
  defaults: { variant: 'type.body', color: 'color.textPrimary', align: 'left', opacity: 1 },
  Component: ({ id, props, style, theme, actions, dispatch }) => {
    const typeToken = theme
      ? (resolveToken('variant', props.variant, 'type', theme) as
          | { size: number; weight: string }
          | undefined)
      : undefined;
    const colorToken = theme
      ? (resolveToken('color', props.color, 'color', theme) as string | undefined)
      : undefined;

    const textStyle: TextStyle[] = [
      {
        fontSize: typeToken?.size,
        fontWeight: typeToken?.weight as TextStyle['fontWeight'],
        color: colorToken,
        textAlign: props.align,
        opacity: props.opacity,
      },
      (style ?? {}) as TextStyle,
    ];

    if (actions?.onTap) {
      return (
        <Pressable testID={id} onPress={() => dispatch(actions.onTap!)}>
          <RNText style={textStyle} numberOfLines={props.maxLines}>
            {props.value}
          </RNText>
        </Pressable>
      );
    }

    return (
      <RNText testID={id} style={textStyle} numberOfLines={props.maxLines}>
        {props.value}
      </RNText>
    );
  },
};
