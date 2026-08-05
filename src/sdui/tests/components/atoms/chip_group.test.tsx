import React from 'react';
import { StyleSheet } from 'react-native';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { chip_group } from '../../../components/atoms/chip_group';
import type { ThemeTokens } from '../../../core/types';

const theme: ThemeTokens = {
  color: { brand: '#3B24C4', textOnBrand: '#FFFFFF', surfaceRaised: '#F5F6F8', textPrimary: '#101828' },
  space: { xs: 4, sm: 8 },
  radius: { pill: 999 },
  type: {},
};

const options = [
  { label: 'Hot deals', value: 'hot' },
  { label: 'Wishlisted', value: 'wishlisted' },
];

function flatStyle(testId: string) {
  return StyleSheet.flatten(screen.getByTestId(testId).props.style);
}

describe('chip_group', () => {
  test('renders acceptably given only required props (options)', async () => {
    await render(
      <chip_group.Component id="cg1" props={chip_group.propsSchema.parse({ options })} theme={theme} dispatch={jest.fn()} />
    );
    expect(screen.getByText('Hot deals')).toBeTruthy();
    expect(screen.getByText('Wishlisted')).toBeTruthy();
  });

  test('a selected chip is styled differently from an unselected one', async () => {
    await render(
      <chip_group.Component
        id="cg1"
        props={chip_group.propsSchema.parse({ options, selected: 'hot' })}
        theme={theme}
        dispatch={jest.fn()}
      />
    );
    expect(flatStyle('cg1-chip-hot')).toMatchObject({ backgroundColor: '#3B24C4' });
    expect(flatStyle('cg1-chip-wishlisted')).toMatchObject({ backgroundColor: '#F5F6F8' });
  });

  test('single-select: tapping a chip dispatches onSelect with the scalar value', async () => {
    const dispatch = jest.fn();
    await render(
      <chip_group.Component
        id="cg1"
        props={chip_group.propsSchema.parse({ options, selected: 'hot' })}
        theme={theme}
        actions={{ onSelect: { type: 'set_state', payload: { key: 'tab', value: '$event.value' } } }}
        dispatch={dispatch}
      />
    );

    await fireEvent.press(screen.getByTestId('cg1-chip-wishlisted'));

    expect(dispatch).toHaveBeenCalledWith(
      { type: 'set_state', payload: { key: 'tab', value: '$event.value' } },
      { value: 'wishlisted' }
    );
  });

  test('multi-select: tapping an unselected chip adds it to the selected array', async () => {
    const dispatch = jest.fn();
    await render(
      <chip_group.Component
        id="cg1"
        props={chip_group.propsSchema.parse({ options, selected: ['hot'], multi: true })}
        theme={theme}
        actions={{ onSelect: { type: 'set_state', payload: { key: 'filters', value: '$event.value' } } }}
        dispatch={dispatch}
      />
    );

    await fireEvent.press(screen.getByTestId('cg1-chip-wishlisted'));

    expect(dispatch).toHaveBeenCalledWith(
      { type: 'set_state', payload: { key: 'filters', value: '$event.value' } },
      { value: ['hot', 'wishlisted'] }
    );
  });

  test('multi-select: tapping an already-selected chip removes it (toggle off)', async () => {
    const dispatch = jest.fn();
    await render(
      <chip_group.Component
        id="cg1"
        props={chip_group.propsSchema.parse({ options, selected: ['hot', 'wishlisted'], multi: true })}
        theme={theme}
        actions={{ onSelect: { type: 'set_state', payload: { key: 'filters', value: '$event.value' } } }}
        dispatch={dispatch}
      />
    );

    await fireEvent.press(screen.getByTestId('cg1-chip-hot'));

    expect(dispatch).toHaveBeenCalledWith(
      { type: 'set_state', payload: { key: 'filters', value: '$event.value' } },
      { value: ['wishlisted'] }
    );
  });

  test('scrollable renders a horizontally scrolling container', async () => {
    await render(
      <chip_group.Component
        id="cg1"
        props={chip_group.propsSchema.parse({ options, scrollable: true })}
        theme={theme}
        dispatch={jest.fn()}
      />
    );
    expect(screen.getByTestId('cg1').props.horizontal).toBe(true);
  });

  test('without scrollable, chips wrap onto multiple lines instead', async () => {
    await render(
      <chip_group.Component id="cg1" props={chip_group.propsSchema.parse({ options })} theme={theme} dispatch={jest.fn()} />
    );
    expect(flatStyle('cg1')).toMatchObject({ flexWrap: 'wrap' });
  });
});
