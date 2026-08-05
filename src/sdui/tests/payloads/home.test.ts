import fs from 'fs';
import path from 'path';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { parsePayload } from '../../core/schema';
import { resolveBinding } from '../../core/bindings';
import { registry } from '../../components';
import { SDUIScreen } from '../../screens/SDUIScreen';
import type { SDUINode as SDUINodeData, Payload } from '../../core/types';

const raw = JSON.parse(
  fs.readFileSync(path.join(__dirname, '../../../../payloads/home.json'), 'utf-8')
);

describe('payloads/home.json', () => {
  test('parses against the envelope schema', () => {
    const result = parsePayload(raw);
    expect(result.success).toBe(true);
  });

  test('data.carLists has wishlisted and hotDeals keys, per the chip interaction contract', () => {
    const payload = raw as Payload;
    const carLists = payload.data?.carLists as Record<string, unknown>;
    expect(carLists).toHaveProperty('wishlisted');
    expect(carLists).toHaveProperty('hotDeals');
  });

  test('every node resolves to a registered component and its resolved props validate', () => {
    const payload = raw as Payload;
    const bindingCtx = { state: payload.state ?? {}, data: payload.data ?? {} };
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
          `${node.id} (${node.type}): ${parsed.error.issues.map((i) => `${i.path.join('.')} — ${i.message}`).join('; ')}`
        );
      }
      node.children?.forEach(walk);
    }

    if (payload.header) walk(payload.header);
    payload.sections.forEach(walk);

    expect(errors).toEqual([]);
  });

  test('renders the full home screen without crashing, above-the-fold content visible', async () => {
    const payload = raw as Payload;
    await render(React.createElement(SDUIScreen, { payload }));
    expect(screen.getByText('Buy a car')).toBeTruthy();
    expect(screen.getByText("Used cars you'll love")).toBeTruthy();
    expect(screen.getByText('Cars24')).toBeTruthy();
  });

  test('the chip_group interaction swaps the used-cars rail between wishlisted and hot deals', async () => {
    const payload = raw as Payload;
    await render(React.createElement(SDUIScreen, { payload }));

    expect(screen.getByText('Maruti Suzuki Baleno')).toBeTruthy();
    expect(screen.queryByText('Maruti Suzuki Swift')).toBeNull();

    await fireEvent.press(screen.getByTestId('home.usedCars.tabs-chip-hotDeals'));

    expect(await screen.findByText('Maruti Suzuki Swift')).toBeTruthy();
    expect(screen.queryByText('Maruti Suzuki Baleno')).toBeNull();
  });
});
