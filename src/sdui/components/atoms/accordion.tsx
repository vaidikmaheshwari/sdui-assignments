import React from 'react';
import { Pressable, Text, View, type ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { z } from 'zod';
import type { ComponentDefinition } from '../../core/types';

const propsSchema = z.object({
  title: z.string(),
  expanded: z.boolean().default(false),
});

type AccordionProps = z.infer<typeof propsSchema>;

export const accordion: ComponentDefinition<AccordionProps> = {
  type: 'accordion',
  typeVersion: 1,
  propsSchema,
  defaults: { expanded: false },
  Component: ({ id, props, style, actions, dispatch, children }) => (
    <View testID={id} style={style as ViewStyle}>
      <Pressable
        testID={`${id}-header`}
        style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}
        onPress={() => actions?.onToggle && dispatch(actions.onToggle, { value: !props.expanded })}
      >
        <Text>{props.title}</Text>
        <Ionicons
          testID={`${id}-chevron`}
          name="chevron-down"
          size={16}
          style={{ transform: [{ rotate: props.expanded ? '180deg' : '0deg' }] }}
        />
      </Pressable>
      {props.expanded && children}
    </View>
  ),
};
