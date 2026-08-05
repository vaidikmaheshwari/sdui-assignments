import { resolveStyle } from '../../core/theme';
import { clearDevLog, getDevLog } from '../../utils/devLog';
import type { ThemeTokens } from '../../core/types';

const tokens: ThemeTokens = {
  color: { brand: '#3B24C4', tileBlue: '#123FA8', textPrimary: '#101828' },
  space: { xs: 4, sm: 8, md: 12, lg: 16, xl: 24 },
  radius: { sm: 6, md: 12, lg: 16, pill: 999 },
  type: { body: { size: 14, weight: '400' } },
};

beforeEach(() => {
  clearDevLog();
});

describe('resolveStyle', () => {
  test('resolves padding shorthand from the space token set', () => {
    expect(resolveStyle({ padding: 'space.lg' }, tokens)).toEqual({ padding: 16 });
  });

  test('resolves paddingX/paddingY/marginX/marginY to RN axis props', () => {
    expect(
      resolveStyle({ paddingX: 'space.lg', paddingY: 'space.sm', marginX: 'space.xs', marginY: 'space.md' }, tokens)
    ).toEqual({ paddingHorizontal: 16, paddingVertical: 8, marginHorizontal: 4, marginVertical: 12 });
  });

  test('resolves background to backgroundColor from the color token set', () => {
    expect(resolveStyle({ background: 'color.tileBlue' }, tokens)).toEqual({
      backgroundColor: '#123FA8',
    });
  });

  test('resolves radius to borderRadius from the radius token set', () => {
    expect(resolveStyle({ radius: 'radius.md' }, tokens)).toEqual({ borderRadius: 12 });
  });

  test('passes raw numeric style props through untouched', () => {
    expect(resolveStyle({ borderWidth: 1, opacity: 0.5, flex: 1, width: 100, height: 200 }, tokens)).toEqual({
      borderWidth: 1,
      opacity: 0.5,
      flex: 1,
      width: 100,
      height: 200,
    });
  });

  test('rejects a raw hex value where a token was required, drops it, and warns', () => {
    const result = resolveStyle({ background: '#123FA8', radius: 'radius.md' }, tokens);
    expect(result).toEqual({ borderRadius: 12 });
    expect(getDevLog().some((e) => e.source === 'theme' && e.message.includes('background'))).toBe(true);
  });

  test('rejects a raw px number where a token was required, drops it, and warns', () => {
    // @ts-expect-error deliberately malformed payload value to prove enforcement
    const result = resolveStyle({ padding: 16, radius: 'radius.md' }, tokens);
    expect(result).toEqual({ borderRadius: 12 });
    expect(getDevLog().some((e) => e.source === 'theme' && e.message.includes('padding'))).toBe(true);
  });

  test('unknown token reference drops that prop, keeps the rest, and warns', () => {
    const result = resolveStyle({ padding: 'space.xxl', radius: 'radius.md' }, tokens);
    expect(result).toEqual({ borderRadius: 12 });
    expect(getDevLog().some((e) => e.source === 'theme' && e.message.includes('space.xxl'))).toBe(true);
  });

  test('no style returns an empty resolved style', () => {
    expect(resolveStyle(undefined, tokens)).toEqual({});
  });

  test('never throws on malformed style input', () => {
    // @ts-expect-error deliberately malformed payload value
    expect(() => resolveStyle({ background: 42 }, tokens)).not.toThrow();
  });
});
