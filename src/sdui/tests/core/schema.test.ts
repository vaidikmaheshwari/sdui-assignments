import { parseNode, parsePayload } from '../../core/schema';

describe('parseNode', () => {
  test('accepts a minimal valid node', () => {
    const result = parseNode({ id: 'home.title', type: 'text' });
    expect(result.success).toBe(true);
  });

  test('accepts nested children recursively', () => {
    const result = parseNode({
      id: 'home.row',
      type: 'stack',
      children: [
        { id: 'home.row.a', type: 'text' },
        { id: 'home.row.b', type: 'text', fallback: { id: 'home.row.b.fallback', type: 'text' } },
      ],
    });
    expect(result.success).toBe(true);
  });

  test('rejects a node missing a required field, without throwing', () => {
    expect(() => parseNode({ type: 'text' })).not.toThrow();
    const result = parseNode({ type: 'text' });
    expect(result.success).toBe(false);
  });

  test('accepts an action whose type is not in the known set (forward compatibility)', () => {
    const result = parseNode({
      id: 'home.cta',
      type: 'button',
      actions: { onTap: { type: 'holographic_teleport', payload: {} } },
    });
    expect(result.success).toBe(true);
  });

  test('never throws on wildly malformed input', () => {
    expect(() => parseNode(null)).not.toThrow();
    expect(() => parseNode(42)).not.toThrow();
    expect(() => parseNode('not a node')).not.toThrow();
    expect(parseNode(null).success).toBe(false);
  });
});

describe('parsePayload', () => {
  const validTheme = {
    tokens: {
      color: { brand: '#3B24C4' },
      space: { lg: 16 },
      radius: { md: 12 },
      type: { body: { size: 14, weight: '400' } },
    },
  };

  test('accepts a minimal valid envelope', () => {
    const result = parsePayload({
      schemaVersion: '1.1.0',
      screenId: 'home',
      theme: validTheme,
      sections: [{ id: 'home.s1', type: 'stack' }],
    });
    expect(result.success).toBe(true);
  });

  test('rejects an envelope missing sections, without throwing', () => {
    expect(() =>
      parsePayload({ schemaVersion: '1.1.0', screenId: 'home', theme: validTheme })
    ).not.toThrow();
    const result = parsePayload({ schemaVersion: '1.1.0', screenId: 'home', theme: validTheme });
    expect(result.success).toBe(false);
  });

  test('never throws on wildly malformed input', () => {
    expect(() => parsePayload(undefined)).not.toThrow();
    expect(() => parsePayload([])).not.toThrow();
    expect(parsePayload(undefined).success).toBe(false);
  });
});
