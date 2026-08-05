import React from 'react';
import { Pressable, StyleSheet, View, type ViewStyle } from 'react-native';
import { z } from 'zod';
import type { ComponentDefinition } from '../../core/types';

const propsSchema = z.object({
  direction: z.enum(['vertical', 'horizontal']).default('vertical'),
  spacing: z.number().default(0),
  align: z.enum(['start', 'center', 'end', 'stretch']).default('stretch'),
  justify: z.enum(['start', 'center', 'end', 'between', 'around', 'evenly']).default('start'),
  wrap: z.boolean().default(false),
});

type StackProps = z.infer<typeof propsSchema>;

const ALIGN_ITEMS: Record<StackProps['align'], 'flex-start' | 'center' | 'flex-end' | 'stretch'> = {
  start: 'flex-start',
  center: 'center',
  end: 'flex-end',
  stretch: 'stretch',
};

const JUSTIFY_CONTENT: Record<
  StackProps['justify'],
  'flex-start' | 'center' | 'flex-end' | 'space-between' | 'space-around' | 'space-evenly'
> = {
  start: 'flex-start',
  center: 'center',
  end: 'flex-end',
  between: 'space-between',
  around: 'space-around',
  evenly: 'space-evenly',
};

export const stack: ComponentDefinition<StackProps> = {
  type: 'stack',
  typeVersion: 1,
  propsSchema,
  defaults: propsSchema.parse({}),
  Component: ({ id, props, style, actions, dispatch, children }) => {
    const containerStyle: ViewStyle[] = [
      styles.base,
      {
        flexDirection: props.direction === 'horizontal' ? 'row' : 'column',
        gap: props.spacing,
        alignItems: ALIGN_ITEMS[props.align],
        justifyContent: JUSTIFY_CONTENT[props.justify],
        flexWrap: props.wrap ? 'wrap' : 'nowrap',
      },
      (style ?? {}) as ViewStyle,
    ];

    if (actions?.onTap) {
      return (
        <Pressable testID={id} style={containerStyle} onPress={() => dispatch(actions.onTap!)}>
          {children}
        </Pressable>
      );
    }

    return (
      <View testID={id} style={containerStyle}>
        {children}
      </View>
    );
  },
};

const styles = StyleSheet.create({
  base: {
    display: 'flex',
  },
});
