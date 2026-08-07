#!/usr/bin/env bash
# P7 optimise-then-re-measure benchmark (docs/PROMPTS.md P7).
#
# Same cold-start pattern as scripts/benchmark-p6.sh, with four differences that P7 needs:
#   1. The payload now comes off a wire (scripts/payload-server.js over `adb reverse`), so this
#      script verifies the device can actually reach it before running. A run where the fetch
#      silently failed would fall back to the bundled last-known-good and quietly report the
#      cache-first numbers for every variant.
#   2. Two extra markers: swapEnd (item 1) and aboveFoldImagesLoaded (item 5).
#   3. It greps for SDUI_OPT4_FALLBACK, so an opt4 run that silently degraded to a JS-thread
#      parse is flagged rather than reported as "no regression".
#   4. It records SDUI_P7_OPT from logcat — the variant the APK *actually* reports — and refuses
#      to continue if that disagrees with the label passed in. Gradle's bundle task does not
#      treat EXPO_PUBLIC_* as a tracked input; the P6 session already lost a run to a stale JS
#      bundle being reused across variants (see docs/ai-log.md), so this is checked, not assumed.
#
# Prerequisites:
#   - adb on PATH, device connected, release APK built for one variant
#   - scripts/payload-server.js running on the host, and `adb reverse tcp:8787 tcp:8787` set up
#   - Flashlight CLI on PATH (only needed when RUN_FLASHLIGHT=1)
#   - node >= 22
#
# Usage: scripts/benchmark-p7.sh <apk-path> <variant-label> [n]
#   variant-label is the EXPO_PUBLIC_SDUI_OPT value the APK was built with, e.g.
#   "baseline", "opt1", "opt1,opt2,opt5".
set -euo pipefail

APK_PATH="$1"
VARIANT="$2"
N="${3:-10}"
PKG="com.vaidik.sduiassignments"
ACTIVITY="$PKG/.MainActivity"
RESULTS_JSON="bench/results-p7.json"
FLASHLIGHT_DIR="bench/flashlight"
RUN_FLASHLIGHT="${RUN_FLASHLIGHT:-0}"
# The variant the APK should report. Defaults to the run label, which is right for every normal
# run. They diverge only when the same APK is deliberately measured twice under different labels
# — the baseline drift re-check does exactly that, and tripped this guard on its first outing.
EXPECTED_OPT="${EXPECTED_OPT:-$VARIANT}"
mkdir -p "$FLASHLIGHT_DIR" "$(dirname "$RESULTS_JSON")"

MARKER_NAMES=(appStart payloadReceived parseEnd validateEnd firstPaint interactive fullRender swapEnd aboveFoldImagesLoaded)

echo "== $VARIANT: checking the device can reach the payload server ==" >&2
adb reverse tcp:8787 tcp:8787 >/dev/null
if ! adb shell "curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:8787/health" 2>/dev/null | grep -q 200; then
  # Not every device ships curl; fall back to asserting the host side is up and the reverse
  # tunnel is registered, rather than skipping the check entirely.
  if ! curl -s -o /dev/null http://127.0.0.1:8787/health; then
    echo "  [fatal] payload server is not responding on the host — start scripts/payload-server.js" >&2
    exit 1
  fi
  echo "  [warn] could not probe from the device (no curl on device?); host server is up and adb reverse is set" >&2
fi

echo "== $VARIANT: installing $APK_PATH ==" >&2
adb install -r "$APK_PATH" >&2

RUNS_FILE=$(mktemp)
trap 'rm -f "$RUNS_FILE"' EXIT

