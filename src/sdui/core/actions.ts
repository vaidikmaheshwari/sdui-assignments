import { Linking } from 'react-native';
import type { Action, SDUINode } from './types';
import { resolveBinding } from './bindings';
import { warn } from '../utils/devLog';

export interface ActionEffects {
  onNavigate?(route: string, params?: Record<string, unknown>): void;
  onTrack?(event: string, props?: Record<string, unknown>): void;
  onRefresh?(endpoint: string, targetId: string): void;
  onOpenUrl?(url: string): void;
}

export interface ActionRuntime {
  dispatchState: (action: Extract<Action, { type: 'set_state' }>) => void;
  openSheet: (node: SDUINode, title?: string) => void;
  effects?: ActionEffects;
}

/**
 * Resolve an action's payload against the dispatching event.
 *
 * The binding context is deliberately `{ event }` only — an action fires outside render and has
 * no live `state`/`data` of its own. That is correct for leaf values like `$event.value`, and
 * wrong for two payload keys that are not data at all:
 *
 * - `open_sheet.payload.node` is an **SDUI subtree**. Resolving it here would substitute every
 *   `{{state.*}}`/`{{data.*}}` inside it against an empty context and burn the bindings away
 *   before `SDUINode` ever sees them — a sheet could be interactive but never data-driven
 *   (found by `payloads/pdp.json`; see COVERAGE.md §5.2).
 * - `sequence.payload.actions` are **actions**, and `runAction` already resolves each one
 *   against the same event when it dispatches it. Resolving them here as well is both redundant
 *   and destructive, since a `sequence` containing an `open_sheet` would strip the subtree one
 *   level higher up.
 *
 * Both are passed through verbatim and resolved by whoever actually renders or dispatches them.
 */
export function resolveActionPayload(action: Action, event: unknown): Action {
  const resolveRest = (rest: Record<string, unknown>): Record<string, unknown> =>
    resolveBinding(rest, { event }) as Record<string, unknown>;

  if (action.type === 'open_sheet') {
    const { node, ...rest } = action.payload;
    return { ...action, payload: { ...resolveRest(rest), node } };
  }

  if (action.type === 'sequence') {
    const { actions, ...rest } = action.payload;
    return { ...action, payload: { ...resolveRest(rest), actions } };
  }

  return { ...action, payload: resolveBinding(action.payload, { event }) } as Action;
}

export function pageStateReducer(
  state: Record<string, unknown>,
  action: Action
): Record<string, unknown> {
  if (action.type === 'set_state') {
    return { ...state, [action.payload.key]: action.payload.value };
  }
  return state;
}

export function runAction(action: Action, event: unknown, runtime: ActionRuntime): void {
  const resolved = resolveActionPayload(action, event);

  switch (resolved.type) {
    case 'set_state':
      runtime.dispatchState(resolved);
      return;

    case 'sequence':
      for (const sub of resolved.payload.actions) {
        try {
          runAction(sub, event, runtime);
        } catch (error) {
          warn('actions', `sequence member "${sub.type}" threw: ${String(error)}`);
        }
      }
      return;

    case 'navigate':
      if (runtime.effects?.onNavigate) {
        runtime.effects.onNavigate(resolved.payload.route, resolved.payload.params);
      } else {
        warn('actions', 'action "navigate" has no handler — no-op');
      }
      return;

    case 'open_url':
      if (runtime.effects?.onOpenUrl) {
        runtime.effects.onOpenUrl(resolved.payload.url);
      } else {
        Linking.openURL(resolved.payload.url).catch((error) =>
          warn('actions', `action "open_url" failed: ${String(error)}`)
        );
      }
      return;

    case 'open_sheet':
      runtime.openSheet(resolved.payload.node, resolved.payload.title);
      return;

    case 'track':
      if (runtime.effects?.onTrack) {
        runtime.effects.onTrack(resolved.payload.event, resolved.payload.props);
      } else {
        warn('actions', 'action "track" has no handler — no-op');
      }
      return;

    case 'refresh':
      if (runtime.effects?.onRefresh) {
        runtime.effects.onRefresh(resolved.payload.endpoint, resolved.payload.targetId);
      } else {
        warn('actions', 'action "refresh" has no handler — no-op');
      }
      return;

    default:
      warn('actions', `unknown action type "${(resolved as Action).type}" — no-op`);
  }
}
