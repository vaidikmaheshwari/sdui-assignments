import type { ComponentType, ReactNode } from 'react';
import type { z } from 'zod';
import type { ResolvedStyle } from './theme';

// ---- Theme (SCHEMA.md §5) ----

export interface ThemeTokens {
  color: Record<string, string>;
  space: Record<string, number>;
  radius: Record<string, number>;
  type: Record<string, { size: number; weight: string }>;
}

// ---- Node (SCHEMA.md §3) ----

export interface NodeStyle {
  padding?: string;
  paddingX?: string;
  paddingY?: string;
  margin?: string;
  marginX?: string;
  marginY?: string;
  background?: string;
  borderColor?: string;
  radius?: string;
  borderWidth?: number;
  opacity?: number;
  flex?: number;
  width?: number | string;
  height?: number | string;
}

// SCHEMA.md §7 — closed operator set. No evaluator, ever.
export type Predicate =
  | { eq: [unknown, unknown] }
  | { neq: [unknown, unknown] }
  | { gt: [unknown, unknown] }
  | { lt: [unknown, unknown] }
  | { gte: [unknown, unknown] }
  | { lte: [unknown, unknown] }
  | { in: [unknown, unknown[]] }
  | { exists: [unknown] }
  | { and: Predicate[] }
  | { or: Predicate[] }
  | { not: Predicate };

export interface SDUINode {
  id: string;
  type: string;
  typeVersion?: number;
  props?: Record<string, unknown>;
  style?: NodeStyle;
  visibleIf?: Predicate;
  actions?: Record<string, Action>;
  children?: SDUINode[];
  fallback?: SDUINode;
}

// ---- Actions (SCHEMA.md §8) ----

export type Action =
  | { type: 'set_state'; payload: { key: string; value: unknown } }
  | { type: 'navigate'; payload: { route: string; params?: Record<string, unknown> } }
  | { type: 'open_sheet'; payload: { title?: string; node: SDUINode } }
  | { type: 'open_url'; payload: { url: string } }
  | { type: 'sequence'; payload: { actions: Action[] } }
  | { type: 'track'; payload: { event: string; props?: Record<string, unknown> } }
  | { type: 'refresh'; payload: { endpoint: string; targetId: string } };

// ---- Payload / envelope (SCHEMA.md §2) ----

export interface Payload {
  schemaVersion: string;
  screenId: string;
  minClientSchemaVersion?: string;
  theme: { tokens: ThemeTokens };
  data?: Record<string, unknown>;
  state?: Record<string, unknown>;
  analytics?: { screenName: string; context?: Record<string, unknown> };
  header?: SDUINode;
  sections: SDUINode[];
}

// ---- Component registry contract (CLAUDE.md registry rule) ----

export interface SDUIComponentProps<P> {
  id: string;
  props: P;
  style?: ResolvedStyle;
  children?: ReactNode;
  actions?: Record<string, Action>;
  dispatch: (action: Action, event?: unknown) => void;
}

export interface ComponentDefinition<P = Record<string, unknown>> {
  type: string;
  typeVersion: number;
  propsSchema: z.ZodType<P>;
  defaults: Partial<P>;
  Component: ComponentType<SDUIComponentProps<P>>;
}
