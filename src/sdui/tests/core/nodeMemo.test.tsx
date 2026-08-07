/**
 * docs/PROMPTS.md P7 item 3 — container-level node memoization.
 *
 * The risk this guards is the one that made me key the memo on subtree inputs rather than on
 * the "id + resolved props hash" the prompt asked for: a container's own props can be constant
 * while its descendants' bindings change. If the memo were keyed on the container's own props,
 * this suite's third test would serve a stale subtree after a state change.
 */
import React from 'react';
import { act, render, screen, fireEvent } from '@testing-library/react-native';
import { SDUIScreen } from '../../screens/SDUIScreen';
import { setNodeMemoEnabled } from '../../core/SDUINode';
import { parsePayload } from '../../core/schema';
import { registry } from '../../components';
import type { Payload } from '../../core/types';

// A container whose own props never change, wrapping a child that reads state. Exactly the
// shape a props-hash-keyed memo would get wrong.
function payloadWithStatefulSubtree(): Payload {
  const parsed = parsePayload({
    schemaVersion: '1.1.0',
    screenId: 'test',
    theme: { tokens: { color: { bg: '#FFFFFF' }, space: {}, radius: {}, type: {} } },
    state: { label: 'before' },
    sections: [
      {
        id: 's.container',
        type: 'stack',
        props: { direction: 'vertical' },
        children: [
          { id: 's.readout', type: 'text', props: { value: '{{state.label}}' } },
          {
            id: 's.button',
            type: 'button',
            props: { label: 'change' },
            actions: { onTap: { type: 'set_state', payload: { key: 'label', value: 'after' } } },
          },
        ],
      },
    ],
  });
  if (!parsed.success) throw new Error('fixture failed to parse');
  return parsed.data;
}

describe('node memoization', () => {
  afterEach(() => setNodeMemoEnabled(false));

  test('is off by default, so the pre-P7 render path is unchanged', async () => {
    await render(<SDUIScreen payload={payloadWithStatefulSubtree()} registry={registry} />);
    expect(screen.getByText('before')).toBeTruthy();
  });

  test('renders the same tree when enabled', async () => {
    setNodeMemoEnabled(true);
    await render(<SDUIScreen payload={payloadWithStatefulSubtree()} registry={registry} />);
    expect(screen.getByText('before')).toBeTruthy();
  });

  test('a state change still reaches a memoized container’s descendants', async () => {
    setNodeMemoEnabled(true);
    await render(<SDUIScreen payload={payloadWithStatefulSubtree()} registry={registry} />);
    expect(screen.getByText('before')).toBeTruthy();

    await act(async () => {
      fireEvent.press(screen.getByText('change'));
    });

    expect(screen.getByText('after')).toBeTruthy();
    expect(screen.queryByText('before')).toBeNull();
  });
});
