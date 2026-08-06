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
