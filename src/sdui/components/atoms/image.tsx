import React from 'react';
import { Pressable, type ViewStyle } from 'react-native';
import { Image, type ImageContentFit, type ImageStyle } from 'expo-image';
import { z } from 'zod';
import type { ComponentDefinition } from '../../core/types';
import { resolveToken } from '../../core/theme';

const propsSchema = z.object({
  url: z.string(),
  aspectRatio: z.number().optional(),
  radius: z.string().optional(),
  contentMode: z.enum(['cover', 'contain', 'fill']).default('cover'),
  preload: z.boolean().default(false),
  placeholder: z.string().optional(),
});

type ImageProps = z.infer<typeof propsSchema>;

export const image: ComponentDefinition<ImageProps> = {
  type: 'image',
  typeVersion: 1,
  propsSchema,
  defaults: { contentMode: 'cover', preload: false },
  Component: ({ id, props, style, theme, actions, dispatch }) => {
    const borderRadius =
      props.radius && theme
        ? (resolveToken('radius', props.radius, 'radius', theme) as number | undefined)
        : undefined;

    const imageStyle: ImageStyle[] = [
      { aspectRatio: props.aspectRatio, borderRadius },
      (style ?? {}) as ImageStyle,
    ];

    const img = (
      <Image
        testID={id}
        source={{ uri: props.url }}
        style={imageStyle}
        contentFit={props.contentMode as ImageContentFit}
        placeholder={props.placeholder}
        priority={props.preload ? 'high' : 'normal'}
      />
    );

    if (actions?.onTap) {
      return (
        <Pressable testID={id} style={(style ?? {}) as ViewStyle} onPress={() => dispatch(actions.onTap!)}>
          <Image
            source={{ uri: props.url }}
            style={imageStyle}
            contentFit={props.contentMode as ImageContentFit}
            placeholder={props.placeholder}
            priority={props.preload ? 'high' : 'normal'}
          />
        </Pressable>
      );
    }

    return img;
  },
};
