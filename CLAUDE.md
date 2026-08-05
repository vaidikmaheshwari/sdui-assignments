# CLAUDE.md — Context & Rules

> This file briefs any AI agent working in this repo. It is committed deliberately: the assignment grades the context files I wrote to direct my tools. Kept in sync with `docs/SCHEMA.md` — if they disagree, SCHEMA wins.

## Project
Server-Driven UI system for a Cars24-style mobile app. The server sends a JSON tree; the client renders native views. Changing JSON changes the app with no release.

**Stack:** React Native (Expo, prebuild) + TypeScript + Zod.
**Approved runtime deps:** `zod`, `@shopify/flash-list`, `@gorhom/bottom-sheet`, `expo-image`, `react-native-reanimated` (header collapse only). Anything else, ask first.

**Reference screen:** Cars24 Android home. Full section inventory in `docs/SCHEMA.md` §13.

**Non-negotiable goal:** the renderer must render a Cars24 screen it has never seen, from JSON alone. Anything that couples the renderer to the home page is a bug.

## Prime directive
> If a change makes the home page nicer but a hypothetical new screen harder, **reject it**.

## Architecture rules

1. **Three component tiers.**
   - Layout primitives: `stack`, `zstack`, `rail`, `grid`, `sticky`, `spacer`, `divider`
   - Atoms: `text`, `image`, `icon`, `button`, `chip_group`, `badge`, `input`, `rating`, `accordion`
   - Composites: admitted only by ≥2 usages across ≥2 screens **or a measured perf win**. Flag before adding one; never add one unilaterally.
2. **The renderer knows nothing about cars.** No domain words (`car`, `emi`, `challan`, `fastag`, `tile`) anywhere in `src/sdui/core/**`. Domain lives in payloads and in composite components only.
3. **Home sections 1, 2, 3, 4 and 6 are one pattern in five skins.** Buy car, Sell your car, Get loans, Car check services, Manage your vehicle differ only in tokens and container (`rail` vs `grid`). If you write five different node structures for them, you have misunderstood the system — stop and tell me.
4. **Sections 1, 5, 6, 8, 10 share one section-header shape** (title + optional badge + optional right link). Same node shape every time. It stays composition; there is no `section_header` composite.
5. **Rendering is pure:** `render(node, {state, data}) → view`. No fetching, no side effects inside components. Side effects only via dispatched Actions.
6. **Every node is addressable by `id`.** Used for memoization, analytics, action targeting.
7. **`style` may reference design tokens only.** No raw hex, no raw px in payloads. Unknown token → default + warn.
8. **`visibleIf` uses a whitelisted operator set** (`eq neq gt lt gte lte in exists and or not`). **Never** implement `eval`, `new Function`, or import JsonLogic — a server payload must not be able to execute arbitrary code on device. Unknown operator → hide node + warn.
9. **Failure is always node-local.** Unknown type, failed prop validation, or bad binding renders the node's `fallback`, else a labelled dev placeholder — never throw, never blank the page. Every node wrapped in an error boundary.
10. **Actions are data.** `set_state | navigate | open_sheet | open_url | sequence | track | refresh`, dispatched to a reducer over page-local state. Unknown action type → no-op + warn.
11. **Bottom sheets, modals and tooltips are SDUI trees**, delivered inside the action payload. There must be no bespoke sheet component in this repo.
12. **Component contract is the single source of truth.** Every component registers `{ type, typeVersion, propsSchema (Zod), defaults, Component }`. `registry.manifest.json` is *generated* from the registry — never hand-edited.
13. **The header collapse is a declared client-owned boundary** (`docs/SCHEMA.md` §4.4). Header *content* is SDUI; the scroll-linked animation is native. Do not try to make it declarative.

## Code rules
- TypeScript strict. No `any` in `src/sdui/**`. Payload input is `unknown` until Zod-parsed.
- Every new component: register it, export its Zod schema, regenerate the manifest, add a payload fixture.
- One component per file. Small files.
- Lists virtualize with FlashList. No `.map()` over long arrays.
- Images through `expo-image`, honouring the `preload` prop.

## Performance rules
- The static twin must use the **same** components and the **same** images as the SDUI version. A rigged comparison is worse than no comparison.
- Measure in **release** builds only, on one physical Android device for the whole table. Report **median and p90 over ≥10 cold starts**, never a best run.
- Every optimisation gets a before/after number in `PERF.md`, including ones that regressed.
- The `tile` composition-vs-composite question (`docs/SCHEMA.md` §4.3) is decided by measurement, not preference. Give me numbers; I make the call.

## Working style with me
- **Propose the design before writing code** for anything touching the schema, registry, or action system. One short paragraph of options + trade-offs, then wait.
- Do **not** invent schema fields. `docs/SCHEMA.md` is the spec; if something is missing, ask.
- Small diffs, one concern per change.
- After each change, tell me exactly what to run to verify it and what I should see.
- Do not write README/PERF/COVERAGE/AI_WORKFLOW unless I explicitly ask — I write the narrative, you supply verified facts.
- If I ask for something that hurts the prime directive, say so before complying.

## Commit convention
`type(scope): summary` — e.g. `feat(registry): add zstack for overlay banners`.
One logical change per commit. Never batch unrelated work.

## Definition of done for any task
1. Compiles; `tsc --noEmit` and lint clean.
2. `npm run validate` passes on all payloads.
3. A payload fixture exercises the new behaviour.
4. Unknown-input path tested (bad type / bad props / missing binding).
5. I can explain every line of it out loud.
