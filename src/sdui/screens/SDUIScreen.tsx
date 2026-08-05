import React, { useReducer } from 'react';
import { ScrollView } from 'react-native';
import type { Action, Payload } from '../core/types';
import { ComponentRegistry, registry as defaultRegistry } from '../core/registry';
import { SDUINode, type RenderContext } from '../core/SDUINode';
import { resolveBinding } from '../core/bindings';
import { warn } from '../utils/devLog';

// navigate/open_sheet/open_url/track/refresh each need a piece this pass doesn't
// build yet (navigation stack, sheet renderer, analytics sink, network layer).
// They're deferred to core/actions.ts and no-op honestly here rather than
// pretending to work — matches SCHEMA.md §8's own unknown-action-type contract.
const DEFERRED_ACTION_TYPES = new Set(['navigate', 'open_sheet', 'open_url', 'track', 'refresh']);

function resolveActionPayload(action: Action, event: unknown): Action {
  return {
    ...action,
    payload: resolveBinding(action.payload, { event }),
  } as Action;
}

function reducer(state: Record<string, unknown>, action: Action): Record<string, unknown> {
  if (action.type === 'set_state') {
    return { ...state, [action.payload.key]: action.payload.value };
  }
  if (DEFERRED_ACTION_TYPES.has(action.type)) {
    warn('SDUIScreen', `action "${action.type}" has no handler yet — no-op`);
    return state;
  }
  warn('SDUIScreen', `unknown action type "${action.type}" — no-op`);
  return state;
}

export function SDUIScreen({
  payload,
  registry: registryOverride,
}: {
  payload: Payload;
  registry?: ComponentRegistry;
}): React.ReactElement {
  const [state, reactDispatch] = useReducer(reducer, payload.state ?? {});

  function dispatch(action: Action, event?: unknown) {
    if (action.type === 'sequence') {
      for (const sub of action.payload.actions) {
        dispatch(sub, event);
      }
      return;
    }
    reactDispatch(resolveActionPayload(action, event));
  }

  const ctx: RenderContext = {
    state,
    data: payload.data ?? {},
    theme: payload.theme.tokens,
    registry: registryOverride ?? defaultRegistry,
    dispatch,
  };

  return (
    <ScrollView>
      {payload.header && <SDUINode node={payload.header} ctx={ctx} />}
      {payload.sections.map((section) => (
        <SDUINode key={section.id} node={section} ctx={ctx} />
      ))}
    </ScrollView>
  );
}
