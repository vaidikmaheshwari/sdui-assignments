import React, { useEffect, useState } from 'react';
import { Pressable, TextInput, type ViewStyle } from 'react-native';
import { z } from 'zod';
import type { ComponentDefinition } from '../../core/types';

const KEYBOARD_TYPES = {
  default: 'default',
  numeric: 'numeric',
  email: 'email-address',
  phone: 'phone-pad',
} as const;

const propsSchema = z.object({
  placeholder: z.string().default(''),
  placeholderRotation: z.array(z.string()).default([]),
  rotationMs: z.number().default(3000),
  value: z.string().default(''),
  keyboard: z.enum(['default', 'numeric', 'email', 'phone']).default('default'),
  readOnly: z.boolean().default(false),
});

type InputProps = z.infer<typeof propsSchema>;

export const input: ComponentDefinition<InputProps> = {
  type: 'input',
  typeVersion: 1,
  propsSchema,
  defaults: {
    placeholder: '',
    placeholderRotation: [],
    rotationMs: 3000,
    value: '',
    keyboard: 'default',
    readOnly: false,
  },
  Component: ({ id, props, style, actions, dispatch }) => {
    const [rotationIndex, setRotationIndex] = useState(0);

    useEffect(() => {
      if (props.placeholderRotation.length === 0) return;
      const timer = setInterval(() => {
        setRotationIndex((i) => (i + 1) % props.placeholderRotation.length);
      }, props.rotationMs);
      return () => clearInterval(timer);
    }, [props.placeholderRotation, props.rotationMs]);

    const placeholder =
      props.placeholderRotation.length > 0 ? props.placeholderRotation[rotationIndex] : props.placeholder;

    const tappable = props.readOnly && actions?.onTap;

    // A read-only input is wrapped in a Pressable, and the wrapper is what the parent lays out.
    // Sizing keys therefore have to travel to the wrapper — left on the TextInput they describe
    // a child of a shrink-to-fit box and do nothing. Everything else (background, radius,
    // padding) stays on the field, or the padding would be applied twice.
    const { flex, width, height, ...painted } = (style ?? {}) as ViewStyle;
    const layout: ViewStyle = tappable ? { flex, width, height } : {};

    const field = (
      <TextInput
        testID={id}
        style={tappable ? painted : (style as ViewStyle)}
        value={props.value}
        placeholder={placeholder}
        editable={!props.readOnly}
        keyboardType={KEYBOARD_TYPES[props.keyboard]}
        pointerEvents={tappable ? 'none' : 'auto'}
        onChangeText={(text) => actions?.onChange && dispatch(actions.onChange, { value: text })}
      />
    );

    if (tappable) {
      return (
        <Pressable testID={`${id}-tap-target`} style={layout} onPress={() => dispatch(actions.onTap!)}>
          {field}
        </Pressable>
      );
    }

    return field;
  },
};
