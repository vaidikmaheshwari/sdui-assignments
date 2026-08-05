import React from 'react';
import { StyleSheet, Text } from 'react-native';
import { render, screen } from '@testing-library/react-native';
import { sticky } from '../../../components/layout/sticky';

function flatStyle(testId: string) {
  return StyleSheet.flatten(screen.getByTestId(testId).props.style);
}

describe('sticky', () => {
  test('renders acceptably given only required props (id, no props) and shows its children', async () => {
    await render(
      <sticky.Component id="st1" props={sticky.propsSchema.parse({})} dispatch={jest.fn()}>
        <Text>pinned content</Text>
      </sticky.Component>
    );
    expect(screen.getByText('pinned content')).toBeTruthy();
  });

  test('elevation drives the Android elevation and iOS shadow opacity', async () => {
    await render(
      <sticky.Component id="st1" props={sticky.propsSchema.parse({ elevation: 8 })} dispatch={jest.fn()} />
    );
    const style = flatStyle('st1');
    expect(style.elevation).toBe(8);
    expect(style.shadowOpacity).toBeGreaterThan(0);
  });

  test('edge "top" casts the shadow downward (positive offset height)', async () => {
    await render(
      <sticky.Component id="st1" props={sticky.propsSchema.parse({ edge: 'top' })} dispatch={jest.fn()} />
    );
    expect(flatStyle('st1').shadowOffset).toMatchObject({ height: 2 });
  });

  test('edge "bottom" casts the shadow upward (negative offset height)', async () => {
    await render(
      <sticky.Component id="st1" props={sticky.propsSchema.parse({ edge: 'bottom' })} dispatch={jest.fn()} />
    );
    expect(flatStyle('st1').shadowOffset).toMatchObject({ height: -2 });
  });

  test('merges the resolved node style onto the container', async () => {
    await render(
      <sticky.Component
        id="st1"
        props={sticky.propsSchema.parse({})}
        style={{ backgroundColor: '#fff' }}
        dispatch={jest.fn()}
      />
    );
    expect(flatStyle('st1')).toMatchObject({ backgroundColor: '#fff' });
  });
});
