# COVERAGE.md

What this SDUI system can render from JSON alone, what it cannot, and how far off the honest
number is likely to be when you hand me a Cars24 screen I have not seen.

Companion documents: `docs/SCHEMA.md` is the contract, `docs/PERF.md` is the measurement record.
Where this file and SCHEMA disagree, SCHEMA wins and this file has a bug.

---

## 1. What is actually claimed here

| Claim | Status |
|---|---|
| The reference screen (Cars24 home) renders from JSON | **Measured.** 284 nodes, 12 sections + header, `payloads/home.json`. |
| A screen the registry was **not** designed against renders from JSON | **Measured.** Two of them — `payloads/pdp.json` (147 nodes) and `payloads/listing.json` (55 nodes), both written from `registry.manifest.json` alone, **with zero components added or modified**. §5. |
| A *third-party* Cars24 screen renders from JSON | Still an estimate. §5.5 gives the discount and why it is smaller than it was. |

The previous version of this file gave **~85% as a forward estimate with no second screen behind
it**. There are now two. Building them found **two defects** — both in core, neither in the
component vocabulary — which are now fixed, and the measured number is **91%**.

The order matters: the number was **81% before the fixes**, and that is what the second screen was
worth. It found two real bugs that three screens' worth of tests had not.

---

## 2. The registry

19 registrations across 18 distinct types, generated into `registry.manifest.json` by
`npm run generate:manifest` — never hand-edited. The manifest carries the full contract for each
component (every prop, its type, whether it is required, its default, and its allowed values
where the type is an enum), derived from the component's own Zod schema via `z.toJSONSchema`.
Nothing in it is transcribed by hand, so it cannot drift from the code.

Usage counts below are node counts across the three payloads.

### 2.1 Layout primitives — zero domain knowledge

| type | Renders | home | pdp | listing | Test |
|---|---|---|---|---|---|
| `stack` | vertical/horizontal flow, spacing, align, justify, wrap | 87 | 39 | 11 | `layout/stack.test.tsx` |
| `zstack` | layered children, 9-point align | 9 | 1 | 1 | `layout/zstack.test.tsx` |
| `rail` | horizontal virtualised list, snap/peek/inset | 7 | 2 | — | `layout/rail.test.tsx` |
| `grid` | n-column virtualised grid, gap, aspectRatio | 2 | 2 | 2 | `layout/grid.test.tsx` |
| `sticky` | pinned to the top or bottom screen edge, outside the scroll container | — | 1 | — | `layout/sticky.test.tsx` |
| `spacer` | fixed gap | — | 1 | — | `layout/spacer.test.tsx` |
| `divider` | rule, inset, thickness | 1 | 6 | 3 | `layout/divider.test.tsx` |

### 2.2 Atoms — zero domain knowledge

| type | Renders | home | pdp | listing | Test |
|---|---|---|---|---|---|
| `text` | value, variant, colour, maxLines, align, opacity | 112 | 55 | 18 | `atoms/text.test.tsx` |
| `image` | url, aspectRatio, radius, contentMode, preload, placeholder | 45 | 6 | 5 | `atoms/image.test.tsx` |
| `icon` | name, size, colour | 7 | 16 | 5 | `atoms/icon.test.tsx` |
| `button` | label, variant, size, icon, iconPosition, fullWidth, enabled | 2 | 5 | 4 | `atoms/button.test.tsx` |
| `chip_group` | options, selected, scrollable, multi | 1 | 1 | 1 | `atoms/chip_group.test.tsx` |
| `badge` | label, tone, icon | 10 | 4 | — | `atoms/badge.test.tsx` |
| `input` | placeholder, **placeholderRotation[]**, rotationMs, value, keyboard, readOnly | 1 | — | 1 | `atoms/input.test.tsx` |
| `rating` | value, max | — | 2 | — | `atoms/rating.test.tsx` |
| `accordion` | title, expanded, children = body | — | 3 | — | `atoms/accordion.test.tsx` |

### 2.3 Composites — domain-aware, and taxed for it

| type | Versions | home | pdp | listing | Admission evidence |
|---|---|---|---|---|---|
| `car_card` | `@1`, `@2` coexisting | — | 3 | 4 | **Admission satisfied.** 7 usages across 2 screens, and `@1` and `@2` render side by side in one rail (`pdp.similar.rail`). |
| `tile` | `@1` | — | — | — | Built only to be measured against composition — see §4. **Not admitted.** |

