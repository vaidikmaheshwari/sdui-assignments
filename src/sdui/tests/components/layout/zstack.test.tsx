import React from 'react';
import { StyleSheet, Text } from 'react-native';
import { render, screen, fireEvent } from '@testing-library/react-native';
import type { TestInstance } from 'test-renderer';
import { zstack } from '../../../components/layout/zstack';

function layerStylesFor(containerTestId: string, index: number) {
  const container = screen.getByTestId(containerTestId);
  const layer = container.children[index] as TestInstance;
  return StyleSheet.flatten(layer.props.style);
}

describe('zstack', () => {
  test('renders acceptably given only required props (id, no props)', async () => {
    await render(
      <zstack.Component id="z1" props={zstack.propsSchema.parse({})} dispatch={jest.fn()}>
        <Text>only child</Text>
      </zstack.Component>
    );
    expect(screen.getByText('only child')).toBeTruthy();
  });

  test('layers children in source order — both remain in the tree, overlapping', async () => {
    await render(
      <zstack.Component id="z1" props={zstack.propsSchema.parse({})} dispatch={jest.fn()}>
        <Text>bottom layer</Text>
        <Text>top layer</Text>
      </zstack.Component>
    );
    expect(screen.getByText('bottom layer')).toBeTruthy();
    expect(screen.getByText('top layer')).toBeTruthy();
  });

  test('defaults to center align for every layer', async () => {
    await render(
      <zstack.Component id="z1" props={zstack.propsSchema.parse({})} dispatch={jest.fn()}>
        <Text>a</Text>
      </zstack.Component>
    );
    expect(layerStylesFor('z1', 0)).toMatchObject({ justifyContent: 'center', alignItems: 'center' });
  });

  test('align "bottomLeft" positions every layer at the bottom-left corner', async () => {
    await render(
      <zstack.Component
        id="z1"
        props={zstack.propsSchema.parse({ align: 'bottomLeft' })}
        dispatch={jest.fn()}
      >
        <Text>a</Text>
        <Text>b</Text>
      </zstack.Component>
    );
    expect(layerStylesFor('z1', 0)).toMatchObject({ justifyContent: 'flex-end', alignItems: 'flex-start' });
    expect(layerStylesFor('z1', 1)).toMatchObject({ justifyContent: 'flex-end', alignItems: 'flex-start' });
  });

  test('every layer fills the container so a full-bleed child (flex:1) covers the whole zstack', async () => {
    await render(
      <zstack.Component id="z1" props={zstack.propsSchema.parse({})} dispatch={jest.fn()}>
        <Text>a</Text>
      </zstack.Component>
    );
    expect(layerStylesFor('z1', 0)).toMatchObject({ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 });
  });

  test('with no onTap action, does not intercept touches', async () => {
    await render(
      <zstack.Component id="z1" props={zstack.propsSchema.parse({})} dispatch={jest.fn()}>
        <Text>a</Text>
      </zstack.Component>
    );
    expect(screen.getByTestId('z1').props.onPress).toBeUndefined();
  });

  test('pressing dispatches the declared onTap action', async () => {
    const dispatch = jest.fn();
    await render(
      <zstack.Component
        id="z1"
        props={zstack.propsSchema.parse({})}
        actions={{ onTap: { type: 'navigate', payload: { route: 'pdp' } } }}
        dispatch={dispatch}
      >
        <Text>a</Text>
      </zstack.Component>
    );

    await fireEvent.press(screen.getByTestId('z1'));

    expect(dispatch).toHaveBeenCalledWith({ type: 'navigate', payload: { route: 'pdp' } });
  });
});
