import React from 'react';
import { Pressable, Text as RNText, View, type TextStyle, type ViewStyle } from 'react-native';
import { Image, type ImageStyle } from 'expo-image';
import { z } from 'zod';
import type { ComponentDefinition } from '../../core/types';
import { resolveToken } from '../../core/theme';

const propsSchema = z.object({
  label: z.string(),
  labelColor: z.string().optional(),
  labelVariant: z.string().default('type.body'),
  imageUrl: z.string(),
  imageSize: z.number().default(72),
  imageAspectRatio: z.number().default(1),
  imageBackground: z.string().optional(),
  variant: z.enum(['card', 'avatar']).default('card'),
});

type TileProps = z.infer<typeof propsSchema>;

export const tile: ComponentDefinition<TileProps> = {
  type: 'tile',
  typeVersion: 1,
  propsSchema,
  defaults: { labelVariant: 'type.body', imageSize: 72, imageAspectRatio: 1, variant: 'card' },
  Component: ({ id, props, style, theme, actions, dispatch }) => {
    const typeToken = theme
      ? (resolveToken('labelVariant', props.labelVariant, 'type', theme) as
          | { size: number; weight: string }
          | undefined)
      : undefined;
    const labelColorToken =
      theme && props.labelColor
        ? (resolveToken('labelColor', props.labelColor, 'color', theme) as string | undefined)
        : undefined;
    const imageBackgroundToken =
      theme && props.imageBackground
        ? (resolveToken('imageBackground', props.imageBackground, 'color', theme) as string | undefined)
        : undefined;

    const isAvatar = props.variant === 'avatar';

    const containerStyle: ViewStyle[] = [
      {
        flexDirection: 'column',
        justifyContent: isAvatar ? 'flex-start' : 'space-between',
        alignItems: isAvatar ? 'center' : 'stretch',
        gap: 8,
      },
      (style ?? {}) as ViewStyle,
    ];

    const labelStyle: TextStyle = {
      fontSize: typeToken?.size,
      fontWeight: typeToken?.weight as TextStyle['fontWeight'],
      color: labelColorToken,
      textAlign: isAvatar ? 'center' : 'left',
    };

    const imageStyle: ImageStyle = {
      width: props.imageSize,
      height: props.imageSize,
      aspectRatio: props.imageAspectRatio,
      borderRadius: isAvatar ? props.imageSize / 2 : undefined,
      backgroundColor: imageBackgroundToken,
    };

    const label = (
      <RNText testID={`${id}-label`} style={labelStyle}>
        {props.label}
      </RNText>
    );
    const img = (
      <Image
        testID={`${id}-image`}
        source={{ uri: props.imageUrl }}
        style={imageStyle}
        contentFit={isAvatar ? 'cover' : 'contain'}
      />
    );

    const content = isAvatar ? (
      <>
        {img}
        {label}
      </>
    ) : (
      <>
        {label}
        {img}
      </>
    );

    if (actions?.onTap) {
      return (
        <Pressable testID={id} style={containerStyle} onPress={() => dispatch(actions.onTap!)}>
          {content}
        </Pressable>
      );
    }

    return (
      <View testID={id} style={containerStyle}>
        {content}
      </View>
    );
  },
};