**One of eighteen registered types is unused by any real screen: `tile`** — and that is a
decision, not a gap (§4). The previous version of this file listed six unused types; `sticky`,
`spacer`, `rating`, `accordion` and `car_card` all now appear on a screen that exists.

### 2.4 Actions

All seven action types in SCHEMA §8 are now exercised by a real payload. Counts are action
instances across the three screens:

| action | home | pdp | listing |
|---|---|---|---|
| `navigate` | 54 | 10 | 12 |
| `set_state` | 4 | 5 | 8 |
| `sequence` | — | 4 | 3 |
| `track` | — | 4 | 1 |
| `open_sheet` | 1 | 2 | 1 |
| `open_url` | — | 1 | — |
| `refresh` | — | — | 3 |

**Caveat, and it is a real one:** `App.tsx` renders `SDUIScreen` with no `effects` prop, so
`navigate`, `track` and `refresh` all fall through to `warn(...)` and no-op in this build
(`core/actions.ts:54-90`). The payloads express the intent correctly and the reducer routes it
correctly; nothing is wired to a navigator. `set_state`, `open_sheet` and `open_url` do work
end-to-end.

---

## 3. UI patterns the schema can express — JSON only, no client code

| Pattern | Mechanism | Evidence |
|---|---|---|
| Vertical lists | `stack`, `grid` | `home.services`, `listing.results` |
| Horizontal carousels / rails | `rail` (`snap`, `peek`, `contentInset`) | `home.buyCar`, `pdp.gallery.rail` |
| Grids, n columns | `grid(columns)` | `home.services` (3-col), `pdp.keySpecs.grid` (3-col), `listing.resultsGrid` (2-col) |
| Overlay / full-bleed banners | `zstack` | `home.spotifyPromo`, `listing.results.promo` |
| Section headers (title + badge + right link) | composition, no composite | 5 usages on home, 2 on pdp, 1 on listing |
| Conditionals | `visibleIf` — `eq neq gt lt gte lte in exists and or not` | `listing` list/grid switch; `pdp` long-tenure caveat; `core/predicate.test.ts` |
| Data binding | `{{data.*}}`, `{{state.*}}`, whole-value and interpolated | `core/bindings.test.ts` |
| State-indexed data reads | `data.emiByTenure[state.tenure]`, `data.sortLabels[state.sort]` | `pdp.test.ts`, `listing.test.ts` |
| Tab / chip interaction | `chip_group` → `set_state` → rebind | `home.usedCars.tabs`, `pdp.emiCalculator.tenure` |
| **Multi-select** chip interaction writing an array to state | `chip_group(multi)` → `set_state` with `$event.value` | `listing.quickFilters` |
| Expand / collapse | `accordion` + `expanded: "{{state.x}}"` + `onToggle → set_state($event.value)` | `pdp.faq.*` |
| Tappable card → navigation intent | `actions.onTap` → `navigate` | 76 `navigate` actions across 3 screens |
| Empty state | a whole section behind `visibleIf: { eq: [count, 0] }` | `listing.empty` |
| Bottom sheets, modals, tooltips | `open_sheet` carries an **SDUI subtree**, bindings live | 4 usages; **there is no sheet component in this repo** |
| A bar pinned to a screen edge | `sticky{ edge }` as a top-level section | `pdp.ctaBar` |
| Multi-step reactions | `sequence` | `pdp.header.wishlist` (set_state + track) |
| Analytics | `track`, plus `analytics` on the envelope | `pdp`, `listing` |
| Partial section refresh | `refresh { endpoint, targetId }` | `listing.loadMore` (payload correct, no handler wired — §2.4) |
| Styling overrides | token-only `style` block | schema §5 |
| Theming / dark mode | `theme.tokens` swap | schema §5 |
| Rotating search placeholder | `input.placeholderRotation[]` + `rotationMs` — modelled as data | `home.header.search`, `listing.header.search` |
| Below-fold deferral | `deferred: true` on a section root | `pdp.similar`, `listing.loadMore`; `PERF.md` P7 item 2 |
| Above-fold image hinting | `preload: true` on an image | `pdp.gallery.img.1-2`; `PERF.md` P7 item 5 |
| Unknown component | inline `fallback` subtree → dev placeholder → nothing | `payloads/home-unknown.json` |
| Payload too new for this client | `minClientSchemaVersion` → bundled last-known-good | `payloads/home-too-new.json` (`9.9.9`) |
| Two component versions in flight | `car_card@1` + `car_card@2` in one rail | `pdp.similar.rail`, `payloads/car-card-versions.json` |

