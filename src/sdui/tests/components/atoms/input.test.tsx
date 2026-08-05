import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react-native';
import { input } from '../../../components/atoms/input';

describe('input', () => {
  test('renders acceptably given only required props (none — everything defaults)', async () => {
    await render(<input.Component id="in1" props={input.propsSchema.parse({})} dispatch={jest.fn()} />);
    expect(screen.getByTestId('in1')).toBeTruthy();
  });

  test('shows the static placeholder when there is no rotation list', async () => {
    await render(
      <input.Component id="in1" props={input.propsSchema.parse({ placeholder: 'Search cars' })} dispatch={jest.fn()} />
    );
    expect(screen.getByTestId('in1').props.placeholder).toBe('Search cars');
  });

  test('cycles through placeholderRotation every rotationMs', async () => {
    jest.useFakeTimers();
    await render(
      <input.Component
        id="in1"
        props={input.propsSchema.parse({
          placeholderRotation: ['Search Baleno', 'Search Ertiga', 'Search Tata cars'],
          rotationMs: 2000,
        })}
        dispatch={jest.fn()}
      />
    );

    expect(screen.getByTestId('in1').props.placeholder).toBe('Search Baleno');

    await act(async () => jest.advanceTimersByTime(2000));
    expect(screen.getByTestId('in1').props.placeholder).toBe('Search Ertiga');

    await act(async () => jest.advanceTimersByTime(2000));
    expect(screen.getByTestId('in1').props.placeholder).toBe('Search Tata cars');

    await act(async () => jest.advanceTimersByTime(2000));
    expect(screen.getByTestId('in1').props.placeholder).toBe('Search Baleno');

    jest.useRealTimers();
  });

  test('value is shown in the field', async () => {
    await render(<input.Component id="in1" props={input.propsSchema.parse({ value: 'Baleno' })} dispatch={jest.fn()} />);
    expect(screen.getByTestId('in1').props.value).toBe('Baleno');
  });

  test('keyboard maps to keyboardType', async () => {
    await render(<input.Component id="in1" props={input.propsSchema.parse({ keyboard: 'numeric' })} dispatch={jest.fn()} />);
    expect(screen.getByTestId('in1').props.keyboardType).toBe('numeric');
  });

  test('readOnly makes the field non-editable', async () => {
    await render(<input.Component id="in1" props={input.propsSchema.parse({ readOnly: true })} dispatch={jest.fn()} />);
    expect(screen.getByTestId('in1').props.editable).toBe(false);
  });

  test('defaults to editable', async () => {
    await render(<input.Component id="in1" props={input.propsSchema.parse({})} dispatch={jest.fn()} />);
    expect(screen.getByTestId('in1').props.editable).toBe(true);
  });

  test('typing dispatches the declared onChange action with the new text', async () => {
    const dispatch = jest.fn();
    await render(
      <input.Component
        id="in1"
        props={input.propsSchema.parse({})}
        actions={{ onChange: { type: 'set_state', payload: { key: 'query', value: '$event.value' } } }}
        dispatch={dispatch}
      />
    );

    fireEvent.changeText(screen.getByTestId('in1'), 'Baleno');

    expect(dispatch).toHaveBeenCalledWith(
      { type: 'set_state', payload: { key: 'query', value: '$event.value' } },
      { value: 'Baleno' }
    );
  });

  test('readOnly + onTap wraps the field so tapping it dispatches onTap', async () => {
    const dispatch = jest.fn();
    await render(
      <input.Component
        id="in1"
        props={input.propsSchema.parse({ readOnly: true })}
        actions={{ onTap: { type: 'navigate', payload: { route: 'search' } } }}
        dispatch={dispatch}
      />
    );

    await fireEvent.press(screen.getByTestId('in1-tap-target'));

    expect(dispatch).toHaveBeenCalledWith({ type: 'navigate', payload: { route: 'search' } });
  });

  test('without readOnly, onTap is not wired (a real editable field, no tap wrapper)', async () => {
    await render(
      <input.Component
        id="in1"
        props={input.propsSchema.parse({})}
        actions={{ onTap: { type: 'navigate', payload: { route: 'search' } } }}
        dispatch={jest.fn()}
      />
    );
    expect(screen.queryByTestId('in1-tap-target')).toBeNull();
  });
});
