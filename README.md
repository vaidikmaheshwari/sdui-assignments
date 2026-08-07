# Cars24 SDUI — React Native

A server-driven UI system: the server sends a JSON tree, the client renders native views. Change
the JSON, the page changes on every device, no app release.

The thing I was actually trying to build is not a home screen. It is a renderer that can draw a
Cars24 screen it has never seen. Everything below is organised around that, and the honest measure
of whether it worked is in [`docs/COVERAGE.md`](docs/COVERAGE.md): **91% of surfaces across three
screens render from JSON alone**, where two of the three screens were written after the renderer
was frozen.

| Document | What's in it |
|---|---|
| [`docs/SCHEMA.md`](docs/SCHEMA.md) | The spec. The schema is the deliverable; this is it. |
| [`docs/COVERAGE.md`](docs/COVERAGE.md) | What generalises, measured against two unseen screens. |
| [`docs/PERF.md`](docs/PERF.md) | SDUI vs. a static twin, and six optimisations including three that lost. |
| [`AI_WORKFLOW.md`](AI_WORKFLOW.md) | How I drove the AI, what I threw away, and where it took me somewhere wrong. |
| [`docs/FACTS.md`](docs/FACTS.md) | Raw derived facts — component table, node counts, every degradation path. |
| [`docs/ai-log.md`](docs/ai-log.md) | The contemporaneous log the AI_WORKFLOW stories are drawn from. |

---

## The screen I picked, and why

**The Cars24 Android home/landing page**, audited in the app (Bhilwara, Aug 2026) and inventoried
section-by-section in [`docs/SCHEMA.md`](docs/SCHEMA.md) §13.

I picked it because it is the screen most likely to expose a renderer that is secretly hardcoded.
It has twelve sections, and five of them — Buy car, Sell your car, Get loans, Car check services,
Manage your vehicle — are *the same pattern in five different skins*. A renderer that needs five
different node structures for those five sections hasn't understood the problem. In
`payloads/home.json` they are one shape, differing only in design tokens and container
(`rail` vs `grid`). Same for the section header on sections 1, 5, 6, 8 and 10: one node shape,
five uses, no `section_header` component.

It also clears the brief's complexity bar without stretching: 12 section types, horizontal rails
*and* a grid, and a real SDUI-driven interaction — the wishlisted/hot-deals chip group writes
`state.carListTab`, and a rail bound to that state swaps its contents with no client code
involved.

Then I built two more screens to test the claim — a PDP and a search/listing page — and those are
where the interesting findings are.

---

## Quick start

Requires **Node 22** (`.nvmrc`), Yarn, and Android Studio / Xcode for a device build.

```bash
nvm use                 # 22
yarn install
yarn android            # or: yarn ios  —  expo prebuild, then run on device/emulator
```

Verify the whole thing without a device:

```bash
yarn typecheck          # tsc --noEmit
yarn test               # 40 suites, 296 tests
yarn validate           # every payloads/*.json against the manifest + Zod, nonzero exit on failure
yarn generate:manifest  # regenerates registry.manifest.json from the live registry
```

`yarn validate` is the one to run after editing a payload. It reports unknown component types,
prop type and enum failures, unknown `visibleIf` operators, raw values in token-only style slots,
unknown design tokens, duplicate node ids and unknown action types — with file and node id — and
exits nonzero.

### Seeing the JSON-only edit loop

`payloads/home.json` is bundled, so the fastest demonstration is: edit it, reload, watch the page
change. To exercise the real network path instead:

```bash
node scripts/payload-server.js          # serves /home.json and /home.msgpack with 300ms latency
EXPO_PUBLIC_SDUI_OPT=cacheFirst yarn android
```

---

## Repo map

