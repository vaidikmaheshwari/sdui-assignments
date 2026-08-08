import React from 'react';
import { StyleSheet } from 'react-native';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { icon } from '../../../components/atoms/icon';
import type { ThemeTokens } from '../../../core/types';

const theme: ThemeTokens = {
  color: { textPrimary: '#101828', danger: '#E03131' },
  space: {},
  radius: {},
  type: {},
};

function flatStyle(testId: string) {
  return StyleSheet.flatten(screen.getByTestId(testId).props.style);
}

describe('icon', () => {
  test('renders acceptably given only required props (name)', async () => {
    await render(
      <icon.Component id="i1" props={icon.propsSchema.parse({ name: 'heart' })} theme={theme} dispatch={jest.fn()} />
    );
    expect(screen.getByTestId('i1')).toBeTruthy();
  });

  test('defaults to size 24 and the "textPrimary" color', async () => {
    await render(
      <icon.Component id="i1" props={icon.propsSchema.parse({ name: 'heart' })} theme={theme} dispatch={jest.fn()} />
    );
    expect(flatStyle('i1')).toMatchObject({ fontSize: 24, color: '#101828' });
  });

  test('size overrides the default', async () => {
    await render(
      <icon.Component
        id="i1"
        props={icon.propsSchema.parse({ name: 'heart', size: 32 })}
        theme={theme}
        dispatch={jest.fn()}
      />
    );
    expect(flatStyle('i1')).toMatchObject({ fontSize: 32 });
  });

  test('color resolves a different color token', async () => {
    await render(
      <icon.Component
        id="i1"
        props={icon.propsSchema.parse({ name: 'heart', color: 'color.danger' })}
        theme={theme}
        dispatch={jest.fn()}
      />
    );
    expect(flatStyle('i1')).toMatchObject({ color: '#E03131' });
  });

  test('a different name renders a different glyph', async () => {
    await render(
      <>
        <icon.Component id="i1" props={icon.propsSchema.parse({ name: 'heart' })} theme={theme} dispatch={jest.fn()} />
        <icon.Component
          id="i2"
          props={icon.propsSchema.parse({ name: 'chevron-forward' })}
          theme={theme}
          dispatch={jest.fn()}
        />
      </>
    );
    expect(screen.getByTestId('i2').children[0]).not.toBe(screen.getByTestId('i1').children[0]);
  });

  test('with no onTap action, does not intercept touches', async () => {
    await render(
      <icon.Component id="i1" props={icon.propsSchema.parse({ name: 'heart' })} theme={theme} dispatch={jest.fn()} />
    );
    expect(screen.getByTestId('i1').props.onPress).toBeUndefined();
  });

  test('pressing dispatches the declared onTap action', async () => {
    const dispatch = jest.fn();
    await render(
      <icon.Component
        id="i1"
        props={icon.propsSchema.parse({ name: 'heart' })}
        theme={theme}
        actions={{ onTap: { type: 'navigate', payload: { route: 'pdp' } } }}
        dispatch={dispatch}
      />
    );

    await fireEvent.press(screen.getByTestId('i1'));

    expect(dispatch).toHaveBeenCalledWith({ type: 'navigate', payload: { route: 'pdp' } });
  });

  // Two icons of different sizes in one row sat at two different heights: flexbox centres the
  // text boxes correctly, but Android's font padding leaves the glyph off-centre inside its box
  // by an amount that scales with `size`. Asserted on both shapes because the tappable one
  // renders through a Pressable and the plain one does not.
  test.each([
    ['plain', undefined],
    ['tappable', { onTap: { type: 'navigate' as const, payload: { route: 'x' } } }],
  ])('%s icons neutralise the font padding that pushes the glyph off-centre', async (_label, actions) => {
    await render(
      <icon.Component
        id="i1"
        props={icon.propsSchema.parse({ name: 'heart' })}
        theme={theme}
        actions={actions}
        dispatch={jest.fn()}
      />
    );

    const target = screen.getByTestId('i1');
    const glyph = actions ? target.children[0] : target;
    expect(StyleSheet.flatten((glyph as { props: { style?: unknown } }).props.style)).toMatchObject({
      includeFontPadding: false,
      textAlignVertical: 'center',
    });
  });

  test('the tap wrapper centres the glyph it contains', async () => {
    await render(
      <icon.Component
        id="i1"
        props={icon.propsSchema.parse({ name: 'heart' })}
        theme={theme}
        actions={{ onTap: { type: 'navigate', payload: { route: 'x' } } }}
        dispatch={jest.fn()}
      />
    );
    expect(StyleSheet.flatten(screen.getByTestId('i1').props.style)).toMatchObject({
      alignItems: 'center',
      justifyContent: 'center',
    });
  });
});
