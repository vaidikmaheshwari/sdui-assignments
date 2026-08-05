import type { NodeStyle, ThemeTokens } from './types';
import { warn } from '../utils/devLog';

export interface ResolvedStyle {
  padding?: number;
  paddingHorizontal?: number;
  paddingVertical?: number;
  margin?: number;
  marginHorizontal?: number;
  marginVertical?: number;
  backgroundColor?: string;
  borderColor?: string;
  borderRadius?: number;
  borderWidth?: number;
  opacity?: number;
  flex?: number;
  width?: number | string;
  height?: number | string;
}

type TokenCategory = 'space' | 'color' | 'radius' | 'type';

const TOKEN_MAPPED_KEYS: Record<
  'padding' | 'paddingX' | 'paddingY' | 'margin' | 'marginX' | 'marginY' | 'background' | 'borderColor' | 'radius',
  { category: TokenCategory; resolvedKey: keyof ResolvedStyle }
> = {
  padding: { category: 'space', resolvedKey: 'padding' },
  paddingX: { category: 'space', resolvedKey: 'paddingHorizontal' },
  paddingY: { category: 'space', resolvedKey: 'paddingVertical' },
  margin: { category: 'space', resolvedKey: 'margin' },
  marginX: { category: 'space', resolvedKey: 'marginHorizontal' },
  marginY: { category: 'space', resolvedKey: 'marginVertical' },
  background: { category: 'color', resolvedKey: 'backgroundColor' },
  borderColor: { category: 'color', resolvedKey: 'borderColor' },
  radius: { category: 'radius', resolvedKey: 'borderRadius' },
};

const RAW_PASSTHROUGH_KEYS = ['borderWidth', 'opacity', 'flex', 'width', 'height'] as const;

/** Shared token-lookup used by both `style` resolution and component-specific token props (e.g. text.variant/color). */
export function resolveToken(
  key: string,
  rawValue: unknown,
  category: TokenCategory,
  tokens: ThemeTokens
): number | string | { size: number; weight: string } | undefined {
  if (typeof rawValue !== 'string') {
    warn('theme', `style "${key}" must be a token reference string, got ${JSON.stringify(rawValue)} — dropped`);
    return undefined;
  }
  if (/^#|^rgb|^\d+$/.test(rawValue)) {
    warn('theme', `style "${key}" must reference a design token, not a raw value ("${rawValue}") — dropped`);
    return undefined;
  }

  const [refCategory, refKey] = rawValue.split('.');
  if (refCategory !== category || !refKey) {
    warn('theme', `style "${key}" expected a "${category}.*" token reference, got "${rawValue}" — dropped`);
    return undefined;
  }

  const resolved = tokens[category][refKey];
  if (resolved === undefined) {
    warn('theme', `unknown token "${rawValue}" for style "${key}" — dropped`);
    return undefined;
  }
  return resolved;
}

export function resolveStyle(style: NodeStyle | undefined, tokens: ThemeTokens): ResolvedStyle {
  const resolved: ResolvedStyle = {};
  if (!style) return resolved;

  for (const key of Object.keys(TOKEN_MAPPED_KEYS) as Array<keyof typeof TOKEN_MAPPED_KEYS>) {
    if (!(key in style)) continue;
    const { category, resolvedKey } = TOKEN_MAPPED_KEYS[key];
    const value = resolveToken(key, style[key], category, tokens);
    if (value !== undefined) {
      (resolved as Record<string, unknown>)[resolvedKey] = value;
    }
  }

  for (const key of RAW_PASSTHROUGH_KEYS) {
    if (style[key] !== undefined) {
      (resolved as Record<string, unknown>)[key] = style[key];
    }
  }

  return resolved;
}
