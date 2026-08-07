import { Linking } from 'react-native';
import { resolveActionPayload, pageStateReducer, runAction, type ActionRuntime } from '../../core/actions';
import { clearDevLog, getDevLog } from '../../utils/devLog';
import type { Action, SDUINode } from '../../core/types';

beforeEach(() => {
  clearDevLog();
});

describe('resolveActionPayload', () => {
  test('substitutes $event.value inside the payload', () => {
    const action: Action = { type: 'set_state', payload: { key: 'tab', value: '$event.value' } };
    const resolved = resolveActionPayload(action, { value: 'hot' });
    expect(resolved).toEqual({ type: 'set_state', payload: { key: 'tab', value: 'hot' } });
  });

  test('leaves a payload with no bindings untouched', () => {
    const action: Action = { type: 'navigate', payload: { route: 'pdp' } };
    const resolved = resolveActionPayload(action, undefined);
    expect(resolved).toEqual(action);
  });

  // An open_sheet payload carries an SDUI subtree, not data. Resolving it here would substitute
  // its {{state.*}}/{{data.*}} against a context that has neither, burning the bindings away
  // before SDUINode ever sees them — a sheet could be interactive but never data-driven.
  test('passes an open_sheet subtree through verbatim, bindings intact', () => {
    const node: SDUINode = {
      id: 'sheet.total',
      type: 'text',
      props: { value: '{{data.emiByTenure[state.tenure].total}}' },
    };
    const action: Action = { type: 'open_sheet', payload: { title: '$event.value', node } };

    const resolved = resolveActionPayload(action, { value: 'Price breakup' });

    expect(resolved).toEqual({
      type: 'open_sheet',
      // Everything that *is* data still resolves…
      payload: { title: 'Price breakup', node },
    });
    // …and the subtree is the same object, not a rebuilt copy with its bindings substituted.
    expect((resolved as Extract<Action, { type: 'open_sheet' }>).payload.node).toBe(node);
  });

  // runAction already resolves each member against the same event when it dispatches it, so
  // resolving them here too is redundant — and destructive, because a sequence containing an
  // open_sheet would strip the subtree one level higher up.
  test('passes sequence members through verbatim, so a nested open_sheet survives', () => {
    const node: SDUINode = { id: 'sheet', type: 'text', props: { value: '{{state.tenure}}' } };
    const action: Action = {
      type: 'sequence',
      payload: {
        actions: [
          { type: 'track', payload: { event: 'opened' } },
          { type: 'open_sheet', payload: { node } },
        ],
      },
    };

    const resolved = resolveActionPayload(action, undefined) as Extract<Action, { type: 'sequence' }>;
    const nested = resolved.payload.actions[1] as Extract<Action, { type: 'open_sheet' }>;

    expect(nested.payload.node).toBe(node);
  });
});

describe('pageStateReducer', () => {
  test('set_state writes the key', () => {
    const next = pageStateReducer({ tab: 'a' }, { type: 'set_state', payload: { key: 'tab', value: 'b' } });
    expect(next).toEqual({ tab: 'b' });
  });

  test('every other action type leaves state untouched', () => {
    const state = { tab: 'a' };
    const next = pageStateReducer(state, { type: 'navigate', payload: { route: 'pdp' } });
    expect(next).toBe(state);
  });
});

function makeRuntime(overrides: Partial<ActionRuntime> = {}): ActionRuntime {
  return {
    dispatchState: jest.fn(),
    openSheet: jest.fn(),
    ...overrides,
  };
}

