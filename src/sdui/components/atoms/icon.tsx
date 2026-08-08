import React from 'react';
import { Pressable, StyleSheet } from 'react-native';
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
        style={styles.glyph}
      />
    );

    if (actions?.onTap) {
      return (
        <Pressable testID={id} style={styles.box} onPress={() => dispatch(actions.onTap!)}>
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
        style={styles.glyph}
      />
    );
  },
};

const styles = StyleSheet.create({
  /**
   * A vector icon is a glyph in a text box, and on Android that box carries the font's own
   * ascent/descent padding — asymmetric, and proportional to `size`. Two icons of different
   * sizes in the same row (listing.json's header is 24 and 22) therefore sit at two different
   * heights even under `alignItems: 'center'`, because flexbox is centring the boxes correctly
   * and the glyphs are off-centre *within* them.
   */
  glyph: {
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  /** The tap wrapper is a View, so it needs to be told to centre the glyph it contains. */
  box: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
