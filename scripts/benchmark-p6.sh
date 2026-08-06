#!/usr/bin/env bash
# P6 static-twin-vs-SDUI benchmark (docs/PROMPTS.md P6). Drives N cold starts of an installed
# release APK, collects the 7 performance.now() markers from src/perf/benchmarkMarkers.ts via
# logcat, measures scroll jank with Flashlight, and appends every raw run to bench/results.json.
# Does not write PERF.md — numbers only.
#
# Prerequisites (not installed by this script):
#   - adb on PATH, device connected, release APK already built for one variant
#     (EXPO_PUBLIC_SDUI_PAYLOAD=composition|tile-composite|static, see App.tsx)
#   - Flashlight CLI (`curl https://get.flashlight.dev | bash`) on PATH. Verified against a real
#     device (2026-08-06): `flashlight measure --bundleId/--duration/--resultsFilePath`, as
#     originally written here from docs memory, does not exist — `measure` takes no such flags at
#     all (it's the interactive live-report mode). The scriptable command is `flashlight test
#     --bundleId <id> --testCommand <script> --iterationCount <n> --resultsFilePath <path>`; its
#     results JSON is `{name, status, iterations: [{time, startTime, status, measures: [{cpu,
#     fps, ram, time}]}]}` — a flat numeric `fps` per sample, no separate `jsFps` field. This is
#     exactly the AI-failure-story the P6 gate asks for; recorded here rather than papered over.
#     scripts/p6-scroll-flow.sh is the testCommand: launches the activity and does the same
#     8-swipe pattern scripts/benchmark-tile.sh uses.
#   - node (>=22, per package.json) on PATH, used only to assemble bench/results.json safely.
#
# Usage: scripts/benchmark-p6.sh <apk-path> <variant-label> [n]
#   variant-label should be one of: composition | tile-composite | static
#   (must match how the APK was actually built — this script has no way to verify that)
set -euo pipefail

APK_PATH="$1"
VARIANT="$2"
N="${3:-10}"
PKG="com.vaidik.sduiassignments"
ACTIVITY="$PKG/.MainActivity"
RESULTS_JSON="bench/results.json"
FLASHLIGHT_DIR="bench/flashlight"
mkdir -p "$FLASHLIGHT_DIR"

MARKER_NAMES=(appStart payloadReceived parseEnd validateEnd firstPaint interactive fullRender)

echo "== $VARIANT: installing $APK_PATH ==" >&2
adb install -r "$APK_PATH" >&2

RUNS_FILE=$(mktemp)
trap 'rm -f "$RUNS_FILE"' EXIT

for i in $(seq 1 "$N"); do
  adb shell am force-stop "$PKG"
  sleep 1
  adb logcat -c

  device_epoch_before=$(adb shell date +%s%3N | tr -d '\r')

  start_output=$(adb shell am start -W -n "$ACTIVITY")
  total_time=$(echo "$start_output" | grep '^TotalTime:' | awk '{print $2}' | tr -d '\r')

  # Poll logcat until fullRender shows up (bounded wait) — every other marker fires before it,
  # so this doubles as the wait for the whole marker set to be present.
  for _ in $(seq 1 40); do
    if adb logcat -d | grep -q 'SDUI_MARK_fullRender'; then
      break
    fi
    sleep 0.2
  done

  logcat_dump=$(adb logcat -d)

  # Build the markersMs JSON object directly: each value is either an integer delta or the
  # bare token null, both valid unquoted JSON — no need to round-trip through another process.
  deltas_json="{"
  first=true
  for name in "${MARKER_NAMES[@]}"; do
    line=$(echo "$logcat_dump" | grep "SDUI_MARK_${name} " | tail -1 || true)
    if [ -n "$line" ]; then
      epoch=$(echo "$line" | grep -o "SDUI_MARK_${name} [0-9]*" | awk '{print $2}')
      value=$((epoch - device_epoch_before))
    else
      value="null"
    fi
    $first || deltas_json+=","
    first=false
    deltas_json+="\"${name}\":${value}"
  done
  deltas_json+="}"
  full_render_ms=$(node -e "console.log(JSON.parse(process.argv[1]).fullRender)" "$deltas_json")
  interactive_ms=$(node -e "console.log(JSON.parse(process.argv[1]).interactive)" "$deltas_json")

  echo "run $i [$VARIANT]: TotalTime=${total_time}ms fullRender=${full_render_ms}ms interactive=${interactive_ms}ms" >&2

  node -e '
    const [variant, run, totalTime, deltasJson] = process.argv.slice(1);
    process.stdout.write(JSON.stringify({
      variant,
      run: Number(run),
      ttrTotalTimeMs: totalTime === "" ? null : Number(totalTime),
      markersMs: JSON.parse(deltasJson),
      jank: null,
    }) + "\n");
  ' "$VARIANT" "$i" "$total_time" "$deltas_json" >> "$RUNS_FILE"
