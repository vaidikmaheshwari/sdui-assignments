import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { registry } from '../src/sdui/components';
import { parsePayload } from '../src/sdui/core/schema';
import type { SDUINode, ThemeTokens } from '../src/sdui/core/types';

/**
 * `npm run validate` — every `payloads/*.json` against the live registry.
 *
 * Runs under Jest for the same reason the manifest generator does: importing the registry
 * pulls in react-native, whose source is Flow. Jest also gives the nonzero exit and the
 * readable diff for free.
 *
 * The split between error and warning is the same split the runtime makes (SCHEMA.md §9):
 * **error** = something the renderer cannot recover from without losing content the payload
 * intended to show. **warning** = something the renderer degrades gracefully, which is a
 * designed behaviour and must not fail CI — otherwise `home-unknown.json`, a fixture whose
 * entire purpose is to contain unknown types, could not exist.
 */

const PAYLOAD_DIR = join(__dirname, '..', 'payloads');

/**
 * Fixtures that are *supposed* to be broken, with the exact number of errors they are supposed
 * to have. Written as an assertion rather than an exclusion: `home-unknown.json` exists to prove
 * the renderer survives an unknown type with no fallback, so if that error ever stops appearing,
 * the fixture has silently stopped testing anything and this run fails for the opposite reason.
 */
const EXPECTED_ERRORS: Record<string, number> = {
  // sections[10] `ar_showroom_banner`, deliberately with no fallback.
  'home-unknown.json': 1,
};

// The registry warns on every unknown type it is asked about. That is correct at runtime and
// pure noise here, where finding unknown types is the job — they are reported below instead.
jest.spyOn(console, 'warn').mockImplementation(() => undefined);

// SCHEMA.md §7. Duplicated here deliberately: predicate.ts enforces this at runtime with a
// chain of `in` checks that cannot be enumerated from outside. If the two ever disagree,
// `predicate.test.ts` catches it — this list only has to stay honest about what it claims.
const PREDICATE_OPERATORS = new Set([
  'eq', 'neq', 'gt', 'lt', 'gte', 'lte', 'in', 'exists', 'and', 'or', 'not',
]);

// SCHEMA.md §8, mirroring the Action union in core/types.ts.
const ACTION_TYPES = new Set([
  'set_state', 'navigate', 'open_sheet', 'open_url', 'sequence', 'track', 'refresh',
]);

const STYLE_TOKEN_CATEGORY: Record<string, keyof ThemeTokens> = {
  padding: 'space', paddingX: 'space', paddingY: 'space',
  margin: 'space', marginX: 'space', marginY: 'space',
  background: 'color', borderColor: 'color',
  radius: 'radius',
};

interface Problem {
  path: string;
  message: string;
}

interface FileReport {
  file: string;
  nodes: number;
  errors: Problem[];
  warnings: Problem[];
}

const isBinding = (value: unknown): value is string =>
  typeof value === 'string' && value.includes('{{');

