import React, { useCallback, useReducer, useRef, useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { BottomSheetModal, BottomSheetModalProvider, BottomSheetView } from '@gorhom/bottom-sheet';
import Animated, { useAnimatedScrollHandler, useSharedValue } from 'react-native-reanimated';
import type { Action, Payload, SDUINode as SDUINodeData } from '../core/types';
import { ComponentRegistry, registry as defaultRegistry } from '../core/registry';
import { SDUINode, type RenderContext } from '../core/SDUINode';
import { pageStateReducer, runAction, type ActionEffects } from '../core/actions';
import { CollapsingHeader } from './CollapsingHeader';

export function SDUIScreen({
  payload,
  registry: registryOverride,
  effects,
}: {
  payload: Payload;
  registry?: ComponentRegistry;
  effects?: ActionEffects;
}): React.ReactElement {
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

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <BottomSheetModalProvider>
        <SafeAreaView style={{ flex: 1 }} edges={['top']}>
          <Animated.ScrollView
            onScroll={scrollHandler}
            scrollEventThrottle={16}
            stickyHeaderIndices={payload.header ? [0] : undefined}
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
      </BottomSheetModalProvider>
    </GestureHandlerRootView>
  );
}