`open_sheet` is the highest-leverage line in that table: because a sheet's contents are an SDUI
node rendered by the same renderer, against the same page state, **every future sheet, modal,
tooltip and dialog on every screen is a JSON change**.

That was not true when this document was first written. Building the PDP proved it was only half
true — the sheet rendered, but every binding inside it was destroyed on the way there. §5.2 is
the story.

---

## 4. The `tile` decision, resolved

SCHEMA §4.3 left `tile` pending a measurement, with the rule: *if composition costs less than
~10% on both metrics, composition wins and `tile` is never admitted.*

Measured (`PERF.md` §4.3, n=10, release, one device):

| | composition (348 nodes) | `tile` composite (298 nodes) |
|---|---|---|
| TTR | 208ms · p90 217 | 205ms · p90 229 |
| Full render | 587ms · p90 620 | 604ms · p90 640 |
| Scroll jank | 0.27% | 0.27% |

Composition is **2.9% slower on TTR and 2.8% faster on full render** — inside noise on both, and
nowhere near the 10% bar. **`tile` is not admitted.** It stays registered so the measurement stays
reproducible and `payloads/home-tile-composite.json` keeps working, but `payloads/home.json`
composes every tile from `stack{ image, text }`, and a new screen's tile grid in any skin is pure
JSON.

The coverage-relevant outcome: five home sections (Buy car, Sell your car, Get loans, Car check
services, Manage your vehicle) are **one pattern in five skins**, differing only in tokens and
container. A sixth skin costs nothing — `listing.resultsGrid` is that sixth skin, and it cost
nothing.

---

## 5. The generalization proof

### 5.1 Method

`docs/PROMPTS.md` P8: generate the full manifest, build `npm run validate`, then write a Cars24
PDP **using only the manifest** — and if something is genuinely impossible, stop and report it
rather than adding a component. Then repeat against a third screen, timed.

Both screens were written against `registry.manifest.json` and nothing else. **No component was
added, modified, or version-bumped for either.** `src/sdui/tests/payloads/pdp.test.ts` asserts
that mechanically (`uses no component that home.json did not already need`), and also asserts the
inverse — that the second screen brought five previously-unused types into service, so the proof
is not just the first screen walked again.

Verification, all currently passing:

```
npx tsc --noEmit          → clean
npm run validate          → 8 payloads, 0 unexpected errors
npx jest                  → 40 suites, 296 tests
```

### 5.2 Where the schema broke, and what it cost to fix

Exactly two things could not be expressed. **Neither was a gap in the component vocabulary** —
both were bugs in core plumbing, which is the encouraging half of the result: the 17 components
designed against the home screen were enough to build two screens they had never seen. What was
not enough was the wiring underneath them.

Both were found by writing a payload, not by writing a test. Three screens' worth of unit tests
had passed over both.

---

**Break #1 — a data binding inside an `open_sheet` subtree was destroyed before the sheet rendered.**

`runAction` calls `resolveActionPayload(action, event)`, which ran `resolveBinding` over the
**entire** action payload with a context of `{ event }` — no `state`, no `data`. An `open_sheet`
payload contains an SDUI subtree, so every `{{state.*}}` and `{{data.*}}` inside it was resolved
against an empty context at dispatch time and lost:

| In the payload | What rendered |
|---|---|
| `"Tenure {{state.tenure}} months at 12.5% p.a."` | `"Tenure  months at 12.5% p.a."` |
| `"{{data.emiByTenure[state.tenure].total}}"` | `⚠ text (…): required prop failed validation` |

The page survived — the failure was node-local, exactly as SCHEMA §9 requires — but the price
breakup sheet could not show the numbers it exists for. A sheet could be interactive but never
data-driven, which quietly voided §3's claim about `open_sheet`.

**Fixed** in `core/actions.ts`. `resolveActionPayload` now passes two payload keys through
verbatim instead of resolving them:

- `open_sheet.payload.node` — an SDUI subtree, resolved by `SDUINode` against the live
  `{state, data}` at render, like every other node.
