import React from 'react';
import { Pressable, type ViewStyle } from 'react-native';
import { Image, type ImageContentFit, type ImageStyle } from 'expo-image';
import { z } from 'zod';
import type { ComponentDefinition } from '../../core/types';
import { resolveToken } from '../../core/theme';

/**
 * P7 item 5. Two separate things hang off `preload`, and they are gated separately:
 *
 * - **Reporting** (`onPreloadedImageLoad`) is always on, in every variant. Without it there is
 *   no "before" number: `fullRender` deliberately doesn't wait on image loads (PERF.md §4.3),
 *   so preloading cannot move any pre-existing marker and would measure as a flat no-op.
 * - **Acting on it** (`priority: 'high'`) is opt-in. Note this changes behaviour that already
 *   shipped: today `preload` maps to expo-image `priority` unconditionally. Leaving that
 *   unconditional would have meant marking images `preload` in home.json silently altered the
 *   baseline too, and item 5 would have measured against a contaminated before.
 */
let imagePreloadEnabled = false;
let onPreloadedImageLoad: (() => void) | undefined;

export function setImagePreloadEnabled(enabled: boolean): void {
  imagePreloadEnabled = enabled;
}

export function setPreloadedImageLoadReporter(report: (() => void) | undefined): void {
  onPreloadedImageLoad = report;
}

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

    const priority = props.preload && imagePreloadEnabled ? 'high' : 'normal';
    const onLoad = props.preload && onPreloadedImageLoad ? onPreloadedImageLoad : undefined;

    const img = (
      <Image
        testID={id}
        source={{ uri: props.url }}
        style={imageStyle}
        contentFit={props.contentMode as ImageContentFit}
        placeholder={props.placeholder}
        priority={priority}
        onLoad={onLoad}
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
            priority={priority}
            onLoad={onLoad}
          />
        </Pressable>
      );
    }

    return img;
  },
};