for i in $(seq 1 "$N"); do
  adb shell am force-stop "$PKG"
  sleep 1
  adb logcat -c
  # adb reverse is per-connection and does not survive a force-stop cleanly on every ROM.
  adb reverse tcp:8787 tcp:8787 >/dev/null

  device_epoch_before=$(adb shell date +%s%3N | tr -d '\r')

  start_output=$(adb shell am start -W -n "$ACTIVITY")
  # Every grep below is `|| true`-guarded on purpose. Under `set -o pipefail` a grep that finds
  # nothing returns 1 and kills the whole run with no message — which is exactly how this script
  # first died, silently, five runs into the second variant. A missing marker must degrade to an
  # empty value (reported as null, and visible as such) rather than abort a 16-minute session.
  total_time=$(echo "$start_output" | { grep '^TotalTime:' || true; } | awk '{print $2}' | tr -d '\r')

  # Wait on fullRender: every marker except aboveFoldImagesLoaded precedes it. Images are given
  # a further bounded grace period below, since they cross a real network.
  for _ in $(seq 1 60); do
    if adb logcat -d | grep -q 'SDUI_MARK_fullRender'; then break; fi
    sleep 0.2
  done
  for _ in $(seq 1 40); do
    if adb logcat -d | grep -q 'SDUI_MARK_aboveFoldImagesLoaded'; then break; fi
    sleep 0.2
  done

  logcat_dump=$(adb logcat -d)

  reported_opt=$(echo "$logcat_dump" | { grep -o 'SDUI_P7_OPT .*' || true; } | tail -1 | awk '{print $2}' | tr -d '\r')
  if [ -z "$reported_opt" ]; then
    echo "  [warn] run $i logged no SDUI_P7_OPT — treating as a dropped run, not a variant mismatch" >&2
  elif [ "$reported_opt" != "$EXPECTED_OPT" ]; then
    echo "  [fatal] APK reports SDUI_P7_OPT='$reported_opt' but expected '$EXPECTED_OPT'." >&2
    echo "          The JS bundle is stale — rebuild with --rerun-tasks on createBundleReleaseJsAndAssets." >&2
    exit 1
  fi

  opt4_fallback=$(echo "$logcat_dump" | grep -c 'SDUI_OPT4_FALLBACK' || true)
  wire_bytes=$(echo "$logcat_dump" | { grep -o 'SDUI_P7_BYTES [0-9]*' || true; } | tail -1 | awk '{print $2}')

  deltas_json="{"
  first=true
  for name in "${MARKER_NAMES[@]}"; do
    line=$(echo "$logcat_dump" | { grep "SDUI_MARK_${name} " || true; } | tail -1)
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

  first_paint_ms=$(node -e "console.log(JSON.parse(process.argv[1]).firstPaint)" "$deltas_json")
  full_render_ms=$(node -e "console.log(JSON.parse(process.argv[1]).fullRender)" "$deltas_json")
  echo "run $i [$VARIANT]: TotalTime=${total_time}ms firstPaint=${first_paint_ms}ms fullRender=${full_render_ms}ms" >&2
  if [ "$opt4_fallback" -gt 0 ]; then
    echo "  [warn] run $i fell back to a JS-thread JSON.parse (SDUI_OPT4_FALLBACK)" >&2
  fi

  node -e '
    const [variant, run, totalTime, deltasJson, wireBytes, opt4Fallback] = process.argv.slice(1);
    process.stdout.write(JSON.stringify({
      variant,
      run: Number(run),
      ttrTotalTimeMs: totalTime === "" ? null : Number(totalTime),
      wireBytes: wireBytes === "" ? null : Number(wireBytes),
      opt4FellBackToJsThread: Number(opt4Fallback) > 0,
      markersMs: JSON.parse(deltasJson),
      jank: null,
    }) + "\n");
  ' "$VARIANT" "$i" "$total_time" "$deltas_json" "${wire_bytes:-}" "$opt4_fallback" >> "$RUNS_FILE"
done

if [ "$RUN_FLASHLIGHT" = "1" ]; then
  FLASHLIGHT_JSON="$FLASHLIGHT_DIR/p7-$(echo "$VARIANT" | tr ',' '-').json"
  set +e
  flashlight test \
    --bundleId "$PKG" \
    --testCommand "$(dirname "$0")/p6-scroll-flow.sh" \
    --iterationCount "$N" \
    --duration 4000 \
    --resultsFilePath "$FLASHLIGHT_JSON" \
    --resultsTitle "$VARIANT scroll jank"
  set -e
  node -e '
    const fs = require("fs");
    if (!fs.existsSync(process.argv[1])) process.exit(0);
    const data = JSON.parse(fs.readFileSync(process.argv[1], "utf8"));
    const perIteration = (data.iterations || []).map((it) => {
      const f = (it.measures || []).map((m) => m.fps).filter((v) => typeof v === "number");
      return { status: it.status, fpsAverage: f.length ? f.reduce((a, b) => a + b, 0) / f.length : null };
    });
    fs.writeFileSync(process.argv[2], JSON.stringify(perIteration));
  ' "$FLASHLIGHT_JSON" "$FLASHLIGHT_JSON.perIteration.json"
  PER_ITERATION="$FLASHLIGHT_JSON.perIteration.json"
else
  PER_ITERATION="/nonexistent"
fi

node -e '
  const fs = require("fs");
  const path = "'"$RESULTS_JSON"'";
  const jankByIndex = fs.existsSync(process.argv[2]) ? JSON.parse(fs.readFileSync(process.argv[2], "utf8")) : [];
  const existing = fs.existsSync(path) ? JSON.parse(fs.readFileSync(path, "utf8")) : [];
  const incoming = fs.readFileSync(process.argv[1], "utf8").split("\n").filter(Boolean).map((line, idx) => {
    const run = JSON.parse(line);
    run.jank = jankByIndex[idx] ?? null;
    return run;
  });
  fs.writeFileSync(path, JSON.stringify(existing.concat(incoming), null, 2) + "\n");
  console.log(`wrote ${incoming.length} runs to ${path} (${existing.length + incoming.length} total)`);
' "$RUNS_FILE" "$PER_ITERATION"

echo ""
scripts/p7-report.js "$VARIANT"