- `sequence.payload.actions` — actions, which `runAction` already resolves individually against
  the same event when it dispatches them. Resolving them at the sequence level was both redundant
  and destructive: it stripped a nested sheet's subtree one level higher up, which is exactly how
  `pdp.price.breakupCta` dispatches.

No new component, no schema field, no change to any payload. Guarded by two tests in
`core/actions.test.ts` (asserting the subtree is the *same object*, not a rebuilt copy) and one in
`pdp.test.ts` that changes the tenure to 60 months **before** opening the sheet, so the sheet
cannot pass by rendering a baked-in default.

---

**Break #2 — `sticky` rendered, but did not stick.**

`sticky` is a registered layout primitive with an `edge: 'top' | 'bottom'` prop whose component is
a plain `View` with a shadow. `SDUIScreen` rendered every section inside one `Animated.ScrollView`,
with `stickyHeaderIndices` applied only to the header — so nothing pinned it. A
`sticky{edge:'bottom'}` CTA bar scrolled away with the content.

The header was the clue: pinning already worked there, and it worked because the *container* did
it, not the child. No component rendered inside a scroll container can honour "do not scroll" on
its own.

**Fixed** in `SDUIScreen`: top-level `sticky` sections are partitioned out of the scroll content
and pinned by `edge` — `top` above the scroll view, `bottom` below it, both as flex siblings.
`onFirstPaint` follows the first *scrolling* section, so the P6/P7 measurement still times what it
claims to. A `sticky` nested inside another section keeps its inline behaviour, because there is
no edge for it to pin to.

This makes the screen know one component type by name, and that is a coupling worth stating
plainly. It is not a violation of "the renderer knows nothing about cars" (CLAUDE.md rule 2) —
`sticky` is a layout word with no domain meaning, and the screen reads only `edge`, which the
manifest already publishes — but it is the first time `screens/` has branched on a type string,
and the alternative was deleting `sticky` and declaring pinned bars a client-owned boundary
alongside the header collapse.

Guarded in `pdp.test.ts`, which asserts the CTA bar is on screen **and not inside**
`testID="sdui-scroll"`.

---

### 5.3 What it cost

Wall-clock, payload authoring through a clean `npm run validate`, first pass both times:

| Screen | Nodes | Sections | Bytes | Time to a clean validate |
|---|---|---|---|---|
| `pdp.json` | 147 | 12 | 41,666 | **4m 50s** |
| `listing.json` | 55 | 6 | 19,517 | **1m 20s** |

Two honest qualifications. These are agent wall-clock, not human hours — read them as a lower
bound on how fast the *format* can be written, not as a staffing estimate. And the second screen
was four times faster largely because the first one had already established the section patterns
and forced the lookups; a genuinely novel screen would sit closer to the first number than the
second.

Neither figure includes writing the render tests (`pdp.test.ts`, `listing.test.ts`), which took
longer than either payload.

### 5.4 The measured coverage number

A surface counts as **fully covered** only if it renders correctly and completely with no change
to `src/**`. A surface that renders in a reduced form is **degraded**, not covered. A surface that
renders its `fallback`, or renders but does not behave, is **not covered** — graceful degradation
is a safety property, not coverage.

| Screen | Surfaces | Fully JSON | Degraded | Needs client code |
|---|---|---|---|---|
| home (audited against the live app, SCHEMA §13) | 14 | 12 | 1 — promo rail without auto-advance | 1 — header collapse |
| pdp (the 9 surfaces the P8 prompt specified) | 9 | 9 | 0 | 0 |
| listing (9 surfaces) | 9 | 8 | 1 — pagination has no scroll-end trigger and no handler (§2.4) | 0 |
| **Total** | **32** | **29** | **2** | **1** |

> **29 of 32 surfaces — 91% — render fully from JSON with no client change. 6% render in a
> reduced form. 3% is the one declared client-owned boundary. 100% render something; nothing
> blanked a page.**

**Before the two fixes in §5.2 this number was 26 of 32 — 81%.** Both figures are real and both
belong here: 81% is what the schema was worth when the second screen was written, and 91% is what
it is worth now that the second screen's findings have been paid off. Quoting only the second
would hide where the improvement came from.

At node level, **all 486 nodes across the three screens now render as written**. Before the fixes,
6 did not — one interpolated string with a hole in it and five whole-value bindings falling to dev
placeholders, all inside `pdp.json`'s price-breakup sheet.

The surface number is the honest one to quote. The node number flatters the system, because most
nodes are text and images, and the failures landed on the few nodes that carried the point.

