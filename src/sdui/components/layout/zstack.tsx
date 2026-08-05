import React from 'react';
import { Pressable, StyleSheet, View, type ViewStyle } from 'react-native';
import { z } from 'zod';
import type { ComponentDefinition } from '../../core/types';

const ALIGN_VALUES = [
  'topLeft',
  'top',
  'topRight',
  'left',
  'center',
  'right',
  'bottomLeft',
  'bottom',
  'bottomRight',
] as const;

const propsSchema = z.object({
  align: z.enum(ALIGN_VALUES).default('center'),
});

type ZStackProps = z.infer<typeof propsSchema>;

const ALIGN_STYLE: Record<
  ZStackProps['align'],
  { justifyContent: ViewStyle['justifyContent']; alignItems: ViewStyle['alignItems'] }
> = {
  topLeft: { justifyContent: 'flex-start', alignItems: 'flex-start' },
  top: { justifyContent: 'flex-start', alignItems: 'center' },
  topRight: { justifyContent: 'flex-start', alignItems: 'flex-end' },
  left: { justifyContent: 'center', alignItems: 'flex-start' },
  center: { justifyContent: 'center', alignItems: 'center' },
  right: { justifyContent: 'center', alignItems: 'flex-end' },
  bottomLeft: { justifyContent: 'flex-end', alignItems: 'flex-start' },
  bottom: { justifyContent: 'flex-end', alignItems: 'center' },
  bottomRight: { justifyContent: 'flex-end', alignItems: 'flex-end' },
};

export const zstack: ComponentDefinition<ZStackProps> = {
  type: 'zstack',
  typeVersion: 1,
  propsSchema,
  defaults: propsSchema.parse({}),
  Component: ({ id, props, style, actions, dispatch, children }) => {
    const layerStyle = [styles.layer, ALIGN_STYLE[props.align]];
    const layers = React.Children.map(children, (child, index) => (
      <View key={index} style={layerStyle}>
        {child}
      </View>
    ));
    const containerStyle = [styles.container, (style ?? {}) as ViewStyle];

    if (actions?.onTap) {
      return (
        <Pressable testID={id} style={containerStyle} onPress={() => dispatch(actions.onTap!)}>
          {layers}
        </Pressable>
      );
    }

    return (
      <View testID={id} style={containerStyle}>
        {layers}
      </View>
    );
  },
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
  },
  layer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
});
