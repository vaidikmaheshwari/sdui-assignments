import React from 'react';
import { StyleSheet, Text } from 'react-native';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { accordion } from '../../../components/atoms/accordion';

function flatStyle(testId: string) {
  return StyleSheet.flatten(screen.getByTestId(testId).props.style);
}

describe('accordion', () => {
  test('renders acceptably given only required props (title)', async () => {
    await render(
      <accordion.Component id="a1" props={accordion.propsSchema.parse({ title: 'Zero Worry' })} dispatch={jest.fn()}>
        <Text>body content</Text>
      </accordion.Component>
    );
    expect(screen.getByText('Zero Worry')).toBeTruthy();
  });

  test('collapsed (default) does not render the body', async () => {
    await render(
      <accordion.Component id="a1" props={accordion.propsSchema.parse({ title: 'x' })} dispatch={jest.fn()}>
        <Text>body content</Text>
      </accordion.Component>
    );
    expect(screen.queryByText('body content')).toBeNull();
  });

  test('expanded renders the body', async () => {
    await render(
      <accordion.Component id="a1" props={accordion.propsSchema.parse({ title: 'x', expanded: true })} dispatch={jest.fn()}>
        <Text>body content</Text>
      </accordion.Component>
    );
    expect(screen.getByText('body content')).toBeTruthy();
  });

  test('tapping a collapsed header dispatches onToggle with value: true', async () => {
    const dispatch = jest.fn();
    await render(
      <accordion.Component
        id="a1"
        props={accordion.propsSchema.parse({ title: 'x', expanded: false })}
        actions={{ onToggle: { type: 'set_state', payload: { key: 'faqOpen', value: '$event.value' } } }}
        dispatch={dispatch}
      >
        <Text>body content</Text>
      </accordion.Component>
    );

    await fireEvent.press(screen.getByTestId('a1-header'));

    expect(dispatch).toHaveBeenCalledWith(
      { type: 'set_state', payload: { key: 'faqOpen', value: '$event.value' } },
      { value: true }
    );
  });

  test('tapping an expanded header dispatches onToggle with value: false', async () => {
    const dispatch = jest.fn();
    await render(
      <accordion.Component
        id="a1"
        props={accordion.propsSchema.parse({ title: 'x', expanded: true })}
        actions={{ onToggle: { type: 'set_state', payload: { key: 'faqOpen', value: '$event.value' } } }}
        dispatch={dispatch}
      >
        <Text>body content</Text>
      </accordion.Component>
    );

    await fireEvent.press(screen.getByTestId('a1-header'));

    expect(dispatch).toHaveBeenCalledWith(
      { type: 'set_state', payload: { key: 'faqOpen', value: '$event.value' } },
      { value: false }
    );
  });

  test('the chevron rotates when expanded', async () => {
    await render(
      <accordion.Component id="a1" props={accordion.propsSchema.parse({ title: 'x', expanded: false })} dispatch={jest.fn()} />
    );
    const collapsedStyle = flatStyle('a1-chevron');

    await render(
      <accordion.Component id="a2" props={accordion.propsSchema.parse({ title: 'x', expanded: true })} dispatch={jest.fn()} />
    );
    const expandedStyle = flatStyle('a2-chevron');

    expect(expandedStyle.transform).not.toEqual(collapsedStyle.transform);
  });
});