done

# Scroll jank: one `flashlight test` invocation covering N iterations, run after the marker loop
# (not interleaved per-run — `flashlight test` owns its own force-stop/launch cycle via
# scripts/p6-scroll-flow.sh as its --testCommand). Iteration i's jank is matched back into run i's
# record by index — they are separate cold starts from the marker loop's runs, not the same one.
FLASHLIGHT_JSON="$FLASHLIGHT_DIR/${VARIANT}.json"
set +e
flashlight test \
  --bundleId "$PKG" \
  --testCommand "$(dirname "$0")/p6-scroll-flow.sh" \
  --iterationCount "$N" \
  --duration 4000 \
  --resultsFilePath "$FLASHLIGHT_JSON" \
  --resultsTitle "$VARIANT scroll jank"
flashlight_status=$?
set -e
if [ "$flashlight_status" -ne 0 ]; then
  echo "  [warn] flashlight test exited non-zero — jank fields will be null for this variant" >&2
fi

node -e '
  const fs = require("fs");
  const path = process.argv[1];
  if (!fs.existsSync(path)) { process.exit(0); }
  const data = JSON.parse(fs.readFileSync(path, "utf8"));
  const perIteration = (data.iterations || []).map((it) => {
    const fpsVals = (it.measures || []).map((m) => m.fps).filter((v) => typeof v === "number");
    const avg = fpsVals.length ? fpsVals.reduce((a, b) => a + b, 0) / fpsVals.length : null;
    return { status: it.status, fpsAverage: avg };
  });
  fs.writeFileSync(process.argv[2], JSON.stringify(perIteration));
' "$FLASHLIGHT_JSON" "$FLASHLIGHT_JSON.perIteration.json"

# Merge this variant's runs into bench/results.json (append, don't clobber other variants' runs).
# Attach jank[i] (from the separate flashlight test invocation above) to run i by index — see the
# comment above the flashlight invocation for why these are matched by index, not the same run.
node -e '
  const fs = require("fs");
  const path = "'"$RESULTS_JSON"'";
  const perIterationPath = process.argv[2];
  const jankByIndex = fs.existsSync(perIterationPath)
    ? JSON.parse(fs.readFileSync(perIterationPath, "utf8"))
    : [];
  const existing = fs.existsSync(path) ? JSON.parse(fs.readFileSync(path, "utf8")) : [];
  const incoming = fs
    .readFileSync(process.argv[1], "utf8")
    .split("\n")
    .filter(Boolean)
    .map((line, idx) => {
      const run = JSON.parse(line);
      run.jank = jankByIndex[idx] ?? null;
      return run;
    });
  fs.writeFileSync(path, JSON.stringify(existing.concat(incoming), null, 2) + "\n");
  console.log(`wrote ${incoming.length} runs to ${path} (${existing.length + incoming.length} total)`);
' "$RUNS_FILE" "$FLASHLIGHT_JSON.perIteration.json"

echo ""
echo "=== $VARIANT (n=$N) — median / p90, from bench/results.json ==="
node -e '
  const fs = require("fs");
  const all = JSON.parse(fs.readFileSync("'"$RESULTS_JSON"'", "utf8"));
  const runs = all.filter((r) => r.variant === "'"$VARIANT"'");
  const metrics = ["appStart", "payloadReceived", "parseEnd", "validateEnd", "firstPaint", "interactive", "fullRender"];
  function pct(vals, p) {
    const sorted = vals.slice().sort((a, b) => a - b);
    if (sorted.length === 0) return null;
    const rank = Math.ceil((p / 100) * sorted.length) - 1;
    return sorted[Math.max(0, Math.min(rank, sorted.length - 1))];
  }
  for (const m of metrics) {
    const vals = runs.map((r) => r.markersMs[m]).filter((v) => v !== null && v !== undefined);
    if (vals.length === 0) {
      console.log(`${m}: N/A (never logged for this variant)`);
      continue;
    }
    console.log(`${m}: median=${pct(vals, 50)}ms p90=${pct(vals, 90)}ms (n=${vals.length}/${runs.length})`);
  }
  const ttr = runs.map((r) => r.ttrTotalTimeMs).filter((v) => v !== null);
  if (ttr.length) console.log(`ttrTotalTime (am start -W): median=${pct(ttr, 50)}ms p90=${pct(ttr, 90)}ms`);
  const fps = runs.map((r) => r.jank && r.jank.fpsAverage).filter((v) => typeof v === "number");
  if (fps.length) console.log(`flashlight fpsAverage: median=${pct(fps, 50)} p90=${pct(fps, 90)} (n=${fps.length}/${runs.length})`);
  else console.log("flashlight fpsAverage: N/A — check bench/flashlight/*.json and the extraction logic in this script");
'
