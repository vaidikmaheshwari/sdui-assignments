import React, { useCallback, useReducer, useRef, useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { BottomSheetModal, BottomSheetModalProvider, BottomSheetView } from '@gorhom/bottom-sheet';
import Animated, { useAnimatedScrollHandler, useSharedValue } from 'react-native-reanimated';
import type { Action, Payload, SDUINode as SDUINodeData } from '../core/types';
import { ComponentRegistry, registry as defaultRegistry } from '../core/registry';
import { SDUINode, type RenderContext } from '../core/SDUINode';
import { pageStateReducer, runAction, type ActionEffects } from '../core/actions';
import { resolveToken } from '../core/theme';
import { clearDevLog } from '../utils/devLog';
import { CollapsingHeader } from './CollapsingHeader';
import { DebugOverlay } from './DebugOverlay';

export function SDUIScreen({
  payload,
  registry: registryOverride,
  effects,
  onContentSizeChange,
}: {
  payload: Payload;
  registry?: ComponentRegistry;
  effects?: ActionEffects;
  /** Fires once the scroll content has laid out. Measurement hook (docs/SCHEMA.md §4.3) — not part of the render contract. */
  onContentSizeChange?: () => void;
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
          <Animated.ScrollView
            onScroll={scrollHandler}
            scrollEventThrottle={16}
            stickyHeaderIndices={payload.header ? [0] : undefined}
            onContentSizeChange={onContentSizeChange}
          >
            {payload.header && (
              <CollapsingHeader node={payload.header} ctx={ctx} scrollY={scrollY} />
            )}
            {payload.sections.map((section) => (
              <SDUINode key={section.id} node={section} ctx={ctx} />
            ))}
          </Animated.ScrollView>
        </SafeAreaView>
        <BottomSheetModal ref={sheetRef} onDismiss={() => setSheet(null)}>
          <BottomSheetView>{sheet && <SDUINode node={sheet.node} ctx={ctx} />}</BottomSheetView>
        </BottomSheetModal>
        <DebugOverlay />
      </BottomSheetModalProvider>
    </GestureHandlerRootView>
  );
}