### 5.5 The forward estimate, revised

**For a Cars24 screen none of these three anticipated, I expect ~80–85% of surfaces to be
JSON-only** — *below* the 91% measured, not above it.

Two screens is a better basis than zero, but the selection bias has only shrunk, not gone: I chose
which nine surfaces a PDP has and which nine a listing has. A real Cars24 PDP would also want a
360° spin viewer, a finance eligibility form with validation, and an auto-advancing offer
carousel — three things §6 says are not covered.

The estimate also has to price in what §5.2 demonstrated: **a new screen is likely to find a bug
that no existing screen exercised.** Two screens found two, and the honest expectation is that a
third finds a third. The reason to be optimistic anyway is *where* they were — both in core
plumbing, fixed in ~15 lines between them, neither requiring a new component. The vocabulary
held; the wiring had two holes.

---

## 6. What needs new client code

Ranked by how likely I think it is to appear on the next Cars24 screen.

| # | Pattern | Why it can't be JSON today | Cost |
|---|---|---|---|
| 1 | **Auto-advancing carousel with page dots** | A timer plus page state is stateful behaviour a `rail` cannot express declaratively. SCHEMA §4.3 lists `banner_carousel` as admitted; **it is not in the registry.** See §8. | 1 composite, ~half a day |
| 2 | **Pagination / infinite scroll** | `refresh` exists and `listing.json` uses it, but nothing triggers it from a scroll-end event, and no `effects.onRefresh` is wired. | Additive `onEndReached` event + a handler |
| 3 | **Scroll-linked / collapsing behaviour** | Per-frame UI-thread interpolation. Declarative expression means shipping an animation DSL, cut in SCHEMA §11. | Client release |
| 4 | **Any transition or animation** | Same reason. No `animate` block on Node. | Additive `animate` block, then a release |
| 5 | **Maps, video, WebView, camera, AR, 360° spin** | No component and no native module wired. `payloads/home-unknown.json` shows `video_banner` and `ar_showroom_banner` degrading today — the right behaviour, and still not coverage. | 1 component each |
| 6 | **Client-side formula evaluation** (EMI from a rate + tenure) | Deliberately cut. The PDP proves the alternative works: `data.emiByTenure` is a lookup table, and the calculator is a `chip_group` plus two bindings. | A closed numeric grammar — the one evaluator I would accept |
| 7 | **Pull-to-refresh** | No gesture-sourced events in the action model. | Additive event on the screen root |
| 8 | **Form validation** | `input` has `keyboard` and `readOnly` but no validation grammar and no error-state slot. Both new screens dodged this by making every input `readOnly` and navigating away. | Additive props + a closed validator set |
| 9 | **Per-child grid span** | SCHEMA §12 open question. Workaround is a nested `stack`, which is not identical. | Additive prop on `grid` |
| 10 | **Server-driven navigation graph** | Routes stay client-owned by design; `navigate` carries an intent, not a screen definition. | Deep-link table update |

The two entries this list carried before — bindings inside a sheet, and a bar pinned to a screen
edge — are gone because they were fixed (§5.2), not because they were reclassified.

### The safety net while any of these is being added

The server can ship the new type immediately with an inline `fallback` subtree. Old clients render
the fallback, new clients render the real thing, and **the server sends one payload to everyone** —
no server-side version branching (SCHEMA §10.2). "Needs client code" never means "the screen is
broken until the release lands"; it means "the screen is reduced until the release lands".

### Adding a component, mechanically

1. One file in `src/sdui/components/<tier>/`, exporting `{ type, typeVersion, propsSchema, defaults, Component }`.
2. Register it in `src/sdui/components/index.ts`.
3. `npm run generate:manifest` — `registry.manifest.json` is generated, never hand-edited.
4. Add a payload fixture and a test, including the unknown-input path.
5. `npx tsc --noEmit`, `npm run validate`, `npx jest` (currently 40 suites / 296 tests).

Steps 1–3 are the whole client change.

---

## 7. Tooling that backs these claims

Both were missing when this file was first written; both now exist.

**`npm run generate:manifest`** emits the full component contract, not just a name list — every
prop with its type, required-ness, default and allowed values, derived from each component's Zod
schema through `z.toJSONSchema`. `schemaVersion` is read from `CLIENT_SCHEMA_VERSION` rather than
typed in, so the manifest cannot drift from the client's advertised version.

