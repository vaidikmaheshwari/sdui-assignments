import React from 'react';
import { Pressable, ScrollView, Text, View, type ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { z } from 'zod';
import type { ComponentDefinition } from '../../core/types';
import { resolveToken } from '../../core/theme';

const propsSchema = z.object({
  options: z.array(
    z.object({
      label: z.string(),
      value: z.string(),
      icon: z.string().optional(),
    })
  ),
  selected: z.union([z.string(), z.array(z.string())]).default([]),
  scrollable: z.boolean().default(false),
  multi: z.boolean().default(false),
});

type ChipGroupProps = z.infer<typeof propsSchema>;

function toSelectedSet(selected: ChipGroupProps['selected']): Set<string> {
  return new Set(Array.isArray(selected) ? selected : [selected]);
}

export const chip_group: ComponentDefinition<ChipGroupProps> = {
  type: 'chip_group',
  typeVersion: 1,
  propsSchema,
  defaults: { selected: [], scrollable: false, multi: false },
  Component: ({ id, props, style, theme, actions, dispatch }) => {
    const selectedSet = toSelectedSet(props.selected);
    const selectedBg = theme
      ? (resolveToken('selected', 'color.brand', 'color', theme) as string | undefined)
      : undefined;
    const selectedText = theme
      ? (resolveToken('selected', 'color.textOnBrand', 'color', theme) as string | undefined)
      : undefined;
    const unselectedBg = theme
      ? (resolveToken('unselected', 'color.surfaceRaised', 'color', theme) as string | undefined)
      : undefined;
    const unselectedText = theme
      ? (resolveToken('unselected', 'color.textPrimary', 'color', theme) as string | undefined)
      : undefined;
    const radius = theme
      ? (resolveToken('radius', 'radius.pill', 'radius', theme) as number | undefined)
      : undefined;
    const paddingHorizontal = theme
      ? (resolveToken('gap', 'space.sm', 'space', theme) as number | undefined)
      : undefined;
    const paddingVertical = theme
      ? (resolveToken('gap', 'space.xs', 'space', theme) as number | undefined)
      : undefined;

    const handlePress = (value: string) => {
      if (!actions?.onSelect) return;
      if (props.multi) {
        const next = selectedSet.has(value)
          ? [...selectedSet].filter((v) => v !== value)
          : [...selectedSet, value];
        dispatch(actions.onSelect, { value: next });
      } else {
        dispatch(actions.onSelect, { value });
      }
    };

    const chips = props.options.map((option) => {
      const isSelected = selectedSet.has(option.value);
      return (
        <Pressable
          key={option.value}
          testID={`${id}-chip-${option.value}`}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: isSelected ? selectedBg : unselectedBg,
            borderRadius: radius,
            paddingHorizontal,
            paddingVertical,
            marginRight: 8,
            marginBottom: 8,
          }}
          onPress={() => handlePress(option.value)}
        >
          {option.icon && (
            <Ionicons
              name={option.icon as React.ComponentProps<typeof Ionicons>['name']}
              size={12}
              color={isSelected ? selectedText : unselectedText}
              style={{ marginRight: 4 }}
            />
          )}
          <Text style={{ color: isSelected ? selectedText : unselectedText }}>{option.label}</Text>
        </Pressable>
      );
    });

    if (props.scrollable) {
      return (
        <ScrollView testID={id} horizontal showsHorizontalScrollIndicator={false} style={style as ViewStyle}>
          {chips}
        </ScrollView>
      );
    }

    return (
      <View testID={id} style={[{ flexDirection: 'row', flexWrap: 'wrap' }, (style ?? {}) as ViewStyle]}>
        {chips}
      </View>
    );
  },
};
