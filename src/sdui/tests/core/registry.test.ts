import { ComponentRegistry } from '../../core/registry';
import { clearDevLog, getDevLog } from '../../utils/devLog';
import { z } from 'zod';
import type { ComponentDefinition } from '../../core/types';

function stubDefinition(type: string, typeVersion: number): ComponentDefinition<{ label: string }> {
  return {
    type,
    typeVersion,
    propsSchema: z.object({ label: z.string().default('') }),
    defaults: { label: '' },
    Component: () => null,
  };
}

beforeEach(() => {
  clearDevLog();
});

describe('ComponentRegistry', () => {
  test('resolves a registered (type, typeVersion) pair', () => {
    const registry = new ComponentRegistry();
    const def = stubDefinition('text', 1);
    registry.register(def);

    expect(registry.resolve('text', 1)).toBe(def);
  });

  test('defaults to typeVersion 1 when none is requested', () => {
    const registry = new ComponentRegistry();
    const def = stubDefinition('text', 1);
    registry.register(def);

    expect(registry.resolve('text')).toBe(def);
  });

  test('two typeVersions of the same type coexist', () => {
    const registry = new ComponentRegistry();
    const v1 = stubDefinition('car_card', 1);
    const v2 = stubDefinition('car_card', 2);
    registry.register(v1);
    registry.register(v2);

    expect(registry.resolve('car_card', 1)).toBe(v1);
    expect(registry.resolve('car_card', 2)).toBe(v2);
  });

  test('unknown typeVersion falls back to the highest known version and warns', () => {
    const registry = new ComponentRegistry();
    const v1 = stubDefinition('car_card', 1);
    const v2 = stubDefinition('car_card', 2);
    registry.register(v1);
    registry.register(v2);

    expect(registry.resolve('car_card', 5)).toBe(v2);
    expect(getDevLog().some((e) => e.source === 'registry')).toBe(true);
  });

  test('unknown type returns undefined and warns, never throws', () => {
    const registry = new ComponentRegistry();

    expect(() => registry.resolve('holographic_banner', 1)).not.toThrow();
    expect(registry.resolve('holographic_banner', 1)).toBeUndefined();
    expect(getDevLog().some((e) => e.source === 'registry')).toBe(true);
  });

  test('list() enumerates every registered (type, typeVersion) pair, sorted for determinism', () => {
    const registry = new ComponentRegistry();
    registry.register(stubDefinition('text', 1));
    registry.register(stubDefinition('car_card', 2));
    registry.register(stubDefinition('car_card', 1));

    expect(registry.list()).toEqual([
      { type: 'car_card', typeVersion: 1 },
      { type: 'car_card', typeVersion: 2 },
      { type: 'text', typeVersion: 1 },
    ]);
  });

  test('list() on an empty registry returns an empty array', () => {
    expect(new ComponentRegistry().list()).toEqual([]);
  });
});