**`npm run validate`** checks every `payloads/*.json` against the live registry and exits nonzero
on error. It catches, with a node path and a readable message:

- envelope schema violations
- duplicate node ids (CLAUDE.md rule 6 — ids are what memoisation and analytics address)
- unknown component types, split by whether a `fallback` exists
- prop type / enum / required failures, per prop
- props not in the schema at all (Zod strips these silently at runtime — the most confusing
  failure mode there is when hand-writing a payload)
- `visibleIf` operators outside the closed set (SCHEMA §7)
- raw hex or raw numeric values in token-only `style` slots (CLAUDE.md rule 7)
- unknown token references
- unknown action types, and malformed `set_state` / `refresh` payloads
- all of the above **inside an `open_sheet` subtree**, which is otherwise invisible until tapped

Props whose value is an unresolved `{{binding}}` are skipped rather than type-checked, since their
runtime type is unknowable statically.

Fixtures that are *meant* to be broken are declared with their exact expected error count rather
than excluded, so `home-unknown.json` failing to produce its error is itself a failure.

Verified against a deliberately-corrupted payload: 6 planted defects, 6 caught, exit code 1.

---

## 8. Known divergences between this repo's documents and its code

Recorded rather than quietly fixed, because a coverage document that hides its own inaccuracies is
worthless.

| Divergence | Detail | Status |
|---|---|---|
| `banner_carousel` | SCHEMA §4.3 lists it as **admitted** with a justification. It is **not implemented and not registered**. Either the table is aspirational and should say so, or the component is owed. | Open |
| Section count | SCHEMA §13 inventories 13 sections; `payloads/home.json` ships 12. | Open |
| `deferred` version | SCHEMA added `deferred` as v1.1.1; `CLIENT_SCHEMA_VERSION` still reads `1.1.0`. Harmless (the field is additive and optional), but the numbers disagree. Bumping it touches version gating, so it is flagged rather than changed. | Open, needs a call |
| Raw px in `style` | CLAUDE.md rule 7 says `style` may reference design tokens only. `width` and `height` are raw pass-throughs in `core/theme.ts:38` and `home.json` already depends on that (9 `zstack`s size themselves in px). Both new screens follow the existing convention. Either rule 7 has an exception it does not state, or the sizes want `space.*` tokens. | Open, needs a call |
| Effects unwired | `App.tsx` passes no `effects`, so `navigate`, `track` and `refresh` no-op. 76 `navigate` actions across three screens do nothing when tapped. | Open — a demo-app gap, not a renderer gap |
| Tab switch mechanism | SCHEMA §6 motivates `data.carLists[state.carListTab]` as the tab-switch mechanism. `home.json` implements the switch with two sibling rails and `visibleIf`. Both work; only one is documented — and `pdp.json` / `listing.json` now use *both*, so both are real. | Resolved by use |
| `car_card` on home | SCHEMA §13 shows section 5 as `rail{ car_card… }`; `home.json` composes those cards from `stack{ image, text… }` instead. | Still true of home, but `car_card` now has 7 real usages on pdp and listing |
| `npm run validate` | CLAUDE.md's definition-of-done required it; no such script existed. | **Fixed** — §7 |
| Manifest completeness | The manifest listed only `{type, typeVersion}`, which is not enough to write a payload from. | **Fixed** — §7 |

---

## 9. Summary

- **18 component types, 19 registrations.** 17 are exercised by a real screen; the only unused one
  is `tile`, and that is a measured decision (§4).
- **All 7 action types** are now exercised by a payload.
- **Three screens, 486 nodes, 30 sections.** Two of the three were written from the manifest alone
  with **zero components added**.
- **91% of surfaces (29 of 32) render fully from JSON**, measured, not estimated. 6% degrade, 3%
  is the one declared client-owned boundary, 0% break the page. All 486 nodes render as written.
- **Two things broke while proving it** — bindings inside a sheet subtree, and `sticky` not
  sticking. Both were in **core plumbing, not in the component vocabulary**; both are fixed
  (§5.2) in about 15 lines between them, with no new component and no schema field. The number
  was **81% before those fixes**, which is what the second screen was actually worth.
- The forward estimate for a genuinely unanticipated screen is **80–85%** — below the measured
  91%, because the next screen will probably find a third bug the same way.
- Everything not covered degrades to an inline `fallback` rather than breaking the page.
