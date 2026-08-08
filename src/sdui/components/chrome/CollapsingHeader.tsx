import React, { useState } from 'react';
import { View, type LayoutChangeEvent, type ViewStyle } from 'react-native';
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedStyle,
  type SharedValue,
} from 'react-native-reanimated';
import type { SDUINode as SDUINodeData } from '../../core/types';
import { SDUINode, type RenderContext } from '../../core/SDUINode';
import { resolveBinding } from '../../core/bindings';
import { resolveStyle } from '../../core/theme';

/**
 * The declared client-owned boundary (SCHEMA.md §4.4): the header's *content* is an
 * ordinary SDUI node, but its scroll-linked collapse is native. Convention (generic,
 * not car-specific): the first child collapses away on scroll; every child after it
 * (search, nav, ...) is the pinned bar left behind. `SDUIScreen` pairs this with
 * `stickyHeaderIndices` so the pinned remainder sticks to the top once the collapsible
 * part has closed.
 */
export function CollapsingHeader({
  node,
  ctx,
  scrollY,
}: {
  node: SDUINodeData;
  ctx: RenderContext;
  scrollY: SharedValue<number>;
}): React.ReactElement {
  const children = node.children ?? [];
  const collapsibleChild = children[0];
  const pinnedChildren = children.slice(1);

  const bindingCtx = { state: ctx.state, data: ctx.data };
  const resolvedProps = resolveBinding(node.props ?? {}, bindingCtx) as {
    direction?: string;
    spacing?: number;
  };
  const resolvedStyle = resolveStyle(
    resolveBinding(node.style ?? {}, bindingCtx) as SDUINodeData['style'],
    ctx.theme
  );
  const direction: ViewStyle['flexDirection'] =
    resolvedProps.direction === 'horizontal' ? 'row' : 'column';
  const spacing = typeof resolvedProps.spacing === 'number' ? resolvedProps.spacing : 0;

  const [collapsibleHeight, setCollapsibleHeight] = useState<number | null>(null);

  const onCollapsibleLayout = (event: LayoutChangeEvent) => {
    const height = event.nativeEvent.layout.height;
    if (height > 0 && height !== collapsibleHeight) {
      setCollapsibleHeight(height);
    }
  };

  const animatedStyle = useAnimatedStyle(() => {
    if (collapsibleHeight === null) return {};
    const progress = interpolate(
      scrollY.value,
      [0, collapsibleHeight],
      [0, 1],
      Extrapolation.CLAMP
    );
    return {
      height: collapsibleHeight * (1 - progress),
      opacity: 1 - progress,
    };
  }, [collapsibleHeight]);

  // Nothing to collapse (no children, or a single child): render the node as-is.
  // `SDUIScreen` still pins it via `stickyHeaderIndices` — it just won't shrink.
  if (!collapsibleChild || pinnedChildren.length === 0) {
    return <SDUINode node={node} ctx={ctx} />;
  }

  return (
    <View
      testID={node.id}
      style={[{ flexDirection: direction, gap: spacing }, resolvedStyle as ViewStyle]}
    >
      <Animated.View style={[{ overflow: 'hidden' }, animatedStyle]}>
        <View onLayout={onCollapsibleLayout}>
          <SDUINode node={collapsibleChild} ctx={ctx} />
        </View>
      </Animated.View>
      {pinnedChildren.map((child) => (
        <SDUINode key={child.id} node={child} ctx={ctx} />
      ))}
    </View>
  );
}
