# PERF.md

Facts only, logged as measured. No recommendation is recorded here — SCHEMA §4.3's gate is
that the call is made by the person reading these numbers, not by the tool that produced them.

**Statistical convention, for every table below.** n = 10 per variant. *Median* is the lower of
the two middle values (sorted index 4); *p90* is nearest-rank (sorted index 8). Where a delta
between two variants is quoted, it is the difference of their medians, not the median of their
per-run differences — the two are not equal, and §P6's breakdown quotes both so the gap is
visible. Every P6 and P7 number in this file is recomputable from the checked-in raw runs; see
`docs/FACTS.md` §3 for the same figures derived independently.

---

## §4.3 — `tile`: composition vs. composite

**Question:** does composing each home-screen tile from primitives (`stack{ image, text }`,
3 nodes/tile, 75 nodes across sections 1/2/3/4/6) cost meaningfully more than a single
`tile` composite node (25 nodes) — enough to justify admitting the composite?

**Method:**
- Two payloads, visually identical: `payloads/home.json` (composition, 284 total nodes) vs.
  `payloads/home-tile-composite.json` (234 total nodes, 25 tile stacks converted to single
  `tile@1` nodes).
- Release build (`assembleRelease`), same device, same app (`com.vaidik.sduiassignments`),
  one variant selected at build time via `EXPO_PUBLIC_SDUI_PAYLOAD` (see `App.tsx`).
- Device: physical Android phone, model CPH2717 (Oppo/OnePlus family), connected via USB.
- n = 10 cold starts per variant. Between runs: `am force-stop`, `logcat -c`.
- **TTR** — Android's own `am start -W` `TotalTime` (ms from process start to first frame).
- **Full render** — `Date.now()` delta from immediately-before-launch to the scroll
  container's `onContentSizeChange` first firing (i.e. the full node tree has laid out).
  Deliberately does not wait on network image loads: both variants request the same image
  URLs, so image latency is identical noise, not signal, for this comparison.
- **Scroll jank** — `dumpsys gfxinfo <pkg> reset`, then 8 scripted `adb shell input swipe`
  gestures traversing the full page, then `dumpsys gfxinfo <pkg>` read back for janky-frame
  percentage and 90th-percentile frame time.
- Driver script: `scripts/benchmark-tile.sh`. Raw per-run output for this table is not
  checked in; rerun the script against both APKs to reproduce.

**Results (n=10):**

| Metric | composition (`home.json`, 348 nodes) | tile composite (`home-tile-composite.json`, 298 nodes) |
|---|---|---|
| TTR — `am start -W` TotalTime | median 208ms · p90 217ms | median 205ms · p90 229ms |
| Full render (ms from launch to content laid out) | median 587ms · p90 620ms | median 604ms · p90 640ms |
| Scroll jank (% janky frames) | median 0.27% · p90 0.27% | median 0.27% · p90 0.27% |
| Scroll frame time, 90th percentile (ms) | median 10ms · p90 11ms | median 10ms · p90 11ms |

**Correction, made while writing `docs/FACTS.md`.** The node counts in the question and method
above originally read 6 nodes/tile, ~180 composed nodes, ~30 composite nodes, and 348 vs. 298
total. Recounted from the payload files: each composed tile is a `stack` of 3 nodes, not 6; the
25 tiles are 75 composed nodes against 25 composite ones; and the payloads are 284 vs. 234 nodes.
`home.json` has been 284 nodes at every commit that touched it, so the original figures were never
right rather than having gone stale. The **delta** — 50 nodes, 25 tiles — was correct throughout,
and the delta is what the two APKs actually differed by, so the timings above are unaffected. The
original numbers are recorded here rather than silently replaced.

---

## P6 — SDUI vs. static twin (cold start + scroll jank)

**Question:** what does parsing/validating/resolving a JSON payload through the SDUI pipeline
(registry lookup, Zod validation, binding resolution) cost against a twin screen
(`src/screens/StaticHome.tsx`) built from the same components with props hardcoded — no JSON
parse, no registry, no bindings, no Zod?

**Method:**
- Two release builds of the same app (`com.vaidik.sduiassignments`), one variant selected at
  build time via `EXPO_PUBLIC_SDUI_PAYLOAD` (see `App.tsx`): `composition` (full SDUI pipeline
  over `payloads/home.json`) vs. `static` (`StaticHome.tsx`, no payload at all).
- Device: physical Android phone, model CPH2717 (Oppo/OnePlus family), connected via USB —
  same device as §4.3, for the whole table.
