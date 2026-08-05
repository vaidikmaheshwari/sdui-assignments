import React from 'react';
import { StyleSheet } from 'react-native';
import { render, screen } from '@testing-library/react-native';
import { badge } from '../../../components/atoms/badge';
import type { ThemeTokens } from '../../../core/types';

const theme: ThemeTokens = {
  color: {
    surfaceRaised: '#F5F6F8',
    textPrimary: '#101828',
    brand: '#3B24C4',
    textOnBrand: '#FFFFFF',
    success: '#12B76A',
    danger: '#E03131',
  },
  space: { xs: 4, sm: 8 },
  radius: { pill: 999 },
  type: {},
};

function flatStyle(testId: string) {
  return StyleSheet.flatten(screen.getByTestId(testId).props.style);
}

describe('badge', () => {
  test('renders acceptably given only required props (label)', async () => {
    await render(
      <badge.Component id="b1" props={badge.propsSchema.parse({ label: 'Zero Worry' })} theme={theme} dispatch={jest.fn()} />
    );
    expect(screen.getByText('Zero Worry')).toBeTruthy();
  });

  test('defaults to the "neutral" tone (surfaceRaised background, textPrimary text)', async () => {
    await render(
      <badge.Component id="b1" props={badge.propsSchema.parse({ label: 'x' })} theme={theme} dispatch={jest.fn()} />
    );
    expect(flatStyle('b1')).toMatchObject({ backgroundColor: '#F5F6F8' });
  });

  test('tone "brand" uses brand background and on-brand text', async () => {
    await render(
      <badge.Component id="b1" props={badge.propsSchema.parse({ label: 'x', tone: 'brand' })} theme={theme} dispatch={jest.fn()} />
    );
    expect(flatStyle('b1')).toMatchObject({ backgroundColor: '#3B24C4' });
  });

  test('tone "success" uses the success color', async () => {
    await render(
      <badge.Component id="b1" props={badge.propsSchema.parse({ label: 'x', tone: 'success' })} theme={theme} dispatch={jest.fn()} />
    );
    expect(flatStyle('b1')).toMatchObject({ backgroundColor: '#12B76A' });
  });

  test('tone "danger" uses the danger color', async () => {
    await render(
      <badge.Component id="b1" props={badge.propsSchema.parse({ label: 'x', tone: 'danger' })} theme={theme} dispatch={jest.fn()} />
    );
    expect(flatStyle('b1')).toMatchObject({ backgroundColor: '#E03131' });
  });

  test('is pill-shaped via the radius.pill token', async () => {
    await render(
      <badge.Component id="b1" props={badge.propsSchema.parse({ label: 'x' })} theme={theme} dispatch={jest.fn()} />
    );
    expect(flatStyle('b1')).toMatchObject({ borderRadius: 999 });
  });

  test('without an icon, no glyph is rendered', async () => {
    await render(
      <badge.Component id="b1" props={badge.propsSchema.parse({ label: 'x' })} theme={theme} dispatch={jest.fn()} />
    );
    expect(screen.queryByTestId('b1-icon')).toBeNull();
  });

  test('with an icon, a glyph is rendered alongside the label', async () => {
    await render(
      <badge.Component
        id="b1"
        props={badge.propsSchema.parse({ label: 'x', icon: 'checkmark' })}
        theme={theme}
        dispatch={jest.fn()}
      />
    );
    expect(screen.getByTestId('b1-icon')).toBeTruthy();
  });

  test('merges the resolved node style onto the container', async () => {
    await render(
      <badge.Component
        id="b1"
        props={badge.propsSchema.parse({ label: 'x' })}
        theme={theme}
        style={{ margin: 4 }}
        dispatch={jest.fn()}
      />
    );
    expect(flatStyle('b1')).toMatchObject({ margin: 4 });
  });
});
