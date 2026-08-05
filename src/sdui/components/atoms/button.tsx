import React from 'react';
import { Pressable, Text, type ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { z } from 'zod';
import type { ComponentDefinition } from '../../core/types';
import { resolveToken } from '../../core/theme';

const propsSchema = z.object({
  label: z.string(),
  variant: z.enum(['primary', 'secondary', 'outline', 'ghost']).default('primary'),
  size: z.enum(['sm', 'md', 'lg']).default('md'),
  icon: z.string().optional(),
  iconPosition: z.enum(['left', 'right']).default('left'),
  fullWidth: z.boolean().default(false),
  enabled: z.boolean().default(true),
});

type ButtonProps = z.infer<typeof propsSchema>;

const VARIANT_TOKENS: Record<
  ButtonProps['variant'],
  { background: string | 'transparent'; text: string; border?: string }
> = {
  primary: { background: 'color.brand', text: 'color.textOnBrand' },
  secondary: { background: 'color.surfaceRaised', text: 'color.textPrimary' },
  outline: { background: 'transparent', text: 'color.brand', border: 'color.brand' },
  ghost: { background: 'transparent', text: 'color.brand' },
};

const SIZE_TOKENS: Record<ButtonProps['size'], { paddingHorizontal: string; paddingVertical: string }> = {
  sm: { paddingHorizontal: 'space.sm', paddingVertical: 'space.xs' },
  md: { paddingHorizontal: 'space.lg', paddingVertical: 'space.sm' },
  lg: { paddingHorizontal: 'space.xl', paddingVertical: 'space.md' },
};

export const button: ComponentDefinition<ButtonProps> = {
  type: 'button',
  typeVersion: 1,
  propsSchema,
  defaults: {
    variant: 'primary',
    size: 'md',
    iconPosition: 'left',
    fullWidth: false,
    enabled: true,
  },
  Component: ({ id, props, style, theme, actions, dispatch }) => {
    const variantTokens = VARIANT_TOKENS[props.variant];
    const sizeTokens = SIZE_TOKENS[props.size];

    const backgroundColor =
      variantTokens.background === 'transparent'
        ? 'transparent'
        : theme
          ? (resolveToken('variant', variantTokens.background, 'color', theme) as string | undefined)
          : undefined;
    const textColor = theme
      ? (resolveToken('variant', variantTokens.text, 'color', theme) as string | undefined)
      : undefined;
    const borderColor =
      variantTokens.border && theme
        ? (resolveToken('variant', variantTokens.border, 'color', theme) as string | undefined)
        : undefined;
    const paddingHorizontal = theme
      ? (resolveToken('size', sizeTokens.paddingHorizontal, 'space', theme) as number | undefined)
      : undefined;
    const paddingVertical = theme
      ? (resolveToken('size', sizeTokens.paddingVertical, 'space', theme) as number | undefined)
      : undefined;

    const containerStyle: ViewStyle[] = [
      {
        flexDirection: props.iconPosition === 'right' ? 'row-reverse' : 'row',
        alignItems: 'center',
        justifyContent: 'center',
        alignSelf: props.fullWidth ? 'stretch' : 'flex-start',
        backgroundColor,
        borderColor,
        borderWidth: borderColor ? 1 : undefined,
        paddingHorizontal,
        paddingVertical,
        opacity: props.enabled ? 1 : 0.4,
      },
      (style ?? {}) as ViewStyle,
    ];

    return (
      <Pressable
        testID={id}
        style={containerStyle}
        disabled={!props.enabled}
        onPress={() => actions?.onTap && dispatch(actions.onTap)}
      >
        {props.icon && (
          <Ionicons
            testID={`${id}-icon`}
            name={props.icon as React.ComponentProps<typeof Ionicons>['name']}
            size={16}
            color={textColor}
            style={props.iconPosition === 'right' ? { marginLeft: 6 } : { marginRight: 6 }}
          />
        )}
        <Text style={{ color: textColor }}>{props.label}</Text>
      </Pressable>
    );
  },
};
