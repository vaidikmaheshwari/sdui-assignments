import React from 'react';
import { Pressable, Text } from 'react-native';
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
});