function validateNode(
  node: SDUINode,
  path: string,
  tokens: ThemeTokens | undefined,
  seenIds: Map<string, string>,
  report: FileReport
): void {
  report.nodes += 1;

  const previous = seenIds.get(node.id);
  if (previous) {
    // CLAUDE.md rule 6: ids are what memoisation, analytics and action targeting address.
    // A duplicate silently makes one of the two unaddressable.
    report.errors.push({ path, message: `duplicate node id "${node.id}" (also at ${previous})` });
  } else {
    seenIds.set(node.id, path);
  }

  const definition = registry.resolve(node.type, node.typeVersion);

  if (!definition) {
    const problem = { path, message: `unknown component type "${node.type}"` };
    if (node.fallback) {
      report.warnings.push({ ...problem, message: `${problem.message} — renders its fallback` });
    } else {
      report.errors.push({
        ...problem,
        message: `${problem.message} and no fallback — renders a dev placeholder, content is lost`,
      });
    }
  } else {
    if (definition.typeVersion !== (node.typeVersion ?? 1)) {
      report.warnings.push({
        path,
        message: `typeVersion ${node.typeVersion} not registered for "${node.type}" — falls back to @${definition.typeVersion}`,
      });
    }

    // Bindings are unresolved in a static payload, so a prop whose value is "{{data.x}}"
    // cannot be type-checked here. It is dropped before parsing rather than reported as a
    // type error, and its absence is not reported as a missing required prop either.
    const rawProps = (node.props ?? {}) as Record<string, unknown>;
    const boundKeys = Object.keys(rawProps).filter((key) => isBinding(rawProps[key]));
    const checkable = Object.fromEntries(
      Object.entries(rawProps).filter(([key]) => !boundKeys.includes(key))
    );

    const parsed = definition.propsSchema.safeParse({ ...definition.defaults, ...checkable });
    if (!parsed.success) {
      parsed.error.issues
        .filter((issue) => !boundKeys.includes(String(issue.path[0])))
        .forEach((issue) => {
          report.errors.push({
            path: `${path}.props.${issue.path.join('.')}`,
            message: issue.message,
          });
        });
    }

    // Zod strips unknown keys, so a typo'd prop name is silently ignored at runtime — the
    // single most confusing failure mode for whoever is hand-writing a payload.
    const known = new Set(Object.keys((definition.defaults as object) ?? {}));
    const schemaShape = (definition.propsSchema as unknown as { shape?: Record<string, unknown> }).shape;
    if (schemaShape) Object.keys(schemaShape).forEach((key) => known.add(key));
    Object.keys(rawProps).forEach((key) => {
      if (!known.has(key)) {
        report.warnings.push({ path, message: `prop "${key}" is not in the schema — ignored at render` });
      }
    });
  }

  if (node.visibleIf !== undefined) {
    validatePredicate(node.visibleIf, `${path}.visibleIf`, report);
  }

  if (node.style && tokens) {
    Object.entries(node.style).forEach(([key, value]) => {
      const category = STYLE_TOKEN_CATEGORY[key];
      if (!category) return;
      if (typeof value !== 'string' || /^#|^rgb|^\d+$/.test(value)) {
        report.errors.push({
          path: `${path}.style.${key}`,
          message: `must reference a design token, got ${JSON.stringify(value)} (CLAUDE.md rule 7)`,
        });
        return;
      }
      const [refCategory, refKey] = value.split('.');
      if (refCategory !== category || !refKey) {
        report.errors.push({
          path: `${path}.style.${key}`,
          message: `expected a "${category}.*" token, got "${value}"`,
        });
        return;
      }
      if ((tokens[category] as Record<string, unknown>)[refKey] === undefined) {
        report.warnings.push({
          path: `${path}.style.${key}`,
          message: `unknown token "${value}" — dropped, style falls back`,
        });
      }
    });
  }

  Object.entries(node.actions ?? {}).forEach(([event, action]) => {
    validateAction(action, `${path}.actions.${event}`, tokens, seenIds, report);
  });

  node.children?.forEach((child, index) => {
    validateNode(child, `${path}.children[${index}]`, tokens, seenIds, report);
  });
  if (node.fallback) {
    // A fallback is a real subtree that can really render, so it gets the same scrutiny.
    validateNode(node.fallback, `${path}.fallback`, tokens, seenIds, report);
  }
}

/**
 * Text has to be legible against whatever is actually behind it.
 *
 * Two different failures, and they are not the same severity:
 *
 * - **error — text layered directly over an image.** The payload cannot know what the photo
 *   looks like, so the contrast is not a choice anyone made. This is exactly how the five home
 *   banners shipped: `zstack{ image, stack{ white text } }`, white copy straight onto
 *   `picsum.photos`, invisible on any pale image, while the purple outline CTA beside it stayed
 *   readable. Nothing in the renderer was wrong, so no component test could have caught it. The
 *   fix is a scrim layer between the two.
 * - **warning — poor contrast against a known colour.** Here the author *did* choose both
 *   colours, and some choices are deliberate (`type.ghost` numerals are meant to be faint). The
 *   validator reports the ratio and lets a human decide.
 */
