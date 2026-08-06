import React from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { z } from 'zod';
import { SDUIScreen } from '../../screens/SDUIScreen';
import { ComponentRegistry } from '../../core/registry';
import type { ComponentDefinition, Payload } from '../../core/types';

const textDef: ComponentDefinition<{ value: string }> = {
  type: 'text',
  typeVersion: 1,
  propsSchema: z.object({ value: z.string() }),
  defaults: {},
  Component: ({ props }) => <Text>{props.value}</Text>,
};

const triggerDef: ComponentDefinition<Record<string, never>> = {
  type: 'trigger',
  typeVersion: 1,
  propsSchema: z.object({}),
  defaults: {},
  Component: ({ dispatch, id }) => (
    <Pressable
      testID={id}
      onPress={() =>
        dispatch({ type: 'set_state', payload: { key: 'tab', value: '$event.value' } }, { value: 'hot' })
      }
    >
      <Text>trigger</Text>
    </Pressable>
  ),
};

const sequenceTriggerDef: ComponentDefinition<Record<string, never>> = {
  type: 'sequence_trigger',
  typeVersion: 1,
  propsSchema: z.object({}),
  defaults: {},
  Component: ({ dispatch, id }) => (
    <Pressable
      testID={id}
      onPress={() =>
        dispatch({
          type: 'sequence',
          payload: {
            actions: [
              { type: 'set_state', payload: { key: 'a', value: 1 } },
              { type: 'set_state', payload: { key: 'b', value: 2 } },
            ],
          },
        })
      }
    >
      <Text>run sequence</Text>
    </Pressable>
  ),
};

const navigateTriggerDef: ComponentDefinition<Record<string, never>> = {
  type: 'navigate_trigger',
  typeVersion: 1,
  propsSchema: z.object({}),
  defaults: {},
  Component: ({ dispatch, id }) => (
    <Pressable testID={id} onPress={() => dispatch({ type: 'navigate', payload: { route: 'pdp' } })}>
      <Text>go</Text>
    </Pressable>
  ),
};

const sheetTriggerDef: ComponentDefinition<Record<string, never>> = {
  type: 'sheet_trigger',
  typeVersion: 1,
  propsSchema: z.object({}),
  defaults: {},
  Component: ({ dispatch, id }) => (
    <Pressable
      testID={id}
      onPress={() =>
        dispatch({
          type: 'open_sheet',
          payload: {
            title: 'Price breakup',
            node: { id: 'sheetText', type: 'text', props: { value: 'Sheet content' } },
          },
        })
      }
    >
      <Text>open sheet</Text>
    </Pressable>
  ),
};

function makeRegistry(): ComponentRegistry {
  const registry = new ComponentRegistry();
  registry.register(textDef);
  registry.register(triggerDef);
  registry.register(sequenceTriggerDef);
  registry.register(navigateTriggerDef);
  return registry;
}

const baseTheme = {
  tokens: {
    color: { brand: '#3B24C4' },
    space: { lg: 16 },
    radius: { md: 12 },
    type: { body: { size: 14, weight: '400' } },
  },
};

