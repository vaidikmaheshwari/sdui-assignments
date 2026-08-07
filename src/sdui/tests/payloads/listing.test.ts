import fs from 'fs';
import path from 'path';
import React from 'react';
import { render, screen, fireEvent, within } from '@testing-library/react-native';
import { parsePayload } from '../../core/schema';
import { resolveBinding } from '../../core/bindings';
import { registry } from '../../components';
import { SDUIScreen } from '../../screens/SDUIScreen';
import type { SDUINode as SDUINodeData, Payload } from '../../core/types';

/**
 * The third screen (docs/PROMPTS.md P8 gate) — the round-1 rehearsal. Search/listing, written
 * from `registry.manifest.json` alone after `pdp.json`, again with no component added or
 * modified. The timing is in COVERAGE.md §5.3.
 */
const raw = JSON.parse(
  fs.readFileSync(path.join(__dirname, '../../../../payloads/listing.json'), 'utf-8')
);

describe('payloads/listing.json — the third screen', () => {
  test('parses against the envelope schema', () => {
    expect(parsePayload(raw).success).toBe(true);
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
      const parsed = definition.propsSchema.safeParse(resolveBinding(node.props ?? {}, bindingCtx));
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

  test('renders, with both an interpolated and a state-indexed data binding resolved', async () => {
    await render(React.createElement(SDUIScreen, { payload: raw as Payload }));

    // "{{data.resultCount}} cars in New Delhi" — interpolation into a sentence.
    expect(screen.getByText('1284 cars in New Delhi')).toBeTruthy();
    // "{{data.sortLabels[state.sort]}}" — a data lookup indexed by page state, the same
    // mechanism home.json uses for its tab switch.
    expect(screen.getByText('Relevance')).toBeTruthy();
  });

  test('the empty state is a visibleIf guard, not a second payload', async () => {
    await render(React.createElement(SDUIScreen, { payload: raw as Payload }));

    // data.resultCount is 1284, so the whole empty-state section is absent from the tree.
    expect(screen.queryByText('No cars match these filters')).toBeNull();
    expect(screen.getByText('2019 Maruti Suzuki Baleno Zeta 1.2')).toBeTruthy();
  });

  test('list/grid view switches two sibling sections with visibleIf and zero client code', async () => {
    await render(React.createElement(SDUIScreen, { payload: raw as Payload }));

    expect(screen.getByText('2019 Maruti Suzuki Baleno Zeta 1.2')).toBeTruthy();
    expect(screen.queryByText('2019 Baleno Zeta')).toBeNull();

    await fireEvent.press(screen.getByTestId('listing.resultBar.viewGrid'));

    expect(await screen.findByText('2019 Baleno Zeta')).toBeTruthy();
    expect(screen.queryByText('2019 Maruti Suzuki Baleno Zeta 1.2')).toBeNull();
  });

  test('a multi-select chip_group writes an array back into page state', async () => {
    await render(React.createElement(SDUIScreen, { payload: raw as Payload }));

    // "assured" starts selected; tapping "petrol" must add to the array, not replace it.
    await fireEvent.press(screen.getByTestId('listing.quickFilters-chip-petrol'));

    const chips = screen.getByTestId('listing.quickFilters');
    expect(chips).toBeTruthy();
    expect(screen.getByTestId('listing.quickFilters-chip-assured')).toBeTruthy();
    expect(screen.getByTestId('listing.quickFilters-chip-petrol')).toBeTruthy();
  });

  test('an action dispatched from inside a sheet writes to the page it was opened from', async () => {
    await render(React.createElement(SDUIScreen, { payload: raw as Payload }));

    await fireEvent.press(screen.getByTestId('listing.resultBar.sort'));
    expect(await screen.findByText('Price — low to high')).toBeTruthy();

    await fireEvent.press(screen.getByTestId('listing.sheet.sort.priceLow'));

    // The sheet dispatched set_state into the page's own reducer, and the page's sort button —
    // which is bound to the same state — re-read it. One reducer, one binding path, no sheet
    // component. `pdp.test.ts` covers the other half: bindings carried *inside* the sheet
    // subtree resolve against that same live state (P8 break #1, COVERAGE.md §5.2).
    // Scoped to the button, because the sheet stays mounted and also contains that label.
    expect(within(screen.getByTestId('listing.resultBar.sort')).getByText('Price — low to high'))
      .toBeTruthy();
    expect(within(screen.getByTestId('listing.resultBar.sort')).queryByText('Relevance')).toBeNull();
  });
});
