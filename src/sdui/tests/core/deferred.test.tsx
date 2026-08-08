/**
 * docs/SCHEMA.md §3 `deferred` + docs/PROMPTS.md P7 item 2.
 *
 * The behaviour under test is a *hint*: honouring it must be opt-in, and honouring it must
 * still end with every section on screen. A deferred section that never arrives is a bug, not
 * an optimisation.
 *
 * `InteractionManager.runAfterInteractions` is driven by hand rather than waited on. Whether it
 * has already flushed by the time `render` resolves is a scheduling race, and a test that
 * sometimes asserts "not yet rendered" after it has already rendered is worse than no test.
 */
import React from 'react';
import { InteractionManager } from 'react-native';
import { act, render, screen } from '@testing-library/react-native';
import { SDUIScreen } from '../../screens/SDUIScreen/SDUIScreen';
import { parsePayload } from '../../core/schema';
import { registry } from '../../components';
import type { Payload } from '../../core/types';

function payloadWithDeferredTail(): Payload {
  const parsed = parsePayload({
    schemaVersion: '1.1.0',
    screenId: 'test',
    theme: { tokens: { color: { bg: '#FFFFFF' }, space: {}, radius: {}, type: {} } },
    sections: [
      { id: 's.above', type: 'text', props: { value: 'above the fold' } },
      { id: 's.below', type: 'text', props: { value: 'below the fold' }, deferred: true },
    ],
  });
  if (!parsed.success) throw new Error('fixture failed to parse');
  return parsed.data;
}

describe('deferred sections', () => {
  test('parses as an optional additive field and survives the round trip', () => {
    const payload = payloadWithDeferredTail();
    expect(payload.sections[0].deferred).toBeUndefined();
    expect(payload.sections[1].deferred).toBe(true);
  });

  test('a client that does not opt in renders deferred sections immediately', async () => {
    await render(<SDUIScreen payload={payloadWithDeferredTail()} registry={registry} />);
    expect(screen.getByText('above the fold')).toBeTruthy();
    expect(screen.getByText('below the fold')).toBeTruthy();
  });

  test('opting in holds the deferred section back, then delivers it with no user action', async () => {
    let release: (() => void) | undefined;
    const spy = jest
      .spyOn(InteractionManager, 'runAfterInteractions')
      .mockImplementation(((task: () => void) => {
        release = task;
        return { then: () => Promise.resolve(), done: () => undefined, cancel: () => undefined };
      }) as unknown as typeof InteractionManager.runAfterInteractions);

    try {
      await render(
        <SDUIScreen payload={payloadWithDeferredTail()} registry={registry} honourDeferred />
      );

      expect(screen.getByText('above the fold')).toBeTruthy();
      expect(screen.queryByText('below the fold')).toBeNull();

      // No user action — just interactions going idle, which always happens.
      await act(async () => {
        release?.();
      });

      expect(screen.getByText('below the fold')).toBeTruthy();
    } finally {
      spy.mockRestore();
    }
  });
});
