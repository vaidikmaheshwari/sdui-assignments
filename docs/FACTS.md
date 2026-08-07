# FACTS.md

Facts sheet (`docs/PROMPTS.md` P9). No prose, no conclusions, no recommendations.

Sources: `registry.manifest.json`, `bench/results.json` (20 runs), `bench/results-p7.json` (100
runs), `payloads/*.json`, `src/**`. Every number below is recomputed from those files, not copied
from another document.

**Statistical convention used throughout:** at n=10, *median* = the lower of the two middle
values (sorted index 4); *p90* = nearest-rank (sorted index 8). This is the convention already
used by `docs/PERF.md`; it is restated here because it was not previously written down.

---

## 1. Registered components

19 registrations, 18 distinct types. Tier is taken from the file's directory under
`src/sdui/components/`. Prop counts are from `registry.manifest.json` (generated from the live
registry by `npm run generate:manifest`).

| Type | Tier | typeVersion | Props | of which required | File |
|---|---|---|---|---|---|
| `divider` | Layout primitive | 1 | 2 | 0 | `layout/divider.tsx` |
| `grid` | Layout primitive | 1 | 3 | 0 | `layout/grid.tsx` |
| `rail` | Layout primitive | 1 | 5 | 0 | `layout/rail.tsx` |
| `spacer` | Layout primitive | 1 | 1 | 0 | `layout/spacer.tsx` |
| `stack` | Layout primitive | 1 | 5 | 0 | `layout/stack.tsx` |
| `sticky` | Layout primitive | 1 | 2 | 0 | `layout/sticky.tsx` |
| `zstack` | Layout primitive | 1 | 1 | 0 | `layout/zstack.tsx` |
| `accordion` | Atom | 1 | 2 | 1 | `atoms/accordion.tsx` |
| `badge` | Atom | 1 | 3 | 1 | `atoms/badge.tsx` |
| `button` | Atom | 1 | 7 | 1 | `atoms/button.tsx` |
| `chip_group` | Atom | 1 | 4 | 1 | `atoms/chip_group.tsx` |
| `icon` | Atom | 1 | 3 | 1 | `atoms/icon.tsx` |
| `image` | Atom | 1 | 6 | 1 | `atoms/image.tsx` |
| `input` | Atom | 1 | 6 | 0 | `atoms/input.tsx` |
| `rating` | Atom | 1 | 2 | 1 | `atoms/rating.tsx` |
| `text` | Atom | 1 | 6 | 1 | `atoms/text.tsx` |
| `car_card` | Composite | 1 | 9 | 6 | `composites/car_card.tsx` |
| `car_card` | Composite | 2 | 7 | 6 | `composites/car_card.tsx` |
| `tile` | Composite | 1 | 8 | 2 | `composites/tile.tsx` |

Totals: 7 layout primitives, 9 atoms, 2 composite types (3 registrations). 82 prop definitions
across all 19 registrations.

`schemaVersion` in the manifest: `1.1.0`.

**Not present in the manifest:** an `events` field. `ComponentDefinition`
(`src/sdui/core/types.ts`) has no `events` key; emitted event names exist only as string literals
inside each component's render function (e.g. `onTap`, `onSelect`, `onToggle`, `onChange`). P8
item 1 asked for "which events it emits"; that part is not implemented.

**Registered but not used by any payload:** `tile` (1 of 18 types).

---

## 2. `payloads/pdp.json`

### 2.1 Size

| Payload | Nodes (tree only) | Nodes incl. subtrees inside action payloads | Sections | Header |
|---|---|---|---|---|
| `home.json` | 279 | 284 | 12 | yes |
| `pdp.json` | 115 | 147 | 12 | yes |
| `listing.json` | 46 | 55 | 6 | yes |
| **total** | **440** | **486** | **30** | — |

"Tree only" walks `header`, `sections`, `children`, `fallback`. The larger count also walks nodes
carried inside `actions.*.payload.node` (`open_sheet` subtrees). `pdp.json` contains 2
`open_sheet` actions.