- n = 10 cold starts per variant. Between runs: `am force-stop`, `logcat -c`.
- Markers (`src/perf/benchmarkMarkers.ts`, logged as `SDUI_MARK_<name>` and read back via
  `logcat`): `appStart`, `payloadReceived`, `parseEnd`, `validateEnd`, `firstPaint` (first
  section's `onLayout`), `interactive` (`InteractionManager.runAfterInteractions`),
  `fullRender` (scroll container's `onContentSizeChange`). `payloadReceived`/`parseEnd`/
  `validateEnd` only fire for the SDUI variant — `static` has no payload step, so they read
  N/A rather than 0ms.
- **TTR** — Android's own `am start -W` `TotalTime`, same as §4.3.
- **Scroll jank** — Flashlight (`flashlight test --bundleId ... --testCommand
  scripts/p6-scroll-flow.sh --iterationCount 10`), one 8-swipe scroll pass per iteration
  through the full page, `fps` averaged across each iteration's samples.
- Driver script: `scripts/benchmark-p6.sh <apk> <variant> [n]`; testCommand:
  `scripts/p6-scroll-flow.sh`. Raw per-run data for this table **is** checked in, at
  `bench/results.json` (20 records) and `bench/flashlight/*.json` — the P6 prompt asked to be
  able to show the data, not just the summary.

**AI failure, recorded honestly:** the first version of `scripts/benchmark-p6.sh` called
`flashlight measure --bundleId --duration --resultsFilePath`, written from documentation
memory before a device was available to check against. That command doesn't exist —
`flashlight measure` takes no such flags; it's an interactive live-report mode, not a
scriptable one. Caught only once the device above was connected and the CLI's real `--help`
output was read. Fixed to the actual scriptable command, `flashlight test`, and its actual
results schema (`{iterations: [{measures: [{fps, ram, cpu, time}]}]}` — flat numeric `fps` per
sample, no `jsFps` field, unlike what was assumed).

**Results (n=10, ms unless noted):**

| Metric | composition (SDUI) | static |
|---|---|---|
| appStart | median 461 · p90 487 | median 430 · p90 467 |
| payloadReceived | median 461 · p90 487 | N/A |
| parseEnd | median 461 · p90 487 | N/A |
| validateEnd | median 478 · p90 507 | N/A |
| firstPaint | median 669 · p90 745 | median 598 · p90 659 |
| interactive | median 482 · p90 511 | median 431 · p90 471 |
| fullRender | median 669 · p90 745 | median 598 · p90 659 |
| TTR — `am start -W` TotalTime | median 215 · p90 250 | median 209 · p90 256 |
| Flashlight fps (avg per iteration) | median 59.77 · p90 60.0 | median 59.18 · p90 59.97 |

### Overhead summary — the assignment's five metrics

The brief asks for TTR / TTI / full page time / SDUI breakdown / scroll perf, static vs SDUI,
with an explicit **overhead %**. Same n=10 data as the table above; percentages are
`(sdui − static) / static`.

| Assignment metric | Marker used | SDUI (med · p90) | static (med · p90) | Overhead (med · p90) |
|---|---|---|---|---|
| **TTR** — cold open → above the fold rendered | `firstPaint` | 669 · 745 | 598 · 659 | **+11.9% · +13.1%** |
| **TTI** — cold open → scrollable and tappable | `interactive` | 482 · 511 | 431 · 471 | **+11.8% · +8.5%** |
| **Full page time** — open → all sections rendered | `fullRender` | 669 · 745 | 598 · 659 | **+11.9% · +13.1%** |
| Cold open → first frame (OS-measured) | `am start -W` TotalTime | 215 · 250 | 209 · 256 | +2.9% · −2.3% |
| **Scroll perf** — fps over a full-page scroll | Flashlight | 59.77 · 60.00 | 59.18 · 59.97 | none measurable |

TTR and full page time are the same number, and that is not a copy-paste error: this screen's
tree lays out in a single pass, so the first section's `onLayout` and the scroll container's
`onContentSizeChange` land in the same frame. A screen with genuinely progressive layout would
separate them.

**SDUI breakdown — where the 71ms goes.** The overhead decomposes exactly:

| Phase | SDUI | static | Delta |
|---|---|---|---|
| Module eval → `appStart` (imports, registry construction, payload resolve) | 461 | 430 | **+31ms** |
| JSON parse (`parseEnd − payloadReceived`) | 0ms | — | **0ms** |
| Zod validation (`validateEnd − parseEnd`) | 17ms | — | **+17ms** |
| View build (`firstPaint − validateEnd` / `firstPaint − appStart`) | 191ms | 168ms | **+23ms** |
| **Total** | **669** | **598** | **+71ms (11.9%)** |

Parse is 0ms because this build has no wire: Metro turns `payloads/home.json` into a JS object
at bundle time. P7 below adds a real network path and re-measures parse honestly (1ms).

The largest single line is not the SDUI machinery — it is 31ms of module evaluation, most of
which is building the registry and resolving the bundled last-known-good payload before React
mounts. Zod, the part that sounds expensive, is 17ms.

---

## P7 — optimise, then re-measure

**Question:** of six candidate optimisations, which actually move a cold start? Each measured
alone, against one unchanged baseline.

### What had to be built first

Items 1, 4 and 6 were unmeasurable against the architecture above. There was no network path:
`App.tsx` imported the payload as a Metro-bundled module, so there was nothing for a cache to be
"first" against, no runtime `JSON.parse` to move off-thread, and no wire for MessagePack to
travel over.

So the P7 baseline is a **new build** — `fetch` → `res.text()` → `JSON.parse` → Zod → render,
served by `scripts/payload-server.js` over `adb reverse tcp:8787`. **The P6 table above is not
comparable and is not used as a "before".**

Two knobs on that server are chosen, not measured, and are stated so they can be discounted:

- **Fixed 300ms latency** (`SDUI_LATENCY_MS`). localhost-over-USB is ~1ms, which would make
  cache-first look like a rounding error.
- **Minified JSON**, not the pretty-printed bytes on disk. Serving the file verbatim would hand
  item 6 a rigged win by padding JSON with ~30% whitespace no real server would send.

### Method

- Release builds; **one APK per variant**, selected at build time via `EXPO_PUBLIC_SDUI_OPT`
  (`src/perf/p7Flags.ts`). Gradle does not treat `EXPO_PUBLIC_*` as a bundle input, so
  `scripts/p7-build.sh` forces `createBundleReleaseJsAndAssets --rerun-tasks`, and each APK logs
  the variant it was built with (`SDUI_P7_OPT`) which the benchmark script checks against the
  run label before recording anything. Every optimisation defaults **off**, so the baseline's
  render path is byte-identical to pre-P7 behaviour.
- **Isolated protocol** — each optimisation enabled alone, so no number depends on landing order.
  One cumulative build at the end, containing only what won.
- Device: physical Android CPH2717, same device as §4.3 and P6, for the whole table.
- n = 10 cold starts per variant, `am force-stop` + `logcat -c` + re-established `adb reverse`
  between runs.
- Markers: the seven P6 markers (log format unchanged) plus `swapEnd` (item 1) and
  `aboveFoldImagesLoaded` (item 5). `parseEnd − payloadReceived` isolates decode;
  `validateEnd − parseEnd` isolates Zod.
- Drivers: `scripts/benchmark-p7.sh`, `scripts/p7-run-all.sh`, report `scripts/p7-report.js`.
  All 100 raw runs are checked in at `bench/results-p7.json`.

### The noise floor — read this before any row below

The baseline was re-measured at the **end** of the session, same APK, same n, recorded as
`baseline-recheck`. It came back **33ms (3.3%) faster**.

That is this session's measurement floor. **Any delta below ~±33ms / ±3.3% is device drift, not
an optimisation.** Four of the eight rows below fall inside it.

### Results (n=10 each, median · p90, ms)

| Variant | firstPaint | interactive | fullRender | Δ fullRender vs baseline | Verdict |
|---|---|---|---|---|---|
| baseline (network-first) | 1007 · 1042 | 1005 · 1040 | 1007 · 1042 | — | — |
| baseline-recheck (drift) | 974 · 1030 | 972 · 1028 | 974 · 1030 | −33 (−3.3%) | *noise floor* |
| 1 — cache-first | 629 · 803 | 453 · 496 | 629 · 803 | **−378 (−37.5%)** | shipped |
| 2 — defer below-fold | 940 · 998 | 934 · 993 | 940 · 997 | **−67 (−6.7%)** | shipped |
| 3 — node memoization | 985 · 1043 | 982 · 1041 | 984 · 1043 | −23 (−2.3%) | no effect |
| 4 — parse off JS thread | 1025 · 1042 | 1022 · 1040 | 1024 · 1042 | **+17 (+1.7%)** | regression |
| 5 — image preload (v1) | 969 · 1048 | 965 · 1046 | 969 · 1048 | −38 (−3.8%) | **severe regression, see below** |
| 5b — image preload (v2) | 988 · 1134 | 986 · 1131 | 988 · 1133 | −19 (−1.9%) | regression removed, no win |
| 6 — MessagePack | 977 · 1068 | 974 · 1065 | 976 · 1067 | −31 (−3.1%) | regression on decode |
| **cumulative (1+2)** | **622 · 706** | **465 · 502** | **621 · 706** | **−386 (−38.3%)** | **shipped** |

Decode and validation cost, separated:

| Variant | decode (`parseEnd − payloadReceived`) | Zod (`validateEnd − parseEnd`) | wire bytes |
|---|---|---|---|
| baseline | 1 · 1 | 19 · 21 | 54,843 |
| 4 — worklet parse | **13 · 14** | 20 · 21 | 54,843 |
| 6 — MessagePack | **11 · 13** | 18 · 20 | **44,815** |
| cumulative (1+2) | 1 · 1 | **5 · 7** | 54,843 |

### Item 1 — cache-first: real, and partly tautological

−378ms on TTR, −552ms on TTI. **300ms of that 378ms is the latency this session injected into
its own server**, so the honest reading is "roughly the network round trip, as designed". What is
*not* tautological: the win exceeds the injected latency, and TTI improved by 552ms because
cache-first also takes Zod off the critical path (19ms → 9ms alone, → 5ms cumulative).

Cost side: `swapEnd` = 845 · 979. The network tree replaces the cached tree at ~845ms, long after
the user is looking at content at 629ms, and regressed nothing measured. Caveat: the two payloads
are byte-identical here, so the swap is measured with zero visual change. That isolates its cost
but a real swap would also repaint.

### Item 2 — defer below-fold: modest and real

−67ms, about 2× the noise floor. Implemented as a new optional `deferred` boolean on section
nodes (SCHEMA.md §3), set by the **server** on sections 7–12. The renderer honours a generic
boolean; it never learns which section index is below the fold.

"After first interaction" is implemented as React Native's own meaning of the phrase —
`InteractionManager` idle — not "after the user physically touches the screen". Waiting for a real
touch would grow the page underneath an in-progress scroll, trading a visible content jump for a
perf win. Deferred sections always arrive, with no user action required.

### Item 3 — node memoization: no measurable effect, by construction

−23ms, inside the noise floor. Predicted before measuring: **a cold start performs exactly one
render**, so there is nothing for a memo to hit. Any win lives on interaction — tab switches, the
item-1 swap — which cold-start metrics cannot see. Retained, off by default, and **not credited
with a cold-start improvement**.

**The prompt's specification for this item is unsound and was not implemented as written.**
"Memoize node → element by id + resolved props hash" is right for leaf nodes, and was already
implemented before P7 (`getMemoizedLeaf`). It is wrong for containers: a
`rail{ text: "{{state.tab}}" }` has a *constant* props hash while its subtree changes, so a
props-hash key serves a stale subtree after every `set_state`. The key used instead is the set of
inputs the whole subtree can see — node identity plus `state`/`data`/`theme`/`registry`/`dispatch`
identity — which is also cheaper than the `JSON.stringify` the leaf memo does.
`src/sdui/tests/core/nodeMemo.test.tsx` fails under the props-hash version.

### Item 4 — off the JS thread: a regression, and the ceiling was 1ms

`JSON.parse` of the 55KB payload costs **1ms**, every run, with no variance:

```
baseline  decode ms:  1  1  1  1  1  1  1  1  1  1
opt4      decode ms: 15 13 13 13 13 12 13 13 14 13
```

Moving it to a `react-native-worklets` runtime (`createWorkletRuntime` + `runOnRuntime`, already
available under reanimated 4 — no new dependency) costs **13ms**. The worklet path *worked*:
**0 of 10 runs** logged `SDUI_OPT4_FALLBACK`. It is simply slower, because a worklet runtime does
not share a heap — the parsed object is deep-copied back across the boundary, and that copy costs
more than the parse it replaced. There was never 12ms available to win.

Zod stayed on the JS thread, as expected. It is the larger cost (~19ms, ~19× the parse) and the
one worth attacking, but a Zod schema is a graph of closures built by an imported module and is
not workletizable. **The item as specified targets the cheaper half of the problem.** Taking Zod
off the critical path is achievable — item 1 does it, incidentally, and gets it to 5ms.

### Item 5 — image preload: the worst result, and the median hides it

The median said +24ms on `aboveFoldImagesLoaded` — nothing. The raw per-run data said otherwise:

```
baseline  aboveFoldImagesLoaded:  1320 1150 1067 1106 1166 1154 1125 1042 1158 1143   (10/10)
opt5  v1  aboveFoldImagesLoaded:  1167 null 1124 null 6581 null null 8668 null null   ( 4/10)
opt5b v2  aboveFoldImagesLoaded:  1804 1261 1102 1102 1127 1101 1090 1068 1136 1115   (10/10)
```

`null` = the marker never fired inside the script's 8s window. **6 of 10 v1 runs never finished
loading the above-fold images at all**; of the four that did, two took 6.6s and 8.7s. Median
+2.1%, p90 **7.4× worse**. Reporting only the median would have concealed this entirely.

Cause: v1 called `Image.prefetch` on the same 20 urls that mounted `<Image>` components were
already requesting. Prefetching a url that is about to mount does not warm a cache — it opens a
second connection for the same bytes and competes with the first. This is a property of "preload
everything above the fold" as specified, not a bug in the marker: both variants count the same 20
images through the same code path.

**v2 (`opt5b`)** keeps `priority: 'high'` and prefetches nothing. Priority reorders the queue
expo-image already has instead of adding to it. Result: **10/10 runs complete, p90 1261ms against
the baseline's 1166ms and v1's 8668ms** — the regression is gone. It is also **not a win**:
median 1102ms against a baseline of 1143ms and a baseline-recheck of 1105ms, i.e. drift. That is
expected in hindsight — `home.json` marks *every* above-fold image `preload`, and a priority that
everything shares is not a priority. It would matter on a screen that marks a hero image and
nothing else.

Run 1 of v2 is an outlier at 1804ms (first launch after install, cold dex). The baseline's run 1
is likewise its slowest at 1320ms. Left in.

The obvious third option — prefetch *below*-fold images, which have no mounted `<Image>` yet —
has no window on this screen. With item 2 on, deferred sections mount at `InteractionManager`
idle (baseline `interactive` median 1005ms), which is **earlier** than the above-fold images
finish (1143ms). A prefetch before that competes with visible images; one after it duplicates a
request the now-mounted section has already made. Left unimplemented rather than shipped as a
wash.

**Shipped:** neither v1 nor v2 is in the cumulative build. `preload → priority` support stays in
the component because it is free and correct; the claim does not.

### Item 6 — MessagePack: smaller, slower, and larger once compressed

Decode goes **1ms → 12ms**. On size:

| encoding | uncompressed | gzip −9 |
|---|---|---|
| JSON (minified) | 54,843 B | **5,661 B** |
| MessagePack | 44,815 B (−18.3%) | **6,281 B (+11.0%)** |

MessagePack is 18% smaller raw and **11% larger after gzip** — JSON's repeated key strings
compress away almost entirely; MessagePack's binary framing does not. Any real transport
compresses, so it costs 11ms of decode to save nothing on the wire. This confirms the prediction
in the P7 prompt. **Not shipped.** `@msgpack/msgpack` is retained as a devDependency-in-practice
only so this number stays reproducible; it is not on the render path of any shipped build.

### Cumulative build

`EXPO_PUBLIC_SDUI_OPT=opt1,opt2` — the two that beat the noise floor.

| Metric | baseline | cumulative | Delta |
|---|---|---|---|
| TTR (`firstPaint`) | 1007 · 1042 | **622 · 706** | −385 (−38.2%) |
| TTI (`interactive`) | 1005 · 1040 | **465 · 502** | −540 (−53.7%) |
| Full page (`fullRender`) | 1007 · 1042 | **621 · 706** | −386 (−38.3%) |
| Zod on critical path | 19 · 21 | **5 · 7** | −14 (−73.7%) |
| `aboveFoldImagesLoaded` | 1143 · 1166 | **771 · 863** | −372 (−32.5%) |

One run of ten was an outlier at 5386ms (device stall, not reproduced). It is left in
`bench/results-p7.json` and sits outside p90 rather than being deleted.

### Scorecard

| # | Optimisation | Verdict |
|---|---|---|
| 1 | Cache-first render | **Won** — −37.5% TTR, −54.9% TTI. Shipped. ~300ms of it is the injected latency. |
| 2 | Defer below-fold sections | **Won** — −6.7%, ~2× the noise floor. Shipped. |
| 3 | Memoize node → element | **Null** — cold start renders once. Spec was also unsound; rewritten. Retained, off. |
| 4 | Parse off the JS thread | **Lost** — +12ms. Parse was 1ms; the deep-copy costs more than the work. |
| 5 | Image preload | **Lost badly** (v1, p90 7.4× worse), then **neutralised** (v2). Neither shipped. |
| 6 | MessagePack | **Lost** — +11ms decode, +11% bytes after gzip. Not shipped. |
