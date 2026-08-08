import React from 'react';
import { Text } from 'react-native';
import { useSharedValue } from 'react-native-reanimated';
import { render, screen } from '@testing-library/react-native';
import { z } from 'zod';
import { CollapsingHeader } from '../../../components/chrome/CollapsingHeader';
import { ComponentRegistry } from '../../../core/registry';
import { stack } from '../../../components/layout/stack';
import type { RenderContext } from '../../../core/SDUINode';
import type { ComponentDefinition, SDUINode as SDUINodeData } from '../../../core/types';

const passthroughDef: ComponentDefinition<{ value: string }> = {
  type: 'text',
  typeVersion: 1,
  propsSchema: z.object({ value: z.string() }),
  defaults: {},
  Component: ({ props }) => <Text>{props.value}</Text>,
};

function makeRegistry(): ComponentRegistry {
  const registry = new ComponentRegistry();
  registry.register(stack);
  registry.register(passthroughDef);
  return registry;
}

const baseTheme = {
  color: { bg: '#FFFFFF' },
  space: { md: 12 },
  radius: {},
  type: {},
};

function Harness({ node, ctx }: { node: SDUINodeData; ctx: RenderContext }) {
  const scrollY = useSharedValue(0);
  return <CollapsingHeader node={node} ctx={ctx} scrollY={scrollY} />;
}

function makeCtx(registry: ComponentRegistry): RenderContext {
  return { state: {}, data: {}, theme: baseTheme, registry, dispatch: jest.fn() };
}

describe('CollapsingHeader', () => {
  test('renders every child of a multi-child header (first child collapsible, the rest pinned)', async () => {
    const registry = makeRegistry();
    const node: SDUINodeData = {
      id: 'home.header',
      type: 'stack',
      props: { direction: 'vertical', spacing: 12 },
      children: [
        { id: 'home.header.topRow', type: 'text', props: { value: 'Top row' } },
        { id: 'home.header.search', type: 'text', props: { value: 'Search cars' } },
        { id: 'home.header.nav', type: 'text', props: { value: 'Nav' } },
      ],
    };
    await render(<Harness node={node} ctx={makeCtx(registry)} />);

    expect(screen.getByText('Top row')).toBeTruthy();
    expect(screen.getByText('Search cars')).toBeTruthy();
    expect(screen.getByText('Nav')).toBeTruthy();
    expect(screen.getByTestId('home.header')).toBeTruthy();
  });

  test('all pinned children render, not just the first one after the collapsible child', async () => {
    const registry = makeRegistry();
    const node: SDUINodeData = {
      id: 'home.header',
      type: 'stack',
      props: { direction: 'vertical', spacing: 12 },
      children: [
        { id: 'home.header.topRow', type: 'text', props: { value: 'Top row' } },
        { id: 'home.header.search', type: 'text', props: { value: 'Search cars' } },
        { id: 'home.header.nav', type: 'text', props: { value: 'Nav' } },
        { id: 'home.header.extra', type: 'text', props: { value: 'Extra pinned item' } },
      ],
    };
    await render(<Harness node={node} ctx={makeCtx(registry)} />);

    expect(screen.getByText('Search cars')).toBeTruthy();
    expect(screen.getByText('Nav')).toBeTruthy();
    expect(screen.getByText('Extra pinned item')).toBeTruthy();
  });

  test('a header with a single child renders as-is (nothing to collapse)', async () => {
    const registry = makeRegistry();
    const node: SDUINodeData = {
      id: 'home.header',
      type: 'text',
      props: { value: 'Solo header' },
    };
    await render(<Harness node={node} ctx={makeCtx(registry)} />);

    expect(screen.getByText('Solo header')).toBeTruthy();
  });

  test('a header with no children renders as-is', async () => {
    const registry = makeRegistry();
    const node: SDUINodeData = {
      id: 'home.header',
      type: 'text',
      props: { value: 'Empty header' },
      children: [],
    };
    await render(<Harness node={node} ctx={makeCtx(registry)} />);

    expect(screen.getByText('Empty header')).toBeTruthy();
  });
});