### 2.2 Component usage in `pdp.json`

| Component | Tree only | Incl. sheet subtrees |
|---|---|---|
| `text` | 39 | 55 |
| `stack` | 30 | 39 |
| `icon` | 14 | 16 |
| `image` | 6 | 6 |
| `divider` | 4 | 6 |
| `button` | 4 | 5 |
| `badge` | 4 | 4 |
| `accordion` | 3 | 3 |
| `car_card` | 3 | 3 |
| `rail` | 2 | 2 |
| `rating` | 1 | 2 |
| `grid` | 1 | 2 |
| `chip_group` | 1 | 1 |
| `spacer` | 1 | 1 |
| `sticky` | 1 | 1 |
| `zstack` | 1 | 1 |
| **total** | **115** | **147** |

Distinct types used: **16 of 18 registered**. Not used: `tile`, `input`.

Non-default `typeVersion` requests in `pdp.json`: `car_card@2` ×2 (and `car_card@1` ×1).

### 2.3 Nodes per section

| Section id | Root type | Nodes (tree only) |
|---|---|---|
| `pdp.gallery` | `zstack` | 9 |
| `pdp.summary` | `stack` | 9 |
| `pdp.price` | `stack` | 6 |
| `pdp.emiCalculator` | `stack` | 13 |
| `pdp.rule.1` | `divider` | 1 |
| `pdp.keySpecs` | `stack` | 27 |
| `pdp.features` | `stack` | 19 |
| `pdp.rule.2` | `divider` | 1 |
| `pdp.faq` | `stack` | 12 |
| `pdp.similar` | `stack` | 8 |
| `pdp.spacer.bottom` | `spacer` | 1 |
| `pdp.ctaBar` | `sticky` | 4 |

### 2.4 Components added while building `pdp.json`

**Zero.** Evidence, in order of strength:

1. The manifest's registration set is byte-for-byte the same before and after. At commit
   `989d6cd` (predates `pdp.json`) the manifest listed 19 registrations; it lists the same 19
   `{type, typeVersion}` pairs today. The manifest file itself grew by 576 lines in `e3709c1`,
   entirely from the generator being rewritten to emit per-prop detail — not from any new
   component.
2. `src/sdui/tests/payloads/pdp.test.ts` asserts mechanically that every type in `pdp.json`
   resolves against `registry.list()`, and separately that the set of types new to this screen is
   exactly `['accordion', 'car_card', 'rating', 'spacer', 'sticky']` — all pre-existing.
3. One file under `src/sdui/components/` was modified in the same commit —
   `atoms/image.tsx`, +29/−2 — but that diff is P7 item 5 (preload gating) and contains no change
   to `propsSchema`, `defaults`, `type` or `typeVersion`.

Types `pdp.json` brought into first use that `home.json` never used: `accordion`, `car_card`,
`rating`, `spacer`, `sticky`. Types `listing.json` brought into first use: `car_card`.

### 2.5 Core files changed after `pdp.json` was written

Two, neither a component:

| File | Change |
|---|---|
| `src/sdui/core/actions.ts` | `resolveActionPayload` no longer resolves bindings inside `open_sheet.payload.node` or `sequence.payload.actions` |
| `src/sdui/screens/SDUIScreen.tsx` | top-level `sticky` sections are lifted out of the scroll container and pinned by `edge` |

---

## 3. Perf — static vs SDUI (P6)

Source: `bench/results.json`, 20 records (10 `composition`, 10 `static`). Release builds, one
physical Android device (CPH2717), `am force-stop` + `logcat -c` between runs.

### 3.1 Raw markers (ms since launch)

| Marker | SDUI (med · p90) | static (med · p90) |
|---|---|---|
| `appStart` | 461 · 487 | 430 · 467 |
| `payloadReceived` | 461 · 487 | N/A |
| `parseEnd` | 461 · 487 | N/A |
| `validateEnd` | 478 · 507 | N/A |
| `firstPaint` | 669 · 745 | 598 · 659 |
| `interactive` | 482 · 511 | 431 · 471 |
| `fullRender` | 669 · 745 | 598 · 659 |
| `am start -W` TotalTime | 215 · 250 | 209 · 256 |
| Flashlight fps (avg/iteration) | 59.77 · 60.00 | 59.18 · 59.97 |