```
src/sdui/
  core/         types, schema (Zod), registry, bindings, predicate, theme,
                actions, resolvePayload, SDUINode (the renderer)
  components/
    layout/     stack zstack rail grid sticky spacer divider
    atoms/      text image icon button chip_group badge input rating accordion
    composites/ car_card@1 car_card@2, tile
  screens/      SDUIScreen, CollapsingHeader, DebugOverlay
  tests/        mirrors the above, plus tests/payloads/*
src/screens/    StaticHome.tsx — the hardcoded twin, for the perf comparison
src/perf/       markers, flags and the P7 optimisation implementations
payloads/       home, home-unknown, home-too-new, home-tile-composite,
                car-card-versions, pdp, listing
scripts/        manifest generator, payload validator, benchmark drivers, payload server
bench/          120 raw benchmark runs + the release APKs they were measured on
```

**No file under `src/sdui/core/` contains the words car, EMI, challan, fastag or tile.** That is a
grep, not an aspiration — domain vocabulary lives in payloads and in the two composite components
that are taxed for it.

---

## Architecture

One pass, per node, in a fixed order:

```
payload (unknown)
  → parsePayload            Zod; returns a result, never throws
  → resolvePayload          version gate; falls back to bundled last-known-good
  → SDUIScreen              page-local state + dispatch + the sheet host
      → SDUINode (per node)
          visibleIf         closed operator set → hide on anything unrecognised
          bindings          {{state.x}} {{data.y[state.z]}} $event.value → missing = warn + default
          registry.resolve  (type, typeVersion) → definition, or the highest known version
          propsSchema       Zod → patch defaults for failures → degrade if unrecoverable
          theme             style tokens only → drop + warn on a raw value
          <Component/>      wrapped in an error boundary
```

Every branch that meets something it doesn't recognise degrades *that node* and keeps rendering.
There are 34 such branches at runtime; they are enumerated with file and line in
[`docs/FACTS.md`](docs/FACTS.md) §5. The only deliberate `throw` in the whole of `core/` is for a
bundled last-known-good payload that itself fails to parse — a build error, not a runtime one.

**Three component tiers**, with different admission rules:

| Tier | Count | Rule |
|---|---|---|
| Layout primitives | 7 | Structure only. Zero domain knowledge. |
| Atoms | 9 | Content only. Zero domain knowledge. |
| Composites | 2 types / 3 registrations | Admitted only on ≥2 usages across ≥2 screens, or a measured perf win. |

The composite bar is deliberately painful, because every composite is coverage debt: it renders
one thing beautifully and nothing else. `car_card` earned it (7 usages across 2 screens). `tile`
did not — see below.

**Actions are data.** Seven types (`set_state`, `navigate`, `open_sheet`, `open_url`, `sequence`,
`track`, `refresh`) dispatched into a reducer over page-local state. Unknown type → no-op and
warn. Host effects (`onNavigate`, `onTrack`, `onRefresh`, `onOpenUrl`) are injected by the app, so
`core/` never imports a navigation or analytics library.

**Bottom sheets are SDUI trees**, delivered inside `open_sheet`'s payload and rendered through the
same `SDUINode`. There is no sheet component in this repo, which is why a sheet's bindings resolve
against the same live page state its opener is mutating — the PDP's price-breakup sheet re-reads
the tenure you picked in the calculator behind it.

---

## Schema design rationale

The decisions I'd defend in a review, and the reasoning behind each:

**`data` and `state` are separate.** `data` is server truth and never mutates on device. `state`
is page-local, and `set_state` is the only writer. That split is what makes a tab switch, a
tenure selector and an accordion the same mechanism — and it means a re-render never has to ask
whether a value came from the server or the user.

**Bindings are a path grammar, not an expression language.** `{{data.emiByTenure[state.tenure].monthly}}`
resolves; `{{price * 0.8}}` does not, and never will. EMI maths lives on the server as a lookup
table. The moment a payload can compute, a payload can compute something you didn't intend.

