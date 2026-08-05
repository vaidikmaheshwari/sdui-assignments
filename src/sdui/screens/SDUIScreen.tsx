import React, { useCallback, useReducer, useRef, useState } from 'react';
import { ScrollView } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { BottomSheetModal, BottomSheetModalProvider, BottomSheetView } from '@gorhom/bottom-sheet';
import type { Action, Payload, SDUINode as SDUINodeData } from '../core/types';
import { ComponentRegistry, registry as defaultRegistry } from '../core/registry';
import { SDUINode, type RenderContext } from '../core/SDUINode';
import { pageStateReducer, runAction, type ActionEffects } from '../core/actions';

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

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <BottomSheetModalProvider>
        <ScrollView>
          {payload.header && <SDUINode node={payload.header} ctx={ctx} />}
          {payload.sections.map((section) => (
            <SDUINode key={section.id} node={section} ctx={ctx} />
          ))}
        </ScrollView>
        <BottomSheetModal ref={sheetRef} onDismiss={() => setSheet(null)}>
          <BottomSheetView>{sheet && <SDUINode node={sheet.node} ctx={ctx} />}</BottomSheetView>
        </BottomSheetModal>
      </BottomSheetModalProvider>
    </GestureHandlerRootView>
  );
}