### 3.2 The five assignment metrics, with overhead %

Overhead = `(sdui − static) / static`, computed separately for median and p90.

| Assignment metric | Marker | SDUI | static | Overhead |
|---|---|---|---|---|
| TTR — cold open → above the fold | `firstPaint` | 669 · 745 | 598 · 659 | **+11.9% · +13.1%** |
| TTI — cold open → scrollable/tappable | `interactive` | 482 · 511 | 431 · 471 | **+11.8% · +8.5%** |
| Full page time — all sections rendered | `fullRender` | 669 · 745 | 598 · 659 | **+11.9% · +13.1%** |
| Cold open → first frame (OS-measured) | `am start -W` | 215 · 250 | 209 · 256 | +2.9% · −2.3% |
| Scroll perf | Flashlight fps | 59.77 · 60.00 | 59.18 · 59.97 | +1.0% · +0.05% |

`firstPaint` and `fullRender` are byte-identical in 8 of 10 SDUI runs and 9 of 10 static runs; the
maximum intra-run divergence in either variant is 1ms.

### 3.3 SDUI breakdown (differences of medians)

| Phase | SDUI | static | Delta |
|---|---|---|---|
| Module eval → `appStart` | 461 | 430 | +31 |
| JSON parse (`parseEnd − payloadReceived`) | 0 | — | 0 |
| Zod (`validateEnd − parseEnd`) | 17 | — | +17 |
| View build (`firstPaint − validateEnd` / `firstPaint − appStart`) | 191 | 168 | +23 |
| **Total (`firstPaint`)** | **669** | **598** | **+71 (+11.9%)** |

Median of per-run deltas, for comparison with the above (they differ because median-of-differences
≠ difference-of-medians): parse 0ms, Zod 17.5ms, SDUI view build 211.5ms, static view build
161.5ms.

Parse is 0ms in this build because the payload is a Metro-bundled module, not a network response.

### 3.4 P7 (network-first baseline, `bench/results-p7.json`, n=10 per variant)

Not comparable to §3.1–3.3: different build, payload served over HTTP with a fixed 300ms injected
latency.

| Variant | firstPaint | interactive | fullRender | Δ fullRender vs baseline |
|---|---|---|---|---|
| baseline | 1007 · 1042 | 1005 · 1040 | 1007 · 1042 | — |
| baseline-recheck | 974 · 1030 | 972 · 1028 | 974 · 1030 | −33 (−3.3%) |
| 1 cache-first | 629 · 803 | 453 · 496 | 629 · 803 | −378 (−37.5%) |
| 2 defer below-fold | 940 · 998 | 934 · 993 | 940 · 997 | −67 (−6.7%) |
| 3 node memoization | 985 · 1043 | 982 · 1041 | 984 · 1043 | −23 (−2.3%) |
| 4 parse off JS thread | 1025 · 1042 | 1022 · 1040 | 1024 · 1042 | +17 (+1.7%) |
| 5 image preload v1 | 969 · 1048 | 965 · 1046 | 969 · 1048 | −38 (−3.8%) |
| 5b image preload v2 | 988 · 1134 | 986 · 1131 | 988 · 1133 | −19 (−1.9%) |
| 6 MessagePack | 977 · 1068 | 974 · 1065 | 976 · 1067 | −31 (−3.1%) |
| cumulative (1+2) | 622 · 706 | 465 · 502 | 621 · 706 | −386 (−38.3%) |

| Variant | decode (`parseEnd − payloadReceived`) | Zod (`validateEnd − parseEnd`) | wire bytes |
|---|---|---|---|
| baseline | 1 · 1 | 19 · 21 | 54,843 |
| 4 worklet parse | 13 · 14 | 20 · 21 | 54,843 |
| 6 MessagePack | 11 · 13 | 18 · 20 | 44,815 |
| cumulative (1+2) | 1 · 1 | 5 · 7 | 54,843 |

