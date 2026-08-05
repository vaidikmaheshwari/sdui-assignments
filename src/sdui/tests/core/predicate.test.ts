import { evaluatePredicate } from '../../core/predicate';
import { clearDevLog, getDevLog } from '../../utils/devLog';
import type { BindingContext } from '../../core/bindings';

beforeEach(() => {
  clearDevLog();
});

const ctx: BindingContext = {
  state: { carListTab: 'wishlisted', city: 'Bhilwara' },
  data: { dealCount: 3, priceNegotiable: false },
};

describe('evaluatePredicate', () => {
  test('no predicate means the node is visible', () => {
    expect(evaluatePredicate(undefined, ctx)).toBe(true);
  });

  test('eq compares a resolved binding against a literal', () => {
    expect(evaluatePredicate({ eq: ['{{state.carListTab}}', 'wishlisted'] }, ctx)).toBe(true);
    expect(evaluatePredicate({ eq: ['{{state.carListTab}}', 'hot'] }, ctx)).toBe(false);
  });

  test('neq negates eq', () => {
    expect(evaluatePredicate({ neq: ['{{data.priceNegotiable}}', true] }, ctx)).toBe(true);
  });

  test('gt, lt, gte, lte compare numerically', () => {
    expect(evaluatePredicate({ gt: ['{{data.dealCount}}', 0] }, ctx)).toBe(true);
    expect(evaluatePredicate({ lt: ['{{data.dealCount}}', 0] }, ctx)).toBe(false);
    expect(evaluatePredicate({ gte: ['{{data.dealCount}}', 3] }, ctx)).toBe(true);
    expect(evaluatePredicate({ lte: ['{{data.dealCount}}', 2] }, ctx)).toBe(false);
  });

  test('in checks membership in a resolved list', () => {
    expect(
      evaluatePredicate(
        { in: ['{{state.city}}', ['Bhilwara', 'Delhi NCR', 'Mumbai']] },
        ctx
      )
    ).toBe(true);
    expect(
      evaluatePredicate({ in: ['{{state.city}}', ['Delhi NCR', 'Mumbai']] }, ctx)
    ).toBe(false);
  });

  test('exists is true for a present binding and false for a missing one', () => {
    expect(evaluatePredicate({ exists: ['{{data.dealCount}}'] }, ctx)).toBe(true);
    expect(evaluatePredicate({ exists: ['{{data.banner}}'] }, ctx)).toBe(false);
  });

  test('and requires every sub-predicate to be true', () => {
    expect(
      evaluatePredicate(
        { and: [{ gt: ['{{data.dealCount}}', 0] }, { eq: ['{{state.carListTab}}', 'wishlisted'] }] },
        ctx
      )
    ).toBe(true);
    expect(
      evaluatePredicate(
        { and: [{ gt: ['{{data.dealCount}}', 0] }, { eq: ['{{state.carListTab}}', 'hot'] }] },
        ctx
      )
    ).toBe(false);
  });

  test('or requires at least one sub-predicate to be true', () => {
    expect(
      evaluatePredicate(
        { or: [{ eq: ['{{state.carListTab}}', 'hot'] }, { gt: ['{{data.dealCount}}', 0] }] },
        ctx
      )
    ).toBe(true);
  });

  test('not inverts its sub-predicate', () => {
    expect(evaluatePredicate({ not: { eq: ['{{state.carListTab}}', 'hot'] } }, ctx)).toBe(true);
  });

  test('unknown operator hides the node and warns, never throws', () => {
    // Deliberately malformed predicate to prove the closed operator set rejects it.
    const malformed = { eval: 'process.exit()' };
    expect(() => evaluatePredicate(malformed, ctx)).not.toThrow();
    expect(evaluatePredicate(malformed, ctx)).toBe(false);
    expect(getDevLog().some((entry) => entry.source === 'predicate')).toBe(true);
  });
});
