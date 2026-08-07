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
 * The generalization proof (docs/PROMPTS.md P8): a second screen, written from
 * `registry.manifest.json` alone, with **no component added or modified**. What it can and
 * cannot do is the measured content of `docs/COVERAGE.md` §5 — so these tests are the evidence
 * behind that number, not decoration.
 */
const raw = JSON.parse(
  fs.readFileSync(path.join(__dirname, '../../../../payloads/pdp.json'), 'utf-8')
);

describe('payloads/pdp.json — a screen the renderer had never seen', () => {
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

  test('uses no component that home.json did not already need', () => {
    const home = JSON.parse(
      fs.readFileSync(path.join(__dirname, '../../../../payloads/home.json'), 'utf-8')
    ) as Payload;

    const typesIn = (payload: Payload): Set<string> => {
      const types = new Set<string>();
      const walk = (node: SDUINodeData) => {
        types.add(node.type);
        node.children?.forEach(walk);
        if (node.fallback) walk(node.fallback);
      };
      if (payload.header) walk(payload.header);
      payload.sections.forEach(walk);
      return types;
    };

    const registered = new Set(registry.list().map((entry) => entry.type));
    const pdpTypes = typesIn(raw as Payload);

    // The point of P8: nothing new was built for this screen. Everything it uses was already
    // registered before the screen existed.
    expect([...pdpTypes].filter((type) => !registered.has(type))).toEqual([]);

    // And the interesting half — the types this screen brought into use that home never did.
    // If this list is empty the proof is weak, because the second screen only re-walked
    // ground the first one had already covered.
    const newlyExercised = [...pdpTypes].filter((type) => !typesIn(home).has(type)).sort();
    expect(newlyExercised).toEqual(['accordion', 'car_card', 'rating', 'spacer', 'sticky']);
  });

  test('renders without crashing, above-the-fold content visible', async () => {
    await render(React.createElement(SDUIScreen, { payload: raw as Payload }));
    expect(screen.getByText('2019 Maruti Suzuki Baleno Zeta 1.2')).toBeTruthy();
    expect(screen.getByText('₹7,56,000')).toBeTruthy();
    expect(screen.getByText('EMI from ₹25,180/mo')).toBeTruthy();
  });

  test('the tenure chip_group re-reads data.emiByTenure[state.tenure] with no network and no code', async () => {
    await render(React.createElement(SDUIScreen, { payload: raw as Payload }));

    // 36 months is the payload's initial state.
    expect(screen.getByText('EMI from ₹25,180/mo')).toBeTruthy();

    await fireEvent.press(screen.getByTestId('pdp.emiCalculator.tenure-chip-60'));

    expect(await screen.findByText('EMI from ₹17,060/mo')).toBeTruthy();
    expect(screen.queryByText('EMI from ₹25,180/mo')).toBeNull();
  });

  test('a visibleIf on the same state shows the long-tenure caveat only for 48 and 60 months', async () => {
    await render(React.createElement(SDUIScreen, { payload: raw as Payload }));

    expect(screen.queryByText(/Longer tenure lowers the EMI/)).toBeNull();

    await fireEvent.press(screen.getByTestId('pdp.emiCalculator.tenure-chip-48'));
    expect(await screen.findByText(/Longer tenure lowers the EMI/)).toBeTruthy();

    await fireEvent.press(screen.getByTestId('pdp.emiCalculator.tenure-chip-12'));
    expect(screen.queryByText(/Longer tenure lowers the EMI/)).toBeNull();
  });

  test('an accordion toggles from payload state alone, via $event.value', async () => {
    await render(React.createElement(SDUIScreen, { payload: raw as Payload }));

    expect(screen.queryByText(/Apply in-app with your PAN/)).toBeNull();

    await fireEvent.press(screen.getByTestId('pdp.faq.finance-header'));
    expect(await screen.findByText(/Apply in-app with your PAN/)).toBeTruthy();

    await fireEvent.press(screen.getByTestId('pdp.faq.finance-header'));
    expect(screen.queryByText(/Apply in-app with your PAN/)).toBeNull();
  });

  test('the "view breakup" CTA opens a bottom sheet that is itself an SDUI tree', async () => {
    await render(React.createElement(SDUIScreen, { payload: raw as Payload }));

    expect(screen.queryByText('How this EMI is calculated')).toBeNull();

    await fireEvent.press(screen.getByTestId('pdp.price.breakupCta'));

    // The sheet body is rendered by the same renderer, so its bindings resolve against the same
    // page state the calculator is mutating — no sheet component, no second binding path.
    expect(await screen.findByText('How this EMI is calculated')).toBeTruthy();
    expect(screen.getByText('Tenure 36 months at 12.5% p.a.')).toBeTruthy();
    expect(screen.getByText('₹9,06,480')).toBeTruthy();
  });

  /**
   * Regression guard for P8 break #1 (COVERAGE.md §5.2).
   *
   * `resolveActionPayload` used to run `resolveBinding` over the *entire* action payload with a
   * context of `{ event }` — no `state`, no `data`. An `open_sheet` payload carries an SDUI
   * subtree, so every binding inside it was substituted against an empty context and burned away
   * before `SDUINode` ever saw it: `"Tenure {{state.tenure}} months"` rendered as
   * `"Tenure  months"`, and whole-value bindings fell to dev placeholders.
   *
   * The subtree is now passed through verbatim. This test fails the moment anything starts
   * pre-resolving it again — including through a `sequence`, which is how this CTA dispatches.
   */
  test('a sheet reached through a sequence keeps its bindings live, and re-reads state', async () => {
    await render(React.createElement(SDUIScreen, { payload: raw as Payload }));

    // Change the tenure first, so the sheet cannot be passing by rendering a baked-in default.
    await fireEvent.press(screen.getByTestId('pdp.emiCalculator.tenure-chip-60'));
    await fireEvent.press(screen.getByTestId('pdp.price.breakupCta'));

    expect(await screen.findByText('Tenure 60 months at 12.5% p.a.')).toBeTruthy();
    expect(screen.getByText('₹10,17,600')).toBeTruthy();
    expect(screen.queryByText(/required prop failed validation/)).toBeNull();
  });

  /**
   * Regression guard for P8 break #2 (COVERAGE.md §5.2).
   *
   * `sticky` used to render as an ordinary section inside the scroll container, so a
   * `sticky{edge:'bottom'}` CTA bar scrolled away with the content. `SDUIScreen` now lifts
   * top-level `sticky` roots out and pins them by edge.
   */
  test('the sticky CTA bar is pinned outside the scroll container, not scrolled with it', async () => {
    await render(React.createElement(SDUIScreen, { payload: raw as Payload }));

    const scroll = screen.getByTestId('sdui-scroll');

    // Present on screen…
    expect(screen.getByTestId('pdp.ctaBar')).toBeTruthy();
    expect(screen.getByText('Book test drive')).toBeTruthy();
    // …but not inside the thing that scrolls.
    expect(within(scroll).queryByTestId('pdp.ctaBar')).toBeNull();
    // Sanity check that the scroll container is the right node: an ordinary section is in it.
    expect(within(scroll).getByTestId('pdp.summary')).toBeTruthy();
  });

  test('both car_card versions render side by side in the similar-cars rail', async () => {
    await render(React.createElement(SDUIScreen, { payload: raw as Payload }));

    // @2 (priceLine object) and @1 (flat price/emi) in the same rail, from one payload.
    expect(await screen.findByText('2020 Hyundai i20 Sportz')).toBeTruthy();
    expect(screen.getByText('2018 Honda Jazz V')).toBeTruthy();
  });
});
