import React from 'react';
import { StyleSheet } from 'react-native';
import { render, screen } from '@testing-library/react-native';
import { spacer } from '../../../components/layout/spacer';

function flatStyle(testId: string) {
  return StyleSheet.flatten(screen.getByTestId(testId).props.style);
}

describe('spacer', () => {
  test('renders acceptably given only required props (id, no props)', async () => {
    await render(<spacer.Component id="sp1" props={spacer.propsSchema.parse({})} dispatch={jest.fn()} />);
    expect(screen.getByTestId('sp1')).toBeTruthy();
  });

  test('with no size, flexes to fill available space', async () => {
    await render(<spacer.Component id="sp1" props={spacer.propsSchema.parse({})} dispatch={jest.fn()} />);
    expect(flatStyle('sp1')).toMatchObject({ flex: 1 });
  });

  test('with a fixed size, sets width and height instead of flexing', async () => {
    await render(
      <spacer.Component id="sp1" props={spacer.propsSchema.parse({ size: 24 })} dispatch={jest.fn()} />
    );
    const style = flatStyle('sp1');
    expect(style).toMatchObject({ width: 24, height: 24 });
    expect(style.flex).toBeUndefined();
  });
});
