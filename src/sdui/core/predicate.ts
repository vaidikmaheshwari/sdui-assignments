import { resolveBinding, type BindingContext } from './bindings';
import { warn } from '../utils/devLog';

function resolve(value: unknown, ctx: BindingContext): unknown {
  return resolveBinding(value, ctx);
}

// Accepts `unknown`, not the `Predicate` type: visibleIf is server-controlled and only
// structurally checked by schema.ts (SCHEMA.md §7). This function is the actual
// enforcement point for the closed operator set, so it must not trust its input's shape.
export function evaluatePredicate(predicate: unknown, ctx: BindingContext): boolean {
  if (predicate === undefined) return true;

  if (predicate === null || typeof predicate !== 'object') {
    warn('predicate', `visibleIf must be an object, got ${JSON.stringify(predicate)}`);
    return false;
  }

  const p = predicate as Record<string, unknown>;

  if ('eq' in p) {
    const [a, b] = p.eq as [unknown, unknown];
    return resolve(a, ctx) === resolve(b, ctx);
  }
  if ('neq' in p) {
    const [a, b] = p.neq as [unknown, unknown];
    return resolve(a, ctx) !== resolve(b, ctx);
  }
  if ('gt' in p) {
    const [a, b] = p.gt as [unknown, unknown];
    return Number(resolve(a, ctx)) > Number(resolve(b, ctx));
  }
  if ('lt' in p) {
    const [a, b] = p.lt as [unknown, unknown];
    return Number(resolve(a, ctx)) < Number(resolve(b, ctx));
  }
  if ('gte' in p) {
    const [a, b] = p.gte as [unknown, unknown];
    return Number(resolve(a, ctx)) >= Number(resolve(b, ctx));
  }
  if ('lte' in p) {
    const [a, b] = p.lte as [unknown, unknown];
    return Number(resolve(a, ctx)) <= Number(resolve(b, ctx));
  }
  if ('in' in p) {
    const [needle, haystack] = p.in as [unknown, unknown[]];
    const resolvedHaystack = resolve(haystack, ctx);
    const list = Array.isArray(resolvedHaystack) ? resolvedHaystack : [];
    return list.includes(resolve(needle, ctx));
  }
  if ('exists' in p) {
    const [a] = p.exists as [unknown];
    return resolve(a, ctx) !== undefined;
  }
  if ('and' in p) {
    return (p.and as unknown[]).every((sub) => evaluatePredicate(sub, ctx));
  }
  if ('or' in p) {
    return (p.or as unknown[]).some((sub) => evaluatePredicate(sub, ctx));
  }
  if ('not' in p) {
    return !evaluatePredicate(p.not, ctx);
  }

  warn('predicate', `unknown visibleIf operator: ${Object.keys(p).join(', ')}`);
  return false;
}