describe('runAction', () => {
  test('set_state calls dispatchState with the resolved action', () => {
    const runtime = makeRuntime();
    runAction({ type: 'set_state', payload: { key: 'tab', value: '$event.value' } }, { value: 'hot' }, runtime);
    expect(runtime.dispatchState).toHaveBeenCalledWith({
      type: 'set_state',
      payload: { key: 'tab', value: 'hot' },
    });
  });

  test('navigate calls effects.onNavigate with route and params', () => {
    const onNavigate = jest.fn();
    const runtime = makeRuntime({ effects: { onNavigate } });
    runAction({ type: 'navigate', payload: { route: 'pdp', params: { carId: 'c_889' } } }, undefined, runtime);
    expect(onNavigate).toHaveBeenCalledWith('pdp', { carId: 'c_889' });
  });

  test('navigate with no effect handler no-ops and warns, never throws', () => {
    const runtime = makeRuntime();
    expect(() =>
      runAction({ type: 'navigate', payload: { route: 'pdp' } }, undefined, runtime)
    ).not.toThrow();
    expect(getDevLog().some((e) => e.message.includes('navigate'))).toBe(true);
  });

  test('track calls effects.onTrack', () => {
    const onTrack = jest.fn();
    const runtime = makeRuntime({ effects: { onTrack } });
    runAction(
      { type: 'track', payload: { event: 'car_list_tab_changed', props: { tab: 'hot' } } },
      undefined,
      runtime
    );
    expect(onTrack).toHaveBeenCalledWith('car_list_tab_changed', { tab: 'hot' });
  });

  test('refresh calls effects.onRefresh', () => {
    const onRefresh = jest.fn();
    const runtime = makeRuntime({ effects: { onRefresh } });
    runAction(
      { type: 'refresh', payload: { endpoint: '/section/deals', targetId: 'home.deals' } },
      undefined,
      runtime
    );
    expect(onRefresh).toHaveBeenCalledWith('/section/deals', 'home.deals');
  });

  test('open_url calls the effects override when provided', () => {
    const onOpenUrl = jest.fn();
    const runtime = makeRuntime({ effects: { onOpenUrl } });
    runAction({ type: 'open_url', payload: { url: 'https://cars24.com' } }, undefined, runtime);
    expect(onOpenUrl).toHaveBeenCalledWith('https://cars24.com');
  });

  test('open_url falls back to Linking.openURL when no override is given', () => {
    const spy = jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined);
    const runtime = makeRuntime();
    runAction({ type: 'open_url', payload: { url: 'https://cars24.com' } }, undefined, runtime);
    expect(spy).toHaveBeenCalledWith('https://cars24.com');
    spy.mockRestore();
  });

  test('open_sheet calls runtime.openSheet with the node and title', () => {
    const runtime = makeRuntime();
    const node: SDUINode = { id: 'sheet1', type: 'text', props: { value: 'hi' } };
    runAction({ type: 'open_sheet', payload: { title: 'Price breakup', node } }, undefined, runtime);
    expect(runtime.openSheet).toHaveBeenCalledWith(node, 'Price breakup');
  });

  test('sequence runs every sub-action in order', () => {
    const calls: string[] = [];
    const runtime = makeRuntime({
      dispatchState: jest.fn((action: Action) => {
        if (action.type === 'set_state') calls.push(action.payload.key);
      }),
    });
    runAction(
      {
        type: 'sequence',
        payload: {
          actions: [
            { type: 'set_state', payload: { key: 'a', value: 1 } },
            { type: 'set_state', payload: { key: 'b', value: 2 } },
          ],
        },
      },
      undefined,
      runtime
    );
    expect(calls).toEqual(['a', 'b']);
  });

  test('sequence continues past a member whose handler throws', () => {
    const onTrack = jest.fn();
    const runtime = makeRuntime({
      effects: {
        onNavigate: () => {
          throw new Error('boom');
        },
        onTrack,
      },
    });
    runAction(
      {
        type: 'sequence',
        payload: {
          actions: [
            { type: 'navigate', payload: { route: 'pdp' } },
            { type: 'track', payload: { event: 'still_ran' } },
          ],
        },
      },
      undefined,
      runtime
    );
    expect(onTrack).toHaveBeenCalledWith('still_ran', undefined);
  });

  test('unknown action type no-ops and warns, never throws', () => {
    const runtime = makeRuntime();
    const bogus = { type: 'nonsense', payload: {} } as unknown as Action;
    expect(() => runAction(bogus, undefined, runtime)).not.toThrow();
    expect(getDevLog().some((e) => e.message.includes('nonsense'))).toBe(true);
  });
});