`opt1` `swapEnd`: 845 · 979. `opt4` runs that fell back to the JS thread: 0 of 10.

---

## 4. `tile` — composition vs composite

Source: `docs/PERF.md` §4.3. Raw per-run data for this table is **not** checked in (unlike P6/P7);
the numbers below are as recorded at measurement time. Node counts are recomputed here from the
payload files as they stand today.

| Metric | composition (`home.json`) | tile composite (`home-tile-composite.json`) | Delta |
|---|---|---|---|
| TTR — `am start -W` TotalTime | 208 · 217 | 205 · 229 | −1.4% median, +5.5% p90 |
| Full render | 587 · 620 | 604 · 640 | +2.9% median, +3.2% p90 |
| Scroll jank (% janky frames) | 0.27 · 0.27 | 0.27 · 0.27 | 0 |
| Scroll frame time p90 (ms) | 10 · 11 | 10 · 11 | 0 |

Node counts, recomputed:

| Payload | Nodes | `tile` nodes |
|---|---|---|
| `home.json` | 284 | 0 |
| `home-tile-composite.json` | 234 | 25 |

Delta: 50 nodes, 25 tile stacks collapsed. `home.json` has been 284 nodes at every commit that
touched it (`31186ed`, `e3709c1`).

`docs/PERF.md` §4.3 states these counts as 348 and 298. That is a discrepancy of +64 on both
sides; the delta (50) and the tile count (25) match.

---

## 5. Every place the code can encounter unknown input

"Unknown input" = anything whose shape or content is not guaranteed by TypeScript at the call
site: server payload, action payload, binding path, style value, event value, network response.

### 5.1 Envelope level

| Site | Trigger | Behaviour |
|---|---|---|
| `core/schema.ts:76` `parsePayload` | any non-conforming payload | returns `{success:false, error}`; never throws |
| `core/schema.ts:24-27` | action `type` is `z.string()`, not the literal union | unknown action types **parse successfully**, so they fail at dispatch, not at node validation |
| `core/schema.ts:38` | `visibleIf` is `z.unknown()` | operator grammar is not checked here; `predicate.ts` is the enforcement point |
| `core/resolvePayload.ts:37-43` | malformed envelope | warns, returns bundled last-known-good, `degraded: true` |
| `core/resolvePayload.ts:45-50` | `minClientSchemaVersion` > `CLIENT_SCHEMA_VERSION` (`1.1.0`) | warns, returns bundled last-known-good, `degraded: true` |
| `core/resolvePayload.ts:55-63` | the last-known-good itself fails to parse | **throws** — the one deliberate throw in core, labelled a build-time bug |
| `App.tsx:108-116` | network fetch/decode failure (P7 builds) | logs `SDUI_P7_FETCH_ERROR`, renders an error view |
| `perf/offThreadParse.ts:38,69` | worklet runtime unavailable or throws | falls back to a JS-thread parse, sets `opt4FellBackToJsThread`, logs `SDUI_OPT4_FALLBACK` |

### 5.2 Node level

| Site | Trigger | Behaviour |
|---|---|---|
| `core/registry.ts:16-19` | type not registered | warns, returns `undefined` |
| `core/registry.ts:21-29` | type known, `typeVersion` not | warns, returns the **highest known version** of that type |
| `core/SDUINode.tsx:185-187` | registry returned `undefined` | `renderDegraded("unknown component type")` |
| `core/SDUINode.tsx:190-207` | props fail the component's Zod schema | replaces each failing key that has a registered default, re-parses; if any failing key has no default → `renderDegraded("required prop failed validation")`; if the second parse still fails → `renderDegraded("props failed validation after applying defaults")` |
| `core/SDUINode.tsx:86-109` | component throws during render | error boundary → `renderDegraded("threw at render")` |
| `core/SDUINode.tsx:74-84` | any of the above | warns, then: `node.fallback` subtree → else a dev placeholder → else `null` in release |
| `core/SDUINode.tsx:175-177` | `visibleIf` evaluates false | renders `null` |