const MIN_CONTRAST = 3; // WCAG AA for large text; these are headings and numerals.

function luminance(hex: unknown): number | undefined {
  if (typeof hex !== 'string' || !/^#[0-9a-f]{6}$/i.test(hex)) return undefined;
  const channel = (i: number): number => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(1) + 0.7152 * channel(3) + 0.0722 * channel(5);
}

function contrastRatio(a: string, b: string): number | undefined {
  const [la, lb] = [luminance(a), luminance(b)];
  if (la === undefined || lb === undefined) return undefined;
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

/** `opacity` on a text node composites it against whatever is behind it, so it changes the ratio. */
function composite(fg: string, bg: string, opacity: number): string | undefined {
  if (opacity >= 1) return fg;
  if (!/^#[0-9a-f]{6}$/i.test(fg) || !/^#[0-9a-f]{6}$/i.test(bg)) return undefined;
  const mix = (i: number): string =>
    Math.round(parseInt(fg.slice(i, i + 2), 16) * opacity + parseInt(bg.slice(i, i + 2), 16) * (1 - opacity))
      .toString(16)
      .padStart(2, '0');
  return `#${mix(1)}${mix(3)}${mix(5)}`;
}

/** Resolves a `color.*` reference to its hex, or undefined if it is not one. */
function colourValue(ref: unknown, tokens: ThemeTokens | undefined): string | undefined {
  if (typeof ref !== 'string' || !tokens) return undefined;
  const [category, key] = ref.split('.');
  if (category !== 'color') return undefined;
  const value = (tokens.color as Record<string, unknown>)[key];
  return typeof value === 'string' ? value : undefined;
}

interface Backdrop {
  /** Hex of the nearest painted background, if it is a flat colour we can reason about. */
  colour?: string;
  /** True when the nearest thing behind this node is an image, whose contrast is unknowable. */
  photo: boolean;
}

function validateLegibility(
  node: SDUINode,
  path: string,
  tokens: ThemeTokens | undefined,
  report: FileReport,
  behind: Backdrop
): void {
  const painted = colourValue(node.style?.background, tokens);
  const here: Backdrop = painted ? { colour: painted, photo: false } : behind;

  if (node.type === 'text') {
    const ref = (node.props as Record<string, unknown> | undefined)?.color ?? 'color.textPrimary';
    const colour = colourValue(ref, tokens);
    if (here.photo) {
      report.errors.push({
        path,
        message:
          `text is layered directly over an image — contrast is whatever the photo happens to ` +
          `be. Add a layer with style.background (a scrim) between them`,
      });
    } else if (colour && here.colour) {
      const opacity = (node.props as Record<string, unknown> | undefined)?.opacity;
      const effective = composite(colour, here.colour, typeof opacity === 'number' ? opacity : 1);
      const ratio = effective ? contrastRatio(effective, here.colour) : undefined;
      if (ratio !== undefined && ratio < MIN_CONTRAST) {
        report.warnings.push({
          path,
          message: `"${String(ref)}" on "${here.colour}" is ${ratio.toFixed(1)}:1 — below ${MIN_CONTRAST}:1`,
        });
      }
    }
  }

  // In a zstack an *earlier sibling* is literally behind you. Nowhere else does a sibling paint
  // behind a sibling — everywhere else only an ancestor can.
  let layer = here;
  node.children?.forEach((child, index) => {
    validateLegibility(child, `${path}.children[${index}]`, tokens, report, layer);
    if (node.type !== 'zstack') return;
    const childPaint = colourValue(child.style?.background, tokens);
    if (childPaint) layer = { colour: childPaint, photo: false };
    else if (child.type === 'image') layer = { photo: true };
  });
  if (node.fallback) {
    validateLegibility(node.fallback, `${path}.fallback`, tokens, report, here);
  }
}

function validatePredicate(predicate: unknown, path: string, report: FileReport): void {
  if (predicate === null || typeof predicate !== 'object') {
    report.errors.push({ path, message: `must be an object, got ${JSON.stringify(predicate)}` });
    return;
  }
  const operators = Object.keys(predicate as object);
  operators.forEach((operator) => {
    if (!PREDICATE_OPERATORS.has(operator)) {
      report.errors.push({
        path,
        message: `unknown operator "${operator}" — node is hidden at runtime (SCHEMA.md §7 closed set)`,
      });
      return;
    }
    const value = (predicate as Record<string, unknown>)[operator];
    if (operator === 'not') validatePredicate(value, `${path}.not`, report);
    if (operator === 'and' || operator === 'or') {
      (value as unknown[]).forEach((sub, i) => validatePredicate(sub, `${path}.${operator}[${i}]`, report));
    }
  });
}

function validateAction(
  action: unknown,
  path: string,
  tokens: ThemeTokens | undefined,
  seenIds: Map<string, string>,
  report: FileReport
): void {
  const { type, payload } = (action ?? {}) as { type?: string; payload?: Record<string, unknown> };

  if (!type || !ACTION_TYPES.has(type)) {
    report.warnings.push({ path, message: `unknown action type "${type}" — no-ops at dispatch` });
    return;
  }

  // A sheet's contents are an SDUI subtree rendered by the same renderer, so an invalid node
  // inside open_sheet is exactly as broken as one in the page — and invisible until tapped.
  if (type === 'open_sheet' && payload?.node) {
    validateNode(payload.node as SDUINode, `${path}.payload.node`, tokens, seenIds, report);
  }
  if (type === 'sequence' && Array.isArray(payload?.actions)) {
    (payload.actions as unknown[]).forEach((sub, i) =>
      validateAction(sub, `${path}.payload.actions[${i}]`, tokens, seenIds, report)
    );
  }
  if (type === 'refresh' && typeof payload?.targetId !== 'string') {
    report.errors.push({ path, message: 'refresh requires a string payload.targetId' });
  }
  if (type === 'set_state' && typeof payload?.key !== 'string') {
    report.errors.push({ path, message: 'set_state requires a string payload.key' });
  }
}

function validateFile(file: string): FileReport {
  const report: FileReport = { file, nodes: 0, errors: [], warnings: [] };
  const raw: unknown = JSON.parse(readFileSync(join(PAYLOAD_DIR, file), 'utf8'));

  const parsed = parsePayload(raw);
  if (!parsed.success) {
    parsed.error.issues.forEach((issue) => {
      report.errors.push({ path: issue.path.join('.') || '<root>', message: issue.message });
    });
    return report;
  }

  const payload = parsed.data;
  const tokens = payload.theme?.tokens;
  const seenIds = new Map<string, string>();

  if (payload.header) validateNode(payload.header, 'header', tokens, seenIds, report);
  payload.sections.forEach((section, index) => {
    validateNode(section, `sections[${index}]`, tokens, seenIds, report);
  });

  // Separate pass: the walk has to start from the page background, which is what an unstyled
  // section is sitting on.
  const page: Backdrop = { colour: colourValue('color.bg', tokens), photo: false };
  if (payload.header) validateLegibility(payload.header, 'header', tokens, report, page);
  payload.sections.forEach((section, index) => {
    validateLegibility(section, `sections[${index}]`, tokens, report, page);
  });

  return report;
}

function format(report: FileReport): string {
  const lines = [
    `${report.errors.length ? '✗' : '✓'} ${report.file} — ${report.nodes} nodes, ` +
      `${report.errors.length} error(s), ${report.warnings.length} warning(s)`,
  ];
  report.errors.forEach((p) => lines.push(`    ERROR  ${p.path}: ${p.message}`));
  report.warnings.forEach((p) => lines.push(`    warn   ${p.path}: ${p.message}`));
  return lines.join('\n');
}

describe('npm run validate — every payload against the live registry', () => {
  const files = readdirSync(PAYLOAD_DIR).filter((f) => f.endsWith('.json')).sort();

  it('finds payloads to validate', () => {
    expect(files.length).toBeGreaterThan(0);
  });

  const reports = files.map(validateFile);

  it.each(reports.map((r) => [r.file, r] as const))('%s', (file, report) => {
    const expected = EXPECTED_ERRORS[file] ?? 0;
    if (report.errors.length !== expected) {
      throw new Error(
        `\n${format(report)}\n    (expected ${expected} error(s) in this fixture)\n`
      );
    }
    // eslint-disable-next-line no-console
    console.info(format(report));
  });
});

/**
 * The legibility rule has to be tested against a payload that breaks it, because every payload
 * in `payloads/` now satisfies it — a rule that silently stopped firing would look identical to
 * a rule that passes.
 */
describe('legibility — text over an image', () => {
  const tokens = {
    color: { bg: '#FFFFFF', textOnBrand: '#FFFFFF', textPrimary: '#101828', scrim: 'rgba(16,24,40,0.55)' },
    space: {}, radius: {}, type: {},
  } as unknown as ThemeTokens;

  const banner = (layers: SDUINode[]): SDUINode => ({
    id: 'banner', type: 'zstack', children: layers,
  } as SDUINode);
  const bg = { id: 'banner.bg', type: 'image', props: { url: 'https://example.test/p.jpg' } } as SDUINode;
  const scrim = { id: 'banner.scrim', type: 'stack', style: { background: 'color.scrim' } } as SDUINode;
  const copy = { id: 'banner.title', type: 'text', props: { value: 'Hi', color: 'color.textOnBrand' } } as SDUINode;

  const run = (node: SDUINode): FileReport => {
    const report: FileReport = { file: 'synthetic', nodes: 0, errors: [], warnings: [] };
    validateLegibility(node, 'root', tokens, report, { colour: '#FFFFFF', photo: false });
    return report;
  };

  it('rejects text layered straight onto an image', () => {
    expect(run(banner([bg, copy])).errors).toHaveLength(1);
  });

  it('accepts the same banner once a scrim is between them', () => {
    expect(run(banner([bg, scrim, copy])).errors).toHaveLength(0);
  });

  it('still rejects when the scrim is layered above the text rather than below it', () => {
    // Source order is z-order (SCHEMA.md §4.1), so a scrim after the copy covers it instead of
    // backing it. Getting this wrong is the easiest way to "fix" the bug without fixing it.
    expect(run(banner([bg, copy, scrim])).errors).toHaveLength(1);
  });

  it('warns rather than errors when both colours are known and the contrast is poor', () => {
    const faint = {
      id: 'ghost', type: 'text', props: { value: '01', color: 'color.bg' },
    } as SDUINode;
    const report = run({ id: 'card', type: 'stack', children: [faint] } as SDUINode);
    expect(report.errors).toHaveLength(0);
    expect(report.warnings).toHaveLength(1);
  });

  it('accounts for opacity — a legible colour at 10% is not legible', () => {
    const faded = {
      id: 'faded', type: 'text', props: { value: 'x', color: 'color.textPrimary', opacity: 0.1 },
    } as SDUINode;
    const solid = {
      id: 'solid', type: 'text', props: { value: 'x', color: 'color.textPrimary' },
    } as SDUINode;
    expect(run({ id: 'c', type: 'stack', children: [faded] } as SDUINode).warnings).toHaveLength(1);
    expect(run({ id: 'c', type: 'stack', children: [solid] } as SDUINode).warnings).toHaveLength(0);
  });
});
