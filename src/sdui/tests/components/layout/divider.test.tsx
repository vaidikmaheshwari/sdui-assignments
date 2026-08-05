import React from 'react';
import { StyleSheet } from 'react-native';
import { render, screen } from '@testing-library/react-native';
import { divider } from '../../../components/layout/divider';

function flatStyle(testId: string) {
  return StyleSheet.flatten(screen.getByTestId(testId).props.style);
}

describe('divider', () => {
  test('renders acceptably given only required props (id, no props)', async () => {
    await render(<divider.Component id="d1" props={divider.propsSchema.parse({})} dispatch={jest.fn()} />);
    expect(screen.getByTestId('d1')).toBeTruthy();
  });

  test('defaults to a hairline (1) thickness and no inset', async () => {
    await render(<divider.Component id="d1" props={divider.propsSchema.parse({})} dispatch={jest.fn()} />);
    expect(flatStyle('d1')).toMatchObject({ height: 1, marginHorizontal: 0 });
  });

  test('thickness sets the line height', async () => {
    await render(
      <divider.Component id="d1" props={divider.propsSchema.parse({ thickness: 4 })} dispatch={jest.fn()} />
    );
    expect(flatStyle('d1')).toMatchObject({ height: 4 });
  });

  test('inset sets horizontal margin', async () => {
    await render(
      <divider.Component id="d1" props={divider.propsSchema.parse({ inset: 16 })} dispatch={jest.fn()} />
    );
    expect(flatStyle('d1')).toMatchObject({ marginHorizontal: 16 });
  });

  test('a style-provided backgroundColor overrides the default line color', async () => {
    await render(
      <divider.Component
        id="d1"
        props={divider.propsSchema.parse({})}
        style={{ backgroundColor: '#3B24C4' }}
        dispatch={jest.fn()}
      />
    );
    expect(flatStyle('d1')).toMatchObject({ backgroundColor: '#3B24C4' });
  });
});
