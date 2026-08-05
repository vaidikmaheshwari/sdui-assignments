import React from 'react';
import { Text } from 'react-native';
import { render, screen } from '@testing-library/react-native';
import { rail } from '../../../components/layout/rail';
import type { SDUINode } from '../../../core/types';

const items: SDUINode[] = [
  { id: 'a', type: 'text', props: { value: 'Item A' } },
  { id: 'b', type: 'text', props: { value: 'Item B' } },
];

const renderNode = (node: SDUINode) => <Text key={node.id}>{(node.props?.value as string) ?? ''}</Text>;

describe('rail', () => {
  test('renders acceptably given only required props (id, no props, no children)', async () => {
    await render(
      <rail.Component id="r1" props={rail.propsSchema.parse({})} dispatch={jest.fn()} />
    );
    expect(screen.getByTestId('r1')).toBeTruthy();
  });

  test('renders every childNode via renderNode instead of pre-rendered children', async () => {
    await render(
      <rail.Component
        id="r1"
        props={rail.propsSchema.parse({})}
        childNodes={items}
        renderNode={renderNode}
        dispatch={jest.fn()}
      />
    );
    expect(await screen.findByText('Item A')).toBeTruthy();
    expect(await screen.findByText('Item B')).toBeTruthy();
  });

  test('is horizontal', async () => {
    await render(
      <rail.Component id="r1" props={rail.propsSchema.parse({})} childNodes={items} renderNode={renderNode} dispatch={jest.fn()} />
    );
    expect(screen.getByTestId('r1').props.horizontal).toBe(true);
  });

  test('showsIndicator controls showsHorizontalScrollIndicator', async () => {
    await render(
      <rail.Component
        id="r1"
        props={rail.propsSchema.parse({ showsIndicator: true })}
        childNodes={items}
        renderNode={renderNode}
        dispatch={jest.fn()}
      />
    );
    expect(screen.getByTestId('r1').props.showsHorizontalScrollIndicator).toBe(true);
  });

  test('defaults showsIndicator to false', async () => {
    await render(
      <rail.Component id="r1" props={rail.propsSchema.parse({})} childNodes={items} renderNode={renderNode} dispatch={jest.fn()} />
    );
    expect(screen.getByTestId('r1').props.showsHorizontalScrollIndicator).toBe(false);
  });

  test('snap enables snapToAlignment and a fast deceleration rate', async () => {
    await render(
      <rail.Component
        id="r1"
        props={rail.propsSchema.parse({ snap: true })}
        childNodes={items}
        renderNode={renderNode}
        dispatch={jest.fn()}
      />
    );
    const props = screen.getByTestId('r1').props;
    expect(props.snapToAlignment).toBe('start');
    expect(props.decelerationRate).toBe('fast');
  });

  test('without snap, no snap behavior is applied', async () => {
    await render(
      <rail.Component id="r1" props={rail.propsSchema.parse({})} childNodes={items} renderNode={renderNode} dispatch={jest.fn()} />
    );
    expect(screen.getByTestId('r1').props.snapToAlignment).toBeUndefined();
  });

  test('contentInset pads both edges of the content container', async () => {
    await render(
      <rail.Component
        id="r1"
        props={rail.propsSchema.parse({ contentInset: 16 })}
        childNodes={items}
        renderNode={renderNode}
        dispatch={jest.fn()}
      />
    );
    expect(screen.getByTestId('r1').props.contentContainerStyle).toMatchObject({
      paddingLeft: 16,
      paddingRight: 16,
    });
  });

  test('peek reduces the trailing content padding so the next item bleeds toward the edge', async () => {
    await render(
      <rail.Component
        id="r1"
        props={rail.propsSchema.parse({ contentInset: 16, peek: 12 })}
        childNodes={items}
        renderNode={renderNode}
        dispatch={jest.fn()}
      />
    );
    expect(screen.getByTestId('r1').props.contentContainerStyle).toMatchObject({
      paddingLeft: 16,
      paddingRight: 4,
    });
  });
});