describe('SDUIScreen', () => {
  test('renders header and sections from the payload', async () => {
    const payload: Payload = {
      schemaVersion: '1.1.0',
      screenId: 'home',
      theme: baseTheme,
      header: { id: 'header', type: 'text', props: { value: 'Header' } },
      sections: [{ id: 's1', type: 'text', props: { value: 'Section one' } }],
    };
    await render(<SDUIScreen payload={payload} registry={makeRegistry()} />);
    expect(screen.getByText('Header')).toBeTruthy();
    expect(screen.getByText('Section one')).toBeTruthy();
  });

  test('set_state resolves $event bindings and rebinds dependent nodes', async () => {
    const payload: Payload = {
      schemaVersion: '1.1.0',
      screenId: 'home',
      theme: baseTheme,
      state: { tab: 'wishlisted' },
      sections: [
        { id: 'label', type: 'text', props: { value: '{{state.tab}}' } },
        { id: 'trigger', type: 'trigger' },
      ],
    };
    await render(<SDUIScreen payload={payload} registry={makeRegistry()} />);
    expect(screen.getByText('wishlisted')).toBeTruthy();

    await fireEvent.press(screen.getByTestId('trigger'));

    expect(screen.getByText('hot')).toBeTruthy();
  });

  test('sequence runs every sub-action in order', async () => {
    const payload: Payload = {
      schemaVersion: '1.1.0',
      screenId: 'home',
      theme: baseTheme,
      state: { a: 0, b: 0 },
      sections: [
        { id: 'labelA', type: 'text', props: { value: 'a={{state.a}}' } },
        { id: 'labelB', type: 'text', props: { value: 'b={{state.b}}' } },
        { id: 'trigger', type: 'sequence_trigger' },
      ],
    };
    await render(<SDUIScreen payload={payload} registry={makeRegistry()} />);

    await fireEvent.press(screen.getByTestId('trigger'));

    expect(screen.getByText('a=1')).toBeTruthy();
    expect(screen.getByText('b=2')).toBeTruthy();
  });

  test('an action type with no handler yet no-ops instead of crashing the page', async () => {
    const payload: Payload = {
      schemaVersion: '1.1.0',
      screenId: 'home',
      theme: baseTheme,
      sections: [
        { id: 'label', type: 'text', props: { value: 'still here' } },
        { id: 'trigger', type: 'navigate_trigger' },
      ],
    };
    await render(<SDUIScreen payload={payload} registry={makeRegistry()} />);

    await fireEvent.press(screen.getByTestId('trigger'));
    expect(screen.getByText('still here')).toBeTruthy();
  });

  test('navigate is routed to the injected effects.onNavigate handler', async () => {
    const onNavigate = jest.fn();
    const payload: Payload = {
      schemaVersion: '1.1.0',
      screenId: 'home',
      theme: baseTheme,
      sections: [{ id: 'trigger', type: 'navigate_trigger' }],
    };
    await render(
      <SDUIScreen payload={payload} registry={makeRegistry()} effects={{ onNavigate }} />
    );

    await fireEvent.press(screen.getByTestId('trigger'));
    expect(onNavigate).toHaveBeenCalledWith('pdp', undefined);
  });

  test('paints the root with theme.tokens.color.bg instead of leaking the native window background', async () => {
    const payload: Payload = {
      schemaVersion: '1.1.0',
      screenId: 'home',
      theme: {
        tokens: {
          color: { brand: '#3B24C4', bg: '#FFFFFF' },
          space: { lg: 16 },
          radius: { md: 12 },
          type: { body: { size: 14, weight: '400' } },
        },
      },
      sections: [{ id: 's1', type: 'text', props: { value: 'Section one' } }],
    };
    await render(<SDUIScreen payload={payload} registry={makeRegistry()} />);
    const flatStyle = StyleSheet.flatten(screen.getByTestId('sdui-screen-root').props.style);
    expect(flatStyle).toMatchObject({ backgroundColor: '#FFFFFF' });
  });

  test('without a color.bg token, the root background is left unset rather than throwing', async () => {
    const payload: Payload = {
      schemaVersion: '1.1.0',
      screenId: 'home',
      theme: baseTheme,
      sections: [{ id: 's1', type: 'text', props: { value: 'Section one' } }],
    };
    await render(<SDUIScreen payload={payload} registry={makeRegistry()} />);
    const flatStyle = StyleSheet.flatten(screen.getByTestId('sdui-screen-root').props.style);
    expect(flatStyle.backgroundColor).toBeUndefined();
  });

  test('open_sheet renders its SDUI node through the same renderer inside the bottom sheet', async () => {
    const registry = makeRegistry();
    registry.register(sheetTriggerDef);
    const payload: Payload = {
      schemaVersion: '1.1.0',
      screenId: 'home',
      theme: baseTheme,
      sections: [{ id: 'trigger', type: 'sheet_trigger' }],
    };
    await render(<SDUIScreen payload={payload} registry={registry} />);

    expect(screen.queryByText('Sheet content')).toBeNull();
    await fireEvent.press(screen.getByTestId('trigger'));
    expect(await screen.findByText('Sheet content')).toBeTruthy();
  });
});
