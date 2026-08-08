import { useCallback, useMemo, useRef, useState } from 'react';
import { Linking } from 'react-native';
import type { ActionEffects } from '../sdui/core/actions';

/**
 * The host's side of the action contract.
 *
 * `runAction` resolves an action and then hands the *intent* to whoever is hosting the screen —
 * it does not navigate, track or refresh on its own (docs/SCHEMA.md §6). Without a host supplying
 * these, `navigate`, `track` and `refresh` warn and no-op, which is correct but invisible: a
 * payload's 54 navigation intents look identical to a payload with none.
 *
 * A real app would route these into its navigator and analytics client. This host has neither, so
 * it surfaces the intent instead — the point being to show that the intent arrived, carrying the
 * route and params the JSON asked for.
 */
export interface EffectEvent {
  /** Monotonic, so two identical intents in a row still re-trigger the banner. */
  readonly seq: number;
  readonly kind: 'navigate' | 'track' | 'refresh' | 'open_url';
  readonly detail: string;
}

export interface ActionEffectsHost {
  readonly effects: ActionEffects;
  readonly lastEffect: EffectEvent | undefined;
  readonly dismiss: () => void;
}

function describeParams(params?: Record<string, unknown>): string {
  if (!params) return '';
  const entries = Object.entries(params);
  if (entries.length === 0) return '';
  return ` { ${entries.map(([key, value]) => `${key}: ${String(value)}`).join(', ')} }`;
}

export function useActionEffects(): ActionEffectsHost {
  const [lastEffect, setLastEffect] = useState<EffectEvent | undefined>();
  const seq = useRef(0);

  const effects = useMemo<ActionEffects>(() => {
    const emit = (kind: EffectEvent['kind'], detail: string): void => {
      seq.current += 1;
      // Logged as well as shown: logcat is the record when the banner has already faded.
      // eslint-disable-next-line no-console
      console.log(`SDUI_ACTION ${kind} ${detail}`);
      setLastEffect({ seq: seq.current, kind, detail });
    };

    return {
      onNavigate: (route, params) => emit('navigate', `${route}${describeParams(params)}`),
      onTrack: (event, props) => emit('track', `${event}${describeParams(props)}`),
      onRefresh: (endpoint, targetId) => emit('refresh', `${endpoint} → #${targetId}`),
      onOpenUrl: (url) => {
        emit('open_url', url);
        // Still hand it to the OS — this is the one effect a host can genuinely satisfy, and
        // suppressing it would make the demo weaker than the default runAction behaviour.
        void Linking.openURL(url).catch((error) => {
          // eslint-disable-next-line no-console
          console.log(`SDUI_ACTION open_url_failed ${String(error)}`);
        });
      },
    };
  }, []);

  // Stable identity: the banner's auto-dismiss timer keys on this, and a new function each
  // render would clear and restart the timeout forever — the banner would never dismiss.
  const dismiss = useCallback(() => setLastEffect(undefined), []);

  return { effects, lastEffect, dismiss };
}
