import fs from 'fs';
import path from 'path';
import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { parsePayload } from '../../core/schema';
import { resolveBinding } from '../../core/bindings';
import { registry } from '../../components';
import { SDUIScreen } from '../../screens/SDUIScreen/SDUIScreen';
import { clearDevLog, getDevLog } from '../../utils/devLog';
import type { SDUINode as SDUINodeData, Payload } from '../../core/types';

const raw = JSON.parse(
  fs.readFileSync(path.join(__dirname, '../../../../payloads/car-card-versions.json'), 'utf-8')
);

describe('payloads/car-card-versions.json — car_card@1/@2 coexistence and @3 fallback', () => {
  test('parses against the envelope schema', () => {
    expect(parsePayload(raw).success).toBe(true);
  });

  test('every node resolves to a registered component and its resolved props validate, including the node requesting typeVersion 3', () => {
    const payload = raw as Payload;
    const bindingCtx = { state: {}, data: {} };
    const errors: string[] = [];

    function walk(node: SDUINodeData) {
      const definition = registry.resolve(node.type, node.typeVersion);
      if (!definition) {
        errors.push(`${node.id}: unregistered type "${node.type}"`);
        return;
      }
      const resolvedProps = resolveBinding(node.props ?? {}, bindingCtx);
      const parsed = definition.propsSchema.safeParse(resolvedProps);
      if (!parsed.success) {
        errors.push(
          `${node.id} (${node.type}@${node.typeVersion}): ${parsed.error.issues.map((i) => `${i.path.join('.')} — ${i.message}`).join('; ')}`
        );
      }
      node.children?.forEach(walk);
    }

    payload.sections.forEach(walk);
    expect(errors).toEqual([]);
  });

  test('car_card@3 is not registered — the registry resolves it to @2, which renders it', () => {
    expect(registry.has('car_card')).toBe(true);
    expect(registry.list().filter((e) => e.type === 'car_card')).toEqual([
      { type: 'car_card', typeVersion: 1 },
      { type: 'car_card', typeVersion: 2 },
    ]);

    const resolved = registry.resolve('car_card', 3);
    expect(resolved?.typeVersion).toBe(2);
  });

  test('renders all three cards: @1 and @2 as authored, the requested @3 rendered via @2', async () => {
    clearDevLog();
    const payload = raw as Payload;
    await render(React.createElement(SDUIScreen, { payload }));

    // car_card@1 (flat price/emi props)
    expect(screen.getByText('Maruti Suzuki Baleno')).toBeTruthy();
    expect(screen.getByText('EMI ₹11,499/m*')).toBeTruthy();

    // car_card@2 (priceLine object)
    expect(screen.getByText('Hyundai Creta')).toBeTruthy();
    expect(screen.getByText('EMI ₹17,250/m*')).toBeTruthy();

    // The node requesting @3 fell back to @2 and rendered with @2's priceLine.negotiable branch
    expect(screen.getByText('Tata Nexon')).toBeTruthy();
    expect(screen.getByText('Price negotiable')).toBeTruthy();

    const log = getDevLog();
    expect(
      log.some((e) => e.message.includes('unknown typeVersion 3 for "car_card"') && e.message.includes('falling back to highest known version 2'))
    ).toBe(true);
  });
});
