import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { z } from 'zod';
import { SDUINode, type RenderContext } from '../../core/SDUINode';
import { ComponentRegistry } from '../../core/registry';
import type { ComponentDefinition, ThemeTokens } from '../../core/types';

const theme: ThemeTokens = {
  color: { brand: '#3B24C4' },
  space: { lg: 16 },
  radius: { md: 12 },
  type: { body: { size: 14, weight: '400' } },
};

const textDef: ComponentDefinition<{ value: string }> = {
  type: 'text',
  typeVersion: 1,
  propsSchema: z.object({ value: z.string() }),
  defaults: {},
  Component: ({ props }) => <Text>{props.value}</Text>,
};

const badgeDef: ComponentDefinition<{ label: string; tone: string }> = {
  type: 'badge',
  typeVersion: 1,
  propsSchema: z.object({ label: z.string(), tone: z.string().default('neutral') }),
  defaults: { tone: 'neutral' },
  Component: ({ props }) => <Text>{`${props.label}:${props.tone}`}</Text>,
};

const stackDef: ComponentDefinition<Record<string, never>> = {
  type: 'stack',
  typeVersion: 1,
  propsSchema: z.object({}),
  defaults: {},
  Component: ({ children }) => <View testID="stack">{children}</View>,
};

const tappableDef: ComponentDefinition<Record<string, never>> = {
  type: 'tappable',
  typeVersion: 1,
  propsSchema: z.object({}),
  defaults: {},
  Component: ({ id, actions, dispatch }) => (
    <Pressable testID={id} onPress={() => actions?.onTap && dispatch(actions.onTap)}>
      <Text>tap me</Text>
    </Pressable>
  ),
};

const boomDef: ComponentDefinition<Record<string, never>> = {
  type: 'boom',
  typeVersion: 1,
  propsSchema: z.object({}),
  defaults: {},
  Component: () => {
    throw new Error('kaboom');
  },
};

function makeCtx(overrides: Partial<RenderContext> = {}): RenderContext {
  const registry = new ComponentRegistry();
  registry.register(textDef);
  registry.register(badgeDef);
  registry.register(stackDef);
  registry.register(tappableDef);
  registry.register(boomDef);
  return {
    state: {},
    data: {},
    theme,
    registry,
    dispatch: jest.fn(),
    ...overrides,
  };
}

describe('SDUINode', () => {
  test('renders a known component with valid props', async () => {
    await render(<SDUINode node={{ id: 'n1', type: 'text', props: { value: 'Buy car' } }} ctx={makeCtx()} />);
    expect(screen.getByText('Buy car')).toBeTruthy();
  });

  test('resolves bindings in props before rendering', async () => {
    const ctx = makeCtx({ data: { headline: 'Sell your car' } });
    await render(
      <SDUINode node={{ id: 'n1', type: 'text', props: { value: '{{data.headline}}' } }} ctx={ctx} />
    );
    expect(screen.getByText('Sell your car')).toBeTruthy();
  });

  test('visibleIf false renders nothing', async () => {
    const ctx = makeCtx({ state: { tab: 'hot' } });
    const view = await render(
      <SDUINode
        node={{
          id: 'n1',
          type: 'text',
          props: { value: 'Wishlisted only' },
          visibleIf: { eq: ['{{state.tab}}', 'wishlisted'] },
        }}
        ctx={ctx}
      />
    );
    expect(view.toJSON()).toBeNull();
  });

  test('pre-renders children and hands them to a container component', async () => {
    await render(
      <SDUINode
        node={{
          id: 'row',
          type: 'stack',
          children: [
            { id: 'a', type: 'text', props: { value: 'First' } },
            { id: 'b', type: 'text', props: { value: 'Second' } },
          ],
        }}
        ctx={makeCtx()}
      />
    );
    expect(screen.getByText('First')).toBeTruthy();
    expect(screen.getByText('Second')).toBeTruthy();
  });

  test('passes node.actions through so a component can dispatch its own declared action', async () => {
    const dispatch = jest.fn();
    const ctx = makeCtx({ dispatch });
    await render(
      <SDUINode
        node={{
          id: 'n1',
          type: 'tappable',
          actions: { onTap: { type: 'navigate', payload: { route: 'pdp' } } },
        }}
        ctx={ctx}
      />
    );

    await fireEvent.press(screen.getByTestId('n1'));

    expect(dispatch).toHaveBeenCalledWith({ type: 'navigate', payload: { route: 'pdp' } });
  });

  describe('fallback path', () => {
    test('unknown type with an inline fallback renders the fallback node', async () => {
      await render(
        <SDUINode
          node={{
            id: 'n1',
            type: 'holographic_banner',
            fallback: { id: 'n1.fallback', type: 'text', props: { value: 'fallback banner' } },
          }}
          ctx={makeCtx()}
        />
      );
      expect(screen.getByText('fallback banner')).toBeTruthy();
    });

    test('unknown type with no fallback renders the dev placeholder, never blanks the page', async () => {
      await render(<SDUINode node={{ id: 'n1', type: 'holographic_banner' }} ctx={makeCtx()} />);
      expect(screen.getByText(/holographic_banner/)).toBeTruthy();
    });

    test('a required prop failing validation routes to fallback', async () => {
      await render(
        <SDUINode
          node={{
            id: 'n1',
            type: 'text',
            props: {},
            fallback: { id: 'n1.fallback', type: 'text', props: { value: 'text fallback' } },
          }}
          ctx={makeCtx()}
        />
      );
      expect(screen.getByText('text fallback')).toBeTruthy();
    });

    test('a failing prop with a registry default is patched and rendered normally, not routed to fallback', async () => {
      await render(
        <SDUINode
          node={{ id: 'n1', type: 'badge', props: { label: 'Zero Worry', tone: 42 } }}
          ctx={makeCtx()}
        />
      );
      expect(screen.getByText('Zero Worry:neutral')).toBeTruthy();
    });

    test('a component throwing at render is caught and routes to fallback, page keeps rendering', async () => {
      const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
      await render(
        <SDUINode
          node={{
            id: 'n1',
            type: 'boom',
            fallback: { id: 'n1.fallback', type: 'text', props: { value: 'recovered' } },
          }}
          ctx={makeCtx()}
        />
      );
      expect(screen.getByText('recovered')).toBeTruthy();
      consoleError.mockRestore();
    });
  });
});
