# PERF.md

Facts only, logged as measured. No recommendation is recorded here — SCHEMA §4.3's gate is
that the call is made by the person reading these numbers, not by the tool that produced them.

---

## §4.3 — `tile`: composition vs. composite

**Question:** does composing each home-screen tile from primitives (`stack{ image, text }`,
~6 nodes/tile, ~180 nodes across sections 1/2/3/4/6) cost meaningfully more than a single
`tile` composite node (~30 nodes) — enough to justify admitting the composite?

**Method:**
- Two payloads, visually identical: `payloads/home.json` (composition, 348 total nodes) vs.
  `payloads/home-tile-composite.json` (298 total nodes, 25 tile stacks converted to single
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

**Rule from SCHEMA §4.3** (quoted, not applied here): "If composition costs less than ~10%
on both metrics, it wins and `tile` is never admitted. If it is materially worse, `tile` is
admitted and the cost is recorded honestly in `COVERAGE.md`."

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
