import React, { type ComponentType } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { $ZodIssue } from 'zod/v4/core';
import type {
  Action,
  ComponentDefinition,
  SDUIComponentProps,
  SDUINode as SDUINodeData,
  ThemeTokens,
} from './types';
import type { ComponentRegistry } from './registry';
import { resolveBinding } from './bindings';
import { evaluatePredicate } from './predicate';
import { resolveStyle } from './theme';
import { warn } from '../utils/devLog';

// Leaf nodes (no SDUI children) are cheap to memoize by id + resolved props/style hash: nothing
// underneath depends on a binding this node doesn't itself see. Container nodes always recompute —
// their own render is cheap composition, and each of *their* leaf descendants still bails on its own.
const leafMemoCache = new WeakMap<ComponentType<SDUIComponentProps<Record<string, unknown>>>, ComponentType<SDUIComponentProps<Record<string, unknown>>>>();

function leafPropsEqual(
  prev: SDUIComponentProps<unknown>,
  next: SDUIComponentProps<unknown>
): boolean {
  return (
    prev.id === next.id &&
    prev.actions === next.actions &&
    prev.theme === next.theme &&
    JSON.stringify(prev.props) === JSON.stringify(next.props) &&
    JSON.stringify(prev.style) === JSON.stringify(next.style)
  );
}

function getMemoizedLeaf(
  Component: ComponentType<SDUIComponentProps<Record<string, unknown>>>
): ComponentType<SDUIComponentProps<Record<string, unknown>>> {
  let memoized = leafMemoCache.get(Component);
  if (!memoized) {
    memoized = React.memo(Component, leafPropsEqual) as unknown as ComponentType<
      SDUIComponentProps<Record<string, unknown>>
    >;
    leafMemoCache.set(Component, memoized);
  }
  return memoized;
}

export interface RenderContext {
  state: Record<string, unknown>;
  data: Record<string, unknown>;
  theme: ThemeTokens;
  registry: ComponentRegistry;
  dispatch: (action: Action, event?: unknown) => void;
}

const placeholderStyles = StyleSheet.create({
  box: {
    padding: 8,
    borderWidth: 1,
    borderColor: '#E03131',
    borderStyle: 'dashed',
  },
});

function DevPlaceholder({ id, type, reason }: { id: string; type: string; reason: string }) {
  if (!__DEV__) return null;
  return (
    <View style={placeholderStyles.box}>
      <Text>{`⚠ ${type} (${id}): ${reason}`}</Text>
    </View>
  );
}

function renderDegraded(
  node: SDUINodeData,
  ctx: RenderContext,
  reason: string
): React.ReactElement | null {
  warn('SDUINode', `"${node.id}" (${node.type}) degraded: ${reason}`);
  if (node.fallback) {
    return <SDUINode node={node.fallback} ctx={ctx} />;
  }
  return <DevPlaceholder id={node.id} type={node.type} reason={reason} />;
}

class NodeErrorBoundary extends React.Component<
  { node: SDUINodeData; ctx: RenderContext; children: React.ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: unknown) {
    warn(
      'SDUINode',
      `"${this.props.node.id}" (${this.props.node.type}) threw at render: ${String(error)}`
    );
  }

  render() {
    if (this.state.hasError) {
      return renderDegraded(this.props.node, this.props.ctx, 'threw at render');
    }
    return this.props.children;
  }
}

function applyDefaultsForFailures(
  props: Record<string, unknown>,
  defaults: Record<string, unknown>,
  issues: $ZodIssue[]
): { patched: Record<string, unknown>; unrecoverable: boolean } {
  const patched = { ...props };
  let unrecoverable = false;
  for (const issue of issues) {
    const key = issue.path[0];
    if (typeof key === 'string' && key in defaults) {
      patched[key] = defaults[key];
    } else {
      unrecoverable = true;
    }
  }
  return { patched, unrecoverable };
}

export function SDUINode({
  node,
  ctx,
}: {
  node: SDUINodeData;
  ctx: RenderContext;
}): React.ReactElement | null {
  const bindingCtx = { state: ctx.state, data: ctx.data };

  if (!evaluatePredicate(node.visibleIf, bindingCtx)) {
    return null;
  }

  const resolvedProps = resolveBinding(node.props ?? {}, bindingCtx) as Record<string, unknown>;
  const resolvedStyle = resolveBinding(node.style ?? {}, bindingCtx) as SDUINodeData['style'];

  const definition = ctx.registry.resolve(node.type, node.typeVersion) as
    | ComponentDefinition
    | undefined;
  if (!definition) {
    return renderDegraded(node, ctx, `unknown component type "${node.type}"`);
  }

  let finalProps: Record<string, unknown>;
  const firstAttempt = definition.propsSchema.safeParse(resolvedProps);
  if (firstAttempt.success) {
    finalProps = firstAttempt.data as Record<string, unknown>;
  } else {
    const { patched, unrecoverable } = applyDefaultsForFailures(
      resolvedProps,
      definition.defaults as Record<string, unknown>,
      firstAttempt.error.issues
    );
    if (unrecoverable) {
      return renderDegraded(node, ctx, 'required prop failed validation');
    }
    const secondAttempt = definition.propsSchema.safeParse(patched);
    if (!secondAttempt.success) {
      return renderDegraded(node, ctx, 'props failed validation after applying defaults');
    }
    finalProps = secondAttempt.data as Record<string, unknown>;
  }

  const style = resolveStyle(resolvedStyle, ctx.theme);
  const isLeaf = !node.children || node.children.length === 0;
  const Component = isLeaf
    ? getMemoizedLeaf(definition.Component as ComponentType<SDUIComponentProps<Record<string, unknown>>>)
    : definition.Component;
  const children = node.children?.map((child) => (
    <SDUINode key={child.id} node={child} ctx={ctx} />
  ));

  return (
    <NodeErrorBoundary node={node} ctx={ctx}>
      <Component
        id={node.id}
        props={finalProps}
        style={style}
        theme={ctx.theme}
        actions={node.actions}
        childNodes={node.children}
        renderNode={(child) => <SDUINode key={child.id} node={child} ctx={ctx} />}
        dispatch={ctx.dispatch}
      >
        {children}
      </Component>
    </NodeErrorBoundary>
  );
}
