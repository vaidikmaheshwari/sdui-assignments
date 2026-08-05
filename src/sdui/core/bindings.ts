import { warn } from '../utils/devLog';

export interface BindingContext {
  state?: Record<string, unknown>;
  data?: Record<string, unknown>;
  event?: unknown;
}

type PathToken = { kind: 'key'; value: string } | { kind: 'expr'; value: string };

const WHOLE_BRACE_BINDING = /^\{\{\s*([^}]+?)\s*\}\}$/;
const BRACE_BINDING = /\{\{\s*([^}]+?)\s*\}\}/g;
const EVENT_BINDING = /^\$event(?:\.(.+))?$/;

function tokenizePath(path: string): PathToken[] {
  const tokens: PathToken[] = [];
  let i = 0;
  while (i < path.length) {
    if (path[i] === '.') {
      i++;
      continue;
    }
    if (path[i] === '[') {
      let depth = 1;
      let j = i + 1;
      while (j < path.length && depth > 0) {
        if (path[j] === '[') depth++;
        else if (path[j] === ']') depth--;
        if (depth > 0) j++;
      }
      tokens.push({ kind: 'expr', value: path.slice(i + 1, j) });
      i = j + 1;
      continue;
    }
    let j = i;
    while (j < path.length && path[j] !== '.' && path[j] !== '[') j++;
    tokens.push({ kind: 'key', value: path.slice(i, j) });
    i = j;
  }
  return tokens;
}

function resolvePath(path: string, ctx: BindingContext): unknown {
  const [rootToken, ...rest] = tokenizePath(path);
  if (!rootToken) {
    warn('bindings', `empty binding path`);
    return undefined;
  }

  const root = rootToken.value;
  let cur: unknown;
  if (root === 'state') cur = ctx.state;
  else if (root === 'data') cur = ctx.data;
  else if (root === 'event') cur = ctx.event;
  else {
    warn('bindings', `unknown binding root "${root}" in "${path}"`);
    return undefined;
  }

  for (const token of rest) {
    if (cur === null || cur === undefined) {
      warn('bindings', `binding path missing: ${path}`);
      return undefined;
    }
    const key = token.kind === 'key' ? token.value : String(resolvePath(token.value, ctx));
    cur = (cur as Record<string, unknown>)[key];
  }

  if (cur === undefined) {
    warn('bindings', `binding path missing: ${path}`);
  }
  return cur;
}

function resolveString(value: string, ctx: BindingContext): unknown {
  const eventMatch = EVENT_BINDING.exec(value);
  if (eventMatch) {
    const path = eventMatch[1] ? `event.${eventMatch[1]}` : 'event';
    return resolvePath(path, ctx);
  }

  const wholeMatch = WHOLE_BRACE_BINDING.exec(value);
  if (wholeMatch) {
    return resolvePath(wholeMatch[1], ctx);
  }

  if (BRACE_BINDING.test(value)) {
    BRACE_BINDING.lastIndex = 0;
    return value.replace(BRACE_BINDING, (_match, path: string) => {
      const resolved = resolvePath(path, ctx);
      return resolved === undefined ? '' : String(resolved);
    });
  }

  return value;
}

export function resolveBinding(value: unknown, ctx: BindingContext): unknown {
  if (typeof value === 'string') {
    return resolveString(value, ctx);
  }
  if (Array.isArray(value)) {
    return value.map((item) => resolveBinding(item, ctx));
  }
  if (value !== null && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, v]) => [key, resolveBinding(v, ctx)])
    );
  }
  return value;
}
