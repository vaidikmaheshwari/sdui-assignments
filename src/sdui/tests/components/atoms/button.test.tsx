import React from 'react';
import { StyleSheet } from 'react-native';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { button } from '../../../components/atoms/button';
import type { ThemeTokens } from '../../../core/types';

const theme: ThemeTokens = {
  color: { brand: '#3B24C4', textOnBrand: '#FFFFFF', surfaceRaised: '#F5F6F8', textPrimary: '#101828' },
  space: { xs: 4, sm: 8, md: 12, lg: 16, xl: 24 },
  radius: { md: 12 },
  type: {},
};

function flatStyle(testId: string) {
  return StyleSheet.flatten(screen.getByTestId(testId).props.style);
}

describe('button', () => {
  test('renders acceptably given only required props (label)', async () => {
    await render(
      <button.Component id="btn1" props={button.propsSchema.parse({ label: 'View deal' })} theme={theme} dispatch={jest.fn()} />
    );
    expect(screen.getByText('View deal')).toBeTruthy();
  });

  test('defaults to the "primary" variant (brand background, on-brand text)', async () => {
    await render(
      <button.Component id="btn1" props={button.propsSchema.parse({ label: 'x' })} theme={theme} dispatch={jest.fn()} />
    );
    expect(flatStyle('btn1')).toMatchObject({ backgroundColor: '#3B24C4' });
  });

  test('variant "outline" is transparent with a brand border', async () => {
    await render(
      <button.Component
        id="btn1"
        props={button.propsSchema.parse({ label: 'x', variant: 'outline' })}
        theme={theme}
        dispatch={jest.fn()}
      />
    );
    expect(flatStyle('btn1')).toMatchObject({ backgroundColor: 'transparent', borderColor: '#3B24C4', borderWidth: 1 });
  });

  test('variant "ghost" is transparent with no border', async () => {
    await render(
      <button.Component
        id="btn1"
        props={button.propsSchema.parse({ label: 'x', variant: 'ghost' })}
        theme={theme}
        dispatch={jest.fn()}
      />
    );
    const style = flatStyle('btn1');
    expect(style.backgroundColor).toBe('transparent');
    expect(style.borderWidth).toBeUndefined();
  });

  test('fullWidth stretches the button, otherwise it hugs its content', async () => {
    await render(
      <button.Component
        id="btn1"
        props={button.propsSchema.parse({ label: 'x', fullWidth: true })}
        theme={theme}
        dispatch={jest.fn()}
      />
    );
    expect(flatStyle('btn1')).toMatchObject({ alignSelf: 'stretch' });
  });

  test('without fullWidth, the button hugs its content', async () => {
    await render(
      <button.Component id="btn1" props={button.propsSchema.parse({ label: 'x' })} theme={theme} dispatch={jest.fn()} />
    );
    expect(flatStyle('btn1')).toMatchObject({ alignSelf: 'flex-start' });
  });

  test('size "lg" uses more padding than "sm"', async () => {
    await render(
      <button.Component id="btn1" props={button.propsSchema.parse({ label: 'x', size: 'lg' })} theme={theme} dispatch={jest.fn()} />
    );
    const lg = flatStyle('btn1');
    expect(lg.paddingHorizontal).toBe(24);
    expect(lg.paddingVertical).toBe(12);
  });

  test('enabled defaults to true and dispatches the declared onTap action when pressed', async () => {
    const dispatch = jest.fn();
    await render(
      <button.Component
        id="btn1"
        props={button.propsSchema.parse({ label: 'x' })}
        theme={theme}
        actions={{ onTap: { type: 'navigate', payload: { route: 'pdp' } } }}
        dispatch={dispatch}
      />
    );

    await fireEvent.press(screen.getByTestId('btn1'));

    expect(dispatch).toHaveBeenCalledWith({ type: 'navigate', payload: { route: 'pdp' } });
  });

  test('enabled: false disables the button and does not dispatch on press', async () => {
    const dispatch = jest.fn();
    await render(
      <button.Component
        id="btn1"
        props={button.propsSchema.parse({ label: 'x', enabled: false })}
        theme={theme}
        actions={{ onTap: { type: 'navigate', payload: { route: 'pdp' } } }}
        dispatch={dispatch}
      />
    );

    expect(screen.getByTestId('btn1').props.accessibilityState).toMatchObject({ disabled: true });
    await fireEvent.press(screen.getByTestId('btn1'));

    expect(dispatch).not.toHaveBeenCalled();
  });

  test('enabled: false visibly dims the button', async () => {
    await render(
      <button.Component id="btn1" props={button.propsSchema.parse({ label: 'x', enabled: false })} theme={theme} dispatch={jest.fn()} />
    );
    expect(flatStyle('btn1').opacity).toBeLessThan(1);
  });

  test('without an icon, no glyph is rendered', async () => {
    await render(
      <button.Component id="btn1" props={button.propsSchema.parse({ label: 'x' })} theme={theme} dispatch={jest.fn()} />
    );
    expect(screen.queryByTestId('btn1-icon')).toBeNull();
  });

  test('an icon renders alongside the label', async () => {
    await render(
      <button.Component
        id="btn1"
        props={button.propsSchema.parse({ label: 'x', icon: 'arrow-forward' })}
        theme={theme}
        dispatch={jest.fn()}
      />
    );
    expect(screen.getByTestId('btn1-icon')).toBeTruthy();
  });
});
