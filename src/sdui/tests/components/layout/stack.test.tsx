import React from 'react';
import { StyleSheet, Text } from 'react-native';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { stack } from '../../../components/layout/stack';

function flatStyle(testId: string) {
  return StyleSheet.flatten(screen.getByTestId(testId).props.style);
}

describe('stack', () => {
  test('renders acceptably given only required props (id, no props)', async () => {
    await render(
      <stack.Component id="s1" props={stack.propsSchema.parse({})} dispatch={jest.fn()}>
        <Text>child</Text>
      </stack.Component>
    );
    expect(screen.getByText('child')).toBeTruthy();
  });

  test('defaults to a vertical (column) direction', async () => {
    await render(<stack.Component id="s1" props={stack.propsSchema.parse({})} dispatch={jest.fn()} />);
    expect(flatStyle('s1')).toMatchObject({ flexDirection: 'column' });
  });

  test('direction "horizontal" renders as a row', async () => {
    await render(
      <stack.Component
        id="s1"
        props={stack.propsSchema.parse({ direction: 'horizontal' })}
        dispatch={jest.fn()}
      />
    );
    expect(flatStyle('s1')).toMatchObject({ flexDirection: 'row' });
  });

  test('spacing becomes the gap between children', async () => {
    await render(
      <stack.Component id="s1" props={stack.propsSchema.parse({ spacing: 12 })} dispatch={jest.fn()} />
    );
    expect(flatStyle('s1')).toMatchObject({ gap: 12 });
  });

  test('align and justify map to alignItems and justifyContent', async () => {
    await render(
      <stack.Component
        id="s1"
        props={stack.propsSchema.parse({ align: 'center', justify: 'between' })}
        dispatch={jest.fn()}
      />
    );
    expect(flatStyle('s1')).toMatchObject({
      alignItems: 'center',
      justifyContent: 'space-between',
    });
  });

  test('wrap renders flexWrap: wrap', async () => {
    await render(
      <stack.Component id="s1" props={stack.propsSchema.parse({ wrap: true })} dispatch={jest.fn()} />
    );
    expect(flatStyle('s1')).toMatchObject({ flexWrap: 'wrap' });
  });

  test('merges the resolved node style onto the container', async () => {
    await render(
      <stack.Component
        id="s1"
        props={stack.propsSchema.parse({})}
        style={{ backgroundColor: '#fff', padding: 16 }}
        dispatch={jest.fn()}
      />
    );
    expect(flatStyle('s1')).toMatchObject({ backgroundColor: '#fff', padding: 16 });
  });

  test('with no onTap action, does not intercept touches (plain View, not Pressable)', async () => {
    await render(
      <stack.Component id="s1" props={stack.propsSchema.parse({})} dispatch={jest.fn()} />
    );
    expect(screen.getByTestId('s1').props.onPress).toBeUndefined();
  });

  test('pressing dispatches the declared onTap action', async () => {
    const dispatch = jest.fn();
    await render(
      <stack.Component
        id="s1"
        props={stack.propsSchema.parse({})}
        actions={{ onTap: { type: 'navigate', payload: { route: 'pdp' } } }}
        dispatch={dispatch}
      />
    );

    await fireEvent.press(screen.getByTestId('s1'));

    expect(dispatch).toHaveBeenCalledWith({ type: 'navigate', payload: { route: 'pdp' } });
  });
});