**`visibleIf` is a closed operator set** — `eq neq gt lt gte lte in exists and or not` — evaluated
by a fixed `if` chain in `core/predicate.ts`. No `eval`, no `new Function`, no JsonLogic. An
unrecognised operator hides the node and warns; it cannot reach a code path, because there is no
code path to reach. This is the one design decision I'd refuse to trade for expressiveness: a
server payload must not be able to execute arbitrary code on a user's phone.

**`style` references design tokens only.** `"padding": "space.md"`, not `16`; `"background":
"color.tileBlue"`, not `"#E8F0FE"`. A raw value is dropped with a warning. This is what lets a
theme change ship without touching a single payload. (Known exception, documented rather than
hidden: `width`, `height`, `opacity`, `flex` and `borderWidth` are raw pass-throughs — see
Trade-offs.)

**Failure is always node-local.** Unknown type, failed props, bad binding, or a component that
throws: render the node's inline `fallback`, else a labelled dev placeholder, else nothing. Never
throw, never blank the page. `payloads/home-unknown.json` proves both halves — one unknown type
*with* a fallback, one *without* — and a test asserts the sections either side of both still
render.

**Every node has a stable `id`.** Memoization key, analytics target, `refresh` target, and the
thing that makes a validator's error message actionable.

**The registry is the single source of truth.** Every component registers
`{type, typeVersion, propsSchema, defaults, Component}`, and `registry.manifest.json` is
*generated* from it. There is no second list of components anywhere that could drift. The manifest
is also the only input I allowed myself when writing the two unseen screens.

---

## Versioning story

The core idea: **the server sends one payload to everyone.** No server-side version branching, no
per-client tailoring. Five mechanisms carry it, each with a fixture that exercises it:

| # | Mechanism | Proof |
|---|---|---|
| 1 | **Inline `fallback`** — the primary tool. Server sends `video_banner` with a `zstack` fallback inside it; new clients get video, old clients get the layered banner. | `payloads/home-unknown.json` |
| 2 | **Additive props are free.** A new optional prop with a default never needs a version bump. | `deferred` was added in P7 and every existing payload stayed valid, unchanged |
| 3 | **`typeVersion` coexists.** Retyping or removing a prop needs a new version; both stay registered through the migration. `car_card@1` (flat `price`/`emi`) and `car_card@2` (nested `priceLine`) are both live, and `pdp.json` renders both **in the same rail**. | `payloads/car-card-versions.json`, `payloads/pdp.json` |
| 4 | **Unknown `typeVersion` falls back to the highest known.** A payload asking for `car_card@3` renders with `@2` and warns. | `car-card-versions.json` requests `@3` |
| 5 | **`minClientSchemaVersion` is the kill switch.** A payload needing more than the client advertises (`1.1.0`) is refused, and the bundled last-known-good renders instead, with the reason logged. | `payloads/home-too-new.json` (`9.9.9`) |

The last-known-good payload is bundled in the app and does triple duty: version-gate floor,
cold-start cache (P7 item 1, −378ms) and the offline story. One mechanism, three benefits.

A dev-only debug overlay (`src/sdui/screens/DebugOverlay.tsx`) lists every degradation from the
last render — unknown types, failed props, missing bindings — which is how you see any of this
happening on device.

---

## Performance

Full methodology, all six optimisations and every regression: [`docs/PERF.md`](docs/PERF.md).
Release builds, one physical Android device (CPH2717) for the entire table, n=10 cold starts per
variant, median and p90, raw runs checked into `bench/`.

The static twin (`src/screens/StaticHome.tsx`) calls the *same* component functions with the same
images and the same props, hardcoded — no parse, no registry, no bindings, no Zod. It is not a
simplified screen built to lose.

| Metric | SDUI | static | Overhead |
|---|---|---|---|
| TTR (above the fold) | 669ms | 598ms | **+11.9%** |
| TTI (scrollable/tappable) | 482ms | 431ms | **+11.8%** |
| Full page | 669ms | 598ms | **+11.9%** |
| Scroll (fps) | 59.77 | 59.18 | none measurable |

