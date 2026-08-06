import React from 'react';
import { StyleSheet } from 'react-native';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { tile } from '../../../components/composites/tile';
import type { ThemeTokens } from '../../../core/types';

const theme: ThemeTokens = {
  color: { tileBlue: '#123FA8', textOnBrand: '#FFFFFF', textPrimary: '#101828', surfaceRaised: '#F5F6F8' },
  space: { md: 16 },
  radius: { md: 12, pill: 999 },
  type: { body: { size: 14, weight: '500' }, caption: { size: 12, weight: '400' } },
};

function flatStyle(testId: string) {
  return StyleSheet.flatten(screen.getByTestId(testId).props.style);
}

describe('tile', () => {
  test('renders acceptably given only required props (label, imageUrl)', async () => {
    await render(
      <tile.Component
        id="t1"
        props={tile.propsSchema.parse({ label: 'Hatchback', imageUrl: 'https://example.com/a.png' })}
        theme={theme}
        dispatch={jest.fn()}
      />
    );
    expect(screen.getByText('Hatchback')).toBeTruthy();
  });

  test('defaults to the "card" variant', async () => {
    await render(
      <tile.Component
        id="t1"
        props={tile.propsSchema.parse({ label: 'Hatchback', imageUrl: 'https://example.com/a.png' })}
        theme={theme}
        dispatch={jest.fn()}
      />
    );
    expect(screen.getByTestId('t1')).toBeTruthy();
  });

  test('applies labelColor as a resolved token', async () => {
    await render(
      <tile.Component
        id="t1"
        props={tile.propsSchema.parse({
          label: 'Hatchback',
          imageUrl: 'https://example.com/a.png',
          labelColor: 'color.textOnBrand',
        })}
        theme={theme}
        dispatch={jest.fn()}
      />
    );
    expect(flatStyle('t1-label')).toMatchObject({ color: '#FFFFFF' });
  });

  test('"avatar" variant centers content and does not error', async () => {
    await render(
      <tile.Component
        id="t1"
        props={tile.propsSchema.parse({
          label: 'New Car Loan',
          imageUrl: 'https://example.com/a.png',
          variant: 'avatar',
        })}
        theme={theme}
        dispatch={jest.fn()}
      />
    );
    expect(flatStyle('t1')).toMatchObject({ alignItems: 'center' });
  });

  test('merges the resolved node style onto the container', async () => {
    await render(
      <tile.Component
        id="t1"
        props={tile.propsSchema.parse({ label: 'Hatchback', imageUrl: 'https://example.com/a.png' })}
        theme={theme}
        style={{ backgroundColor: '#123FA8', width: 132, height: 148 }}
        dispatch={jest.fn()}
      />
    );
    expect(flatStyle('t1')).toMatchObject({ backgroundColor: '#123FA8', width: 132, height: 148 });
  });

  test('without onTap, the container is not pressable', async () => {
    await render(
      <tile.Component
        id="t1"
        props={tile.propsSchema.parse({ label: 'Hatchback', imageUrl: 'https://example.com/a.png' })}
        theme={theme}
        dispatch={jest.fn()}
      />
    );
    expect(screen.getByTestId('t1').props.onPress).toBeUndefined();
  });

  test('with onTap, tapping the tile dispatches the action', async () => {
    const dispatch = jest.fn();
    const onTap = { type: 'navigate' as const, payload: { route: 'listing' } };
    await render(
      <tile.Component
        id="t1"
        props={tile.propsSchema.parse({ label: 'Hatchback', imageUrl: 'https://example.com/a.png' })}
        theme={theme}
        actions={{ onTap }}
        dispatch={dispatch}
      />
    );
    fireEvent.press(screen.getByTestId('t1'));
    expect(dispatch).toHaveBeenCalledWith(onTap);
  });
});