### 5.3 Binding level (`core/bindings.ts`)

| Site | Trigger | Behaviour |
|---|---|---|
| `:46` | empty path (`{{}}`) | warns, `undefined` |
| `:56` | root is not `state`/`data`/`event` | warns, `undefined` |
| `:62` | path walks through `null`/`undefined` | warns, `undefined` |
| `:70` | path resolves to `undefined` | warns, `undefined` |
| `:89-92` | interpolated binding inside a string resolves to `undefined` | substitutes the **empty string**, does not warn a second time |

A prop that resolves to `undefined` then meets the node-level Zod check in §5.2, which supplies the
registered default or degrades the node.

### 5.4 Predicate level (`core/predicate.ts`)

| Site | Trigger | Behaviour |
|---|---|---|
| `:14-17` | `visibleIf` is not an object | warns, returns **false** (node hidden) |
| `:65-66` | operator key is outside `eq neq gt lt gte lte in exists and or not` | warns, returns **false** (node hidden) |
| `:48` | `in`'s haystack does not resolve to an array | treated as an empty list → false |

No `eval`, no `new Function`, no dynamic dispatch on the operator key — the operator set is a fixed
`if` chain, so an unrecognised key cannot reach any code path.

### 5.5 Style/token level (`core/theme.ts`)

| Site | Trigger | Behaviour |
|---|---|---|
| `:48` | style value is not a string | warns, key **dropped** |
| `:52` | value matches `^#`, `^rgb`, or `^\d+$` (raw hex/rgb/number) | warns, key dropped |
| `:58` | token reference is in the wrong category (e.g. `color.*` where `space.*` expected) | warns, key dropped |
| `:64` | category is right, token name unknown | warns, key dropped |
| `:83-87` | `borderWidth`, `opacity`, `flex`, `width`, `height` | **raw pass-through, no token check, no warning** |

### 5.6 Action level (`core/actions.ts`)

| Site | Trigger | Behaviour |
|---|---|---|
| `:121` | action `type` outside the 7 known types | warns, no-op |
| `:86` | `navigate` with no `effects.onNavigate` | warns, no-op |
| `:108` | `track` with no `effects.onTrack` | warns, no-op |
| `:116` | `refresh` with no `effects.onRefresh` | warns, no-op |
| `:95` | `Linking.openURL` rejects | warns, no-op |
| `:77` | a `sequence` member throws | warns, **continues with the remaining members** |

### 5.7 Build time

| Site | Trigger | Behaviour |
|---|---|---|
| `scripts/validate-payloads.test.ts` (`npm run validate`) | any `payloads/*.json` with an unknown type without a `fallback`, a failing prop, an unknown `visibleIf` operator, a raw value in a token-only style slot, an unknown token, a duplicate node id, or an unknown action type | prints a per-file report, **nonzero exit** |
| same, `EXPECTED_ERRORS` | `home-unknown.json` is expected to produce exactly 1 error | the run fails if the count differs **in either direction** |

### 5.8 Warning sink

All of the above route through `warn(source, message)` in `src/sdui/utils/devLog.ts`, which
appends to an in-memory array always and `console.warn`s only under `__DEV__`.
`src/sdui/screens/DebugOverlay.tsx` renders that array; `SDUIScreen` clears it each render, so the
overlay shows the last render only.

---

## 6. Test and tooling counts

| | |
|---|---|
| Test suites / tests | 40 / 296 |
| Payload fixtures | 7 (`home`, `home-unknown`, `home-too-new`, `home-tile-composite`, `car-card-versions`, `pdp`, `listing`) |
| `npm run validate` | 8 assertions (7 payloads + envelope pass) |
| Raw benchmark runs checked in | 120 (20 in `results.json`, 100 in `results-p7.json`) |
| Release APKs built | 11 (`bench/apks/`) |