The 71ms decomposes: **31ms module eval, 17ms Zod, 23ms view build.** The largest line isn't the
SDUI machinery — it's building the registry before React mounts. Zod, the part that sounds
expensive, is 17ms.

Then I optimised and re-measured. Two wins shipped (cache-first −378ms, defer below-fold −67ms;
together **−38.3%**). Three lost — parse-off-thread, image preload, MessagePack — and one landed
inside a 33ms noise floor I established by re-measuring the baseline at the end of the session.
The losses are written up at the same length as the wins, because the one that *looked* fine on
its median and was catastrophic in its distribution is the most useful thing I learned all week.
That story is in [`AI_WORKFLOW.md`](AI_WORKFLOW.md).

### The `tile` question, resolved by measurement

`docs/SCHEMA.md` §4.3 deliberately left `tile` undecided, with a rule set in advance: *if
composition costs less than 10% on both metrics, composition wins and `tile` is never admitted.*

Measured: composition 587ms full render vs. composite 604ms — composition was **2.9% faster**,
with identical scroll jank. Collapsing 75 composed nodes into 25 composite ones bought nothing.
**`tile` is not admitted**, and the component stays in the repo unused, as the evidence.

---

## Trade-offs, and what I cut

- **One platform, deeply.** React Native only. The brief offers a second platform as a bonus; a
  shallow second implementation would have cost me the generalization proof, which is 20%.
- **The collapsing header is a declared client-owned boundary** (SCHEMA §4.4). Header *content* is
  SDUI; the scroll-linked animation is native. Expressing per-frame scroll interpolation
  declaratively is a research project, not a weekend. I'd rather name the boundary than pretend
  it isn't there.
- **No animation DSL, no server-driven navigation graph, no A/B engine.** All listed as non-goals
  in SCHEMA §11 with the cost of adding each one later.
- **`width`/`height`/`opacity`/`flex`/`borderWidth` bypass the token check.** `zstack` positions
  its children absolutely and therefore needs real dimensions, so these five keys pass through
  raw. This contradicts the "tokens only" rule as written, and I've left it recorded in
  COVERAGE §8 rather than quietly deleting the rule.
- **`car_card` exists but `home.json` doesn't use it.** The home payload composes its car cards
  from primitives, and it was already benchmarked and committed that way; migrating it would have
  invalidated the perf table for a cosmetic tidy. `pdp.json` and `listing.json` use the composite.
- **Cut, with a note rather than shipped badly:** a `banner_carousel` component that SCHEMA §4.3
  lists as admitted and that I never built.

---

## Known gaps

Written down because a README that only lists what works is a sales document:

1. **The demo app renders `home.json` only.** `pdp.json`, `listing.json`, `home-unknown.json` and
   `home-too-new.json` are exercised by tests, not reachable by tapping. There's no payload
   switcher yet.
2. **`App.tsx` wires no `effects`,** so the 76 `navigate` actions across the three screens no-op
   on tap. The renderer dispatches them correctly; the host app just doesn't listen yet.
3. **The manifest has no `events` field.** Emitted event names (`onTap`, `onSelect`, `onToggle`)
   exist only as string literals inside each component. Adding them means adding `events` to
   `ComponentDefinition`, which changes the registry contract.
4. **`CLIENT_SCHEMA_VERSION` reads `1.1.0`** while SCHEMA documents `deferred` as a 1.1.1 addition.
   Harmless — the field is additive and optional — but the numbers disagree.
5. **No CI.** `yarn validate` is written to be a CI gate (readable errors, nonzero exit) and isn't
   wired to one.
6. **The §4.3 tile benchmark's raw runs aren't checked in,** unlike P6's and P7's. Rerun
   `scripts/benchmark-tile.sh` to reproduce.
