import { resolveBinding } from '../../core/bindings';
import { clearDevLog, getDevLog } from '../../utils/devLog';

beforeEach(() => {
  clearDevLog();
});

describe('resolveBinding', () => {
  test('resolves a whole-value state binding, keeping its type', () => {
    const result = resolveBinding('{{state.carListTab}}', {
      state: { carListTab: 'wishlisted' },
      data: {},
    });
    expect(result).toBe('wishlisted');
  });

  test('resolves a whole-value data binding and preserves array type', () => {
    const cars = [{ id: 'c_1' }, { id: 'c_2' }];
    const result = resolveBinding('{{data.carLists.wishlisted}}', {
      data: { carLists: { wishlisted: cars } },
      state: {},
    });
    expect(result).toBe(cars);
  });

  test('interpolates a binding embedded in a larger string', () => {
    const result = resolveBinding('EMI ₹{{data.cars.c_889.emi}}/m*', {
      data: { cars: { c_889: { emi: 12345 } } },
      state: {},
    });
    expect(result).toBe('EMI ₹12345/m*');
  });

  test('resolves a state read nested inside a data path', () => {
    const result = resolveBinding('{{data.carLists[state.carListTab]}}', {
      data: { carLists: { wishlisted: ['c_1'], hot: ['c_2'] } },
      state: { carListTab: 'hot' },
    });
    expect(result).toEqual(['c_2']);
  });

  test('resolves a bare $event binding', () => {
    const result = resolveBinding('$event.value', {
      state: {},
      data: {},
      event: { value: 'delhi' },
    });
    expect(result).toBe('delhi');
  });

  test('returns undefined and warns to the dev log when the path is missing', () => {
    const result = resolveBinding('{{data.missing.path}}', { data: {}, state: {} });

    expect(result).toBeUndefined();
    expect(getDevLog()).toHaveLength(1);
    expect(getDevLog()[0].source).toBe('bindings');
  });

  test('never throws on a missing path, only warns', () => {
    expect(() => resolveBinding('{{data.a.b.c}}', {})).not.toThrow();
    expect(getDevLog()).toHaveLength(1);
  });

  test('leaves a plain, non-binding string untouched', () => {
    expect(resolveBinding('Buy car', { state: {}, data: {} })).toBe('Buy car');
  });

  test('passes non-string values through unchanged', () => {
    expect(resolveBinding(42, { state: {}, data: {} })).toBe(42);
    expect(resolveBinding(null, { state: {}, data: {} })).toBeNull();
  });

  test('deep-resolves bindings inside nested objects and arrays', () => {
    const result = resolveBinding(
      { title: '{{data.title}}', tags: ['{{data.tag}}', 'static'] },
      { data: { title: 'Used cars', tag: 'hot' }, state: {} }
    );
    expect(result).toEqual({ title: 'Used cars', tags: ['hot', 'static'] });
  });
});
