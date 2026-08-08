import React, { useCallback, useEffect, useReducer, useRef, useState } from 'react';
import { InteractionManager, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { BottomSheetModal, BottomSheetModalProvider, BottomSheetView } from '@gorhom/bottom-sheet';
import Animated, { useAnimatedScrollHandler, useSharedValue } from 'react-native-reanimated';
import type { Action, Payload, SDUINode as SDUINodeData } from '../../core/types';
import { ComponentRegistry, registry as defaultRegistry } from '../../core/registry';
import { SDUINode, type RenderContext } from '../../core/SDUINode';
import { pageStateReducer, runAction, type ActionEffects } from '../../core/actions';
import { resolveBinding } from '../../core/bindings';
import { resolveToken } from '../../core/theme';
import { clearDevLog } from '../../utils/devLog';
import { CollapsingHeader } from '../../components/chrome/CollapsingHeader';
import { DebugOverlay } from '../../components/chrome/DebugOverlay';

export function SDUIScreen({
  payload,
  registry: registryOverride,
  effects,
  onContentSizeChange,
  onFirstPaint,
  honourDeferred = false,
}: {
  payload: Payload;
  registry?: ComponentRegistry;
  effects?: ActionEffects;
  /** Fires once the scroll content has laid out. Measurement hook (docs/SCHEMA.md §4.3) — not part of the render contract. */
  onContentSizeChange?: () => void;
  /** Fires once the first section (above the fold) has laid out. Measurement hook (docs/PROMPTS.md P6) — not part of the render contract. */
  onFirstPaint?: () => void;
  /**
   * Opt in to honouring `node.deferred` (SCHEMA.md §3, docs/PROMPTS.md P7 item 2): sections the
   * *server* marked below-the-fold are held back until interactions settle. Defaults to false so
   * every pre-P7 caller — and the P7 baseline build — renders exactly as it did before, which is
   * what makes this measurable as a single isolated change.
   */
  honourDeferred?: boolean;
}): React.ReactElement {
  // Dev-only debug overlay (docs/PROMPTS.md P5 item 5) shows degradations from the last
  // render only, not history across renders — devLog is treated as render-scoped diagnostic
  // output here, the same way warn() already logs synchronously from within render elsewhere
  // in core/**.
  if (__DEV__) clearDevLog();

  const [state, reactDispatch] = useReducer(pageStateReducer, payload.state ?? {});
  const [sheet, setSheet] = useState<{ node: SDUINodeData; title?: string } | null>(null);
  const sheetRef = useRef<BottomSheetModal>(null);

  const dispatch = useCallback(
    (action: Action, event?: unknown) => {
      runAction(action, event, {
        dispatchState: reactDispatch,
        openSheet: (node, title) => {
          setSheet({ node, title });
          sheetRef.current?.present();
        },
        effects,
      });
    },
    [effects]
  );

  const ctx: RenderContext = {
    state,
    data: payload.data ?? {},
    theme: payload.theme.tokens,
    registry: registryOverride ?? defaultRegistry,
    dispatch,
  };

  // P7 item 2. "After first interaction" is read as React Native's own meaning of the phrase —
  // InteractionManager's idle callback — rather than "after the user physically touches the
  // screen". Waiting for a real touch would mean the page grows underneath a scroll already in
  // progress, which is a visible content jump: a correctness regression traded for a perf win,
  // and not one worth taking. Deferred sections therefore always arrive, with no user action.
  const [deferredReady, setDeferredReady] = useState(!honourDeferred);
  useEffect(() => {
    if (!honourDeferred) return;
    const handle = InteractionManager.runAfterInteractions(() => setDeferredReady(true));
    return () => handle.cancel();
  }, [honourDeferred]);

  const visibleSections = honourDeferred && !deferredReady
    ? payload.sections.filter((section) => section.deferred !== true)
    : payload.sections;

  /**
   * `sticky` is the one layout primitive whose whole meaning is "do not scroll", which no
   * component rendered *inside* the scroll container can honour on its own. So the screen
   * partitions its top-level sections: `sticky` roots are lifted out and pinned by their `edge`,
   * everything else scrolls between them.
   *
   * This is the same shape as the header, which is already pinned via `stickyHeaderIndices` —
   * pinning is a container's job, not a child's.
   *
   * It does mean the screen knows one component type by name. That is a coupling worth stating,
   * but not a violation of "the renderer knows nothing about cars" (CLAUDE.md rule 2): `sticky`
   * is a layout word with no domain meaning, and the screen reads only `edge`, which the
   * manifest already publishes.
   *
   * Only *top-level* sections are hoisted. A `sticky` nested inside another section keeps its
   * current inline behaviour, because there is no edge for it to pin to.
   */
  const edgeOf = (section: SDUINodeData): 'top' | 'bottom' =>
    resolveBinding(section.props?.edge, { state, data: payload.data ?? {} }) === 'bottom'
      ? 'bottom'
      : 'top';

  const pinnedTop = visibleSections.filter((s) => s.type === 'sticky' && edgeOf(s) === 'top');
  const pinnedBottom = visibleSections.filter((s) => s.type === 'sticky' && edgeOf(s) === 'bottom');
  const scrollingSections = visibleSections.filter((s) => s.type !== 'sticky');

  const scrollY = useSharedValue(0);
  const scrollHandler = useAnimatedScrollHandler((event) => {
    scrollY.value = event.contentOffset.y;
  });

  // The page paints its own declared background rather than relying on the native window's
  // default, which otherwise leaks through (and can resolve dark, e.g. Android's system dark
  // mode) wherever an individual section sets no background of its own.
  const backgroundColor = resolveToken('bg', 'color.bg', 'color', payload.theme.tokens) as
    | string
    | undefined;

  return (
    <GestureHandlerRootView testID="sdui-screen-root" style={{ flex: 1, backgroundColor }}>
      <BottomSheetModalProvider>
        <SafeAreaView style={{ flex: 1 }} edges={['top']}>
          {pinnedTop.map((section) => (
            <SDUINode key={section.id} node={section} ctx={ctx} />
          ))}
          <Animated.ScrollView
            testID="sdui-scroll"
            style={{ flex: 1 }}
            onScroll={scrollHandler}
            scrollEventThrottle={16}
            stickyHeaderIndices={payload.header ? [0] : undefined}
            onContentSizeChange={onContentSizeChange}
          >
            {payload.header && (
              <CollapsingHeader node={payload.header} ctx={ctx} scrollY={scrollY} />
            )}
            {scrollingSections.map((section, index) =>
              index === 0 && onFirstPaint ? (
                <View key={section.id} onLayout={onFirstPaint}>
                  <SDUINode node={section} ctx={ctx} />
                </View>
              ) : (
                <SDUINode key={section.id} node={section} ctx={ctx} />
              )
            )}
          </Animated.ScrollView>
          {pinnedBottom.map((section) => (
            <SDUINode key={section.id} node={section} ctx={ctx} />
          ))}
        </SafeAreaView>
        <BottomSheetModal ref={sheetRef} onDismiss={() => setSheet(null)}>
          <BottomSheetView>{sheet && <SDUINode node={sheet.node} ctx={ctx} />}</BottomSheetView>
        </BottomSheetModal>
        <DebugOverlay />
      </BottomSheetModalProvider>
    </GestureHandlerRootView>
  );
}
