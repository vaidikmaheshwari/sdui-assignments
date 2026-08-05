import React from 'react';
import { StyleSheet } from 'react-native';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { text } from '../../../components/atoms/text';
import type { ThemeTokens } from '../../../core/types';

const theme: ThemeTokens = {
  color: { textPrimary: '#101828', danger: '#E03131' },
  space: { lg: 16 },
  radius: { md: 12 },
  type: {
    h1: { size: 24, weight: '600' },
    body: { size: 14, weight: '400' },
    ghost: { size: 72, weight: '700' },
  },
};

function flatStyle(testId: string) {
  return StyleSheet.flatten(screen.getByTestId(testId).props.style);
}

describe('text', () => {
  test('renders acceptably given only required props (value)', async () => {
    await render(
      <text.Component id="t1" props={text.propsSchema.parse({ value: 'Buy car' })} theme={theme} dispatch={jest.fn()} />
    );
    expect(screen.getByText('Buy car')).toBeTruthy();
  });

  test('defaults to the "body" type token and "textPrimary" color', async () => {
    await render(
      <text.Component id="t1" props={text.propsSchema.parse({ value: 'x' })} theme={theme} dispatch={jest.fn()} />
    );
    expect(flatStyle('t1')).toMatchObject({ fontSize: 14, fontWeight: '400', color: '#101828' });
  });

  test('variant selects a different type token', async () => {
    await render(
      <text.Component
        id="t1"
        props={text.propsSchema.parse({ value: 'x', variant: 'type.h1' })}
        theme={theme}
        dispatch={jest.fn()}
      />
    );
    expect(flatStyle('t1')).toMatchObject({ fontSize: 24, fontWeight: '600' });
  });

  test('the ghost variant resolves to the large, low-opacity numeral token', async () => {
    await render(
      <text.Component
        id="t1"
        props={text.propsSchema.parse({ value: '128', variant: 'type.ghost', opacity: 0.08 })}
        theme={theme}
        dispatch={jest.fn()}
      />
    );
    expect(flatStyle('t1')).toMatchObject({ fontSize: 72, fontWeight: '700', opacity: 0.08 });
  });

  test('color selects a different color token', async () => {
    await render(
      <text.Component
        id="t1"
        props={text.propsSchema.parse({ value: 'x', color: 'color.danger' })}
        theme={theme}
        dispatch={jest.fn()}
      />
    );
    expect(flatStyle('t1')).toMatchObject({ color: '#E03131' });
  });

  test('an unknown variant token degrades gracefully — no crash, no fontSize forced', async () => {
    await render(
      <text.Component
        id="t1"
        props={text.propsSchema.parse({ value: 'x', variant: 'type.display' })}
        theme={theme}
        dispatch={jest.fn()}
      />
    );
    expect(screen.getByText('x')).toBeTruthy();
    expect(flatStyle('t1').fontSize).toBeUndefined();
  });

  test('maxLines sets numberOfLines', async () => {
    await render(
      <text.Component
        id="t1"
        props={text.propsSchema.parse({ value: 'x', maxLines: 2 })}
        theme={theme}
        dispatch={jest.fn()}
      />
    );
    expect(screen.getByTestId('t1').props.numberOfLines).toBe(2);
  });

  test('align sets textAlign', async () => {
    await render(
      <text.Component
        id="t1"
        props={text.propsSchema.parse({ value: 'x', align: 'center' })}
        theme={theme}
        dispatch={jest.fn()}
      />
    );
    expect(flatStyle('t1')).toMatchObject({ textAlign: 'center' });
  });

  test('defaults opacity to 1', async () => {
    await render(
      <text.Component id="t1" props={text.propsSchema.parse({ value: 'x' })} theme={theme} dispatch={jest.fn()} />
    );
    expect(flatStyle('t1')).toMatchObject({ opacity: 1 });
  });

  test('merges the resolved node style onto the text', async () => {
    await render(
      <text.Component
        id="t1"
        props={text.propsSchema.parse({ value: 'x' })}
        theme={theme}
        style={{ margin: 4 }}
        dispatch={jest.fn()}
      />
    );
    expect(flatStyle('t1')).toMatchObject({ margin: 4 });
  });

  test('with no onTap action, does not intercept touches', async () => {
    await render(
      <text.Component id="t1" props={text.propsSchema.parse({ value: 'x' })} theme={theme} dispatch={jest.fn()} />
    );
    expect(screen.getByTestId('t1').props.onPress).toBeUndefined();
  });

  test('pressing dispatches the declared onTap action', async () => {
    const dispatch = jest.fn();
    await render(
      <text.Component
        id="t1"
        props={text.propsSchema.parse({ value: 'x' })}
        theme={theme}
        actions={{ onTap: { type: 'navigate', payload: { route: 'pdp' } } }}
        dispatch={dispatch}
      />
    );

    await fireEvent.press(screen.getByTestId('t1'));

    expect(dispatch).toHaveBeenCalledWith({ type: 'navigate', payload: { route: 'pdp' } });
  });
});
