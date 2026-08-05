import React from 'react';
import { View, Text, type ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { z } from 'zod';
import type { ComponentDefinition } from '../../core/types';
import { resolveToken } from '../../core/theme';

const propsSchema = z.object({
  label: z.string(),
  tone: z.enum(['neutral', 'brand', 'success', 'danger']).default('neutral'),
  icon: z.string().optional(),
});

type BadgeProps = z.infer<typeof propsSchema>;

const TONE_TOKENS: Record<BadgeProps['tone'], { background: string; text: string }> = {
  neutral: { background: 'color.surfaceRaised', text: 'color.textPrimary' },
  brand: { background: 'color.brand', text: 'color.textOnBrand' },
  success: { background: 'color.success', text: 'color.textOnBrand' },
  danger: { background: 'color.danger', text: 'color.textOnBrand' },
};

export const badge: ComponentDefinition<BadgeProps> = {
  type: 'badge',
  typeVersion: 1,
  propsSchema,
  defaults: { tone: 'neutral' },
  Component: ({ id, props, style, theme }) => {
    const { background, text } = TONE_TOKENS[props.tone];
    const backgroundColor = theme
      ? (resolveToken('tone', background, 'color', theme) as string | undefined)
      : undefined;
    const textColor = theme ? (resolveToken('tone', text, 'color', theme) as string | undefined) : undefined;
    const paddingHorizontal = theme
      ? (resolveToken('tone', 'space.sm', 'space', theme) as number | undefined)
      : undefined;
    const paddingVertical = theme
      ? (resolveToken('tone', 'space.xs', 'space', theme) as number | undefined)
      : undefined;
    const borderRadius = theme
      ? (resolveToken('tone', 'radius.pill', 'radius', theme) as number | undefined)
      : undefined;

    return (
      <View
        testID={id}
        style={[
          {
            flexDirection: 'row',
            alignItems: 'center',
            alignSelf: 'flex-start',
            backgroundColor,
            paddingHorizontal,
            paddingVertical,
            borderRadius,
          },
          (style ?? {}) as ViewStyle,
        ]}
      >
        {props.icon && (
          <Ionicons
            testID={`${id}-icon`}
            name={props.icon as React.ComponentProps<typeof Ionicons>['name']}
            size={12}
            color={textColor}
            style={{ marginRight: 4 }}
          />
        )}
        <Text style={{ color: textColor, fontSize: 12 }}>{props.label}</Text>
      </View>
    );
  },
};
