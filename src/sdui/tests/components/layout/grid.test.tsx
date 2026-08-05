import React from 'react';
import { StyleSheet, Text } from 'react-native';
import { render, screen } from '@testing-library/react-native';
import type { TestInstance } from 'test-renderer';
import { grid } from '../../../components/layout/grid';
import type { SDUINode } from '../../../core/types';

const items: SDUINode[] = [
  { id: 'a', type: 'text', props: { value: 'Item A' } },
  { id: 'b', type: 'text', props: { value: 'Item B' } },
];

const renderNode = (node: SDUINode) => (
  <Text testID={`item-${node.id}`}>{(node.props?.value as string) ?? ''}</Text>
);

function itemWrapperStyle(itemId: string) {
  const item = screen.getByTestId(`item-${itemId}`);
  return StyleSheet.flatten((item.parent as TestInstance).props.style);
}

describe('grid', () => {
  test('renders acceptably given only required props (id, no props, no children)', async () => {
    await render(<grid.Component id="g1" props={grid.propsSchema.parse({})} dispatch={jest.fn()} />);
    expect(screen.getByTestId('g1')).toBeTruthy();
  });

  test('renders every childNode via renderNode instead of pre-rendered children', async () => {
    await render(
      <grid.Component
        id="g1"
        props={grid.propsSchema.parse({})}
        childNodes={items}
        renderNode={renderNode}
        dispatch={jest.fn()}
      />
    );
    expect(await screen.findByText('Item A')).toBeTruthy();
    expect(await screen.findByText('Item B')).toBeTruthy();
  });

  test('columns sets numColumns', async () => {
    await render(
      <grid.Component
        id="g1"
        props={grid.propsSchema.parse({ columns: 3 })}
        childNodes={items}
        renderNode={renderNode}
        dispatch={jest.fn()}
      />
    );
    expect(screen.getByTestId('g1').props.numColumns).toBe(3);
  });

  test('defaults to 2 columns', async () => {
    await render(
      <grid.Component id="g1" props={grid.propsSchema.parse({})} childNodes={items} renderNode={renderNode} dispatch={jest.fn()} />
    );
    expect(screen.getByTestId('g1').props.numColumns).toBe(2);
  });

  test('gap becomes half-padding around each item, on every side', async () => {
    await render(
      <grid.Component
        id="g1"
        props={grid.propsSchema.parse({ gap: 8 })}
        childNodes={items}
        renderNode={renderNode}
        dispatch={jest.fn()}
      />
    );
    expect(itemWrapperStyle('a')).toMatchObject({ padding: 4 });
  });

  test('aspectRatio is applied to each item wrapper', async () => {
    await render(
      <grid.Component
        id="g1"
        props={grid.propsSchema.parse({ aspectRatio: 1.5 })}
        childNodes={items}
        renderNode={renderNode}
        dispatch={jest.fn()}
      />
    );
    expect(itemWrapperStyle('a')).toMatchObject({ aspectRatio: 1.5 });
  });

  test('without aspectRatio, items are not forced into a fixed ratio', async () => {
    await render(
      <grid.Component id="g1" props={grid.propsSchema.parse({})} childNodes={items} renderNode={renderNode} dispatch={jest.fn()} />
    );
    expect(itemWrapperStyle('a').aspectRatio).toBeUndefined();
  });
});
