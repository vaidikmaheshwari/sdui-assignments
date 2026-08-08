import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { DebugOverlay } from '../../../components/chrome/DebugOverlay';
import { clearDevLog, warn } from '../../../utils/devLog';

describe('DebugOverlay', () => {
  beforeEach(() => {
    clearDevLog();
  });

  test('shows a badge with the current degradation count and no panel until tapped', async () => {
    warn('test', 'unknown component type "video_banner"');
    await render(<DebugOverlay />);
    expect(screen.getByTestId('sdui-debug-overlay-toggle')).toBeTruthy();
    expect(screen.queryByTestId('sdui-debug-overlay-panel')).toBeNull();
  });

  test('tapping the badge opens a panel listing every logged entry', async () => {
    warn('registry', 'unknown component type "video_banner"');
    warn('bindings', 'binding path missing: data.foo');
    await render(<DebugOverlay />);

    await fireEvent.press(screen.getByTestId('sdui-debug-overlay-toggle'));

    expect(screen.getByTestId('sdui-debug-overlay-panel')).toBeTruthy();
    expect(screen.getByText(/unknown component type "video_banner"/)).toBeTruthy();
    expect(screen.getByText(/binding path missing: data.foo/)).toBeTruthy();
  });

  test('tapping again closes the panel', async () => {
    warn('test', 'something');
    await render(<DebugOverlay />);

    await fireEvent.press(screen.getByTestId('sdui-debug-overlay-toggle'));
    expect(screen.getByTestId('sdui-debug-overlay-panel')).toBeTruthy();

    await fireEvent.press(screen.getByTestId('sdui-debug-overlay-toggle'));
    expect(screen.queryByTestId('sdui-debug-overlay-panel')).toBeNull();
  });

  test('with nothing logged, the panel says so instead of showing an empty list', async () => {
    await render(<DebugOverlay />);
    await fireEvent.press(screen.getByTestId('sdui-debug-overlay-toggle'));
    expect(screen.getByText('None.')).toBeTruthy();
  });
});
