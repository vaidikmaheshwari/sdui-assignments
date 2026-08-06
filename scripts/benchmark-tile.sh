#!/usr/bin/env bash
# Measurement scaffolding for the §4.3 tile benchmark (docs/SCHEMA.md §4.3, docs/PROMPTS.md
# P4.5). Drives N cold starts of an installed release APK and one scripted scroll pass per
# run, on a physical Android device. Prints raw per-run numbers plus median/p90 to stdout —
# does not write PERF.md.
#
# Usage: scripts/benchmark-tile.sh <apk-path> <label> [n]
set -euo pipefail

APK_PATH="$1"
LABEL="$2"
N="${3:-10}"
PKG="com.vaidik.sduiassignments"
ACTIVITY="$PKG/.MainActivity"

echo "== $LABEL: installing $APK_PATH ==" >&2
adb install -r "$APK_PATH" >&2

ttr_vals=()
full_render_vals=()
jank_pct_vals=()
p90_frame_vals=()

for i in $(seq 1 "$N"); do
  adb shell am force-stop "$PKG"
  sleep 1
  adb logcat -c

  device_epoch_before=$(adb shell date +%s%3N | tr -d '\r')

  start_output=$(adb shell am start -W -n "$ACTIVITY")
  total_time=$(echo "$start_output" | grep '^TotalTime:' | awk '{print $2}' | tr -d '\r')

  # Poll logcat for the full-render marker (bounded wait).
  full_render_epoch=""
  for _ in $(seq 1 25); do
    line=$(adb logcat -d | grep 'SDUI_FULL_RENDER' | tail -1 || true)
    if [ -n "$line" ]; then
      full_render_epoch=$(echo "$line" | grep -o 'SDUI_FULL_RENDER [0-9]*' | awk '{print $2}')
      break
    fi
    sleep 0.2
  done
  ttr_line=$(adb logcat -d | grep 'SDUI_TTR' | tail -1 || true)
  ttr_epoch=$(echo "$ttr_line" | grep -o 'SDUI_TTR [0-9]*' | awk '{print $2}')
  variant_line=$(adb logcat -d | grep 'SDUI_VARIANT' | tail -1 || true)

  full_render_delta=$((full_render_epoch - device_epoch_before))

  # Scroll jank: reset counters, scroll through the whole page, read frame stats.
  adb shell dumpsys gfxinfo "$PKG" reset >/dev/null
  sleep 0.3
  for _ in $(seq 1 8); do
    adb shell input swipe 540 1900 540 300 150
    sleep 0.25
  done
  sleep 0.3
  gfx_output=$(adb shell dumpsys gfxinfo "$PKG")
  jank_pct=$(echo "$gfx_output" | grep '^Janky frames:' | grep -o '([0-9.]*%)' | tr -d '(%)')
  p90_frame=$(echo "$gfx_output" | grep '^90th percentile:' | grep -o '[0-9]*ms' | tr -d 'ms')

  echo "run $i [$variant_line]: TotalTime(TTR)=${total_time}ms full_render=${full_render_delta}ms jank=${jank_pct}% p90_frame=${p90_frame}ms" >&2

  ttr_vals+=("$total_time")
  full_render_vals+=("$full_render_delta")
  jank_pct_vals+=("$jank_pct")
  p90_frame_vals+=("$p90_frame")
done

percentile() {
  # nearest-rank percentile over space-separated args; $1 = percentile (0-100), rest = values
  local p="$1"; shift
  local sorted
  sorted=$(printf '%s\n' "$@" | sort -n)
  local count
  count=$(echo "$sorted" | wc -l | tr -d ' ')
  local rank
  rank=$(awk -v p="$p" -v c="$count" 'BEGIN { r = p/100*c; print (r == int(r)) ? r : int(r)+1 }')
  echo "$sorted" | sed -n "${rank}p"
}

echo ""
echo "=== $LABEL (n=$N) ==="
echo "TTR (am start -W TotalTime, ms): median=$(percentile 50 "${ttr_vals[@]}") p90=$(percentile 90 "${ttr_vals[@]}")"
echo "Full render (ms since process start): median=$(percentile 50 "${full_render_vals[@]}") p90=$(percentile 90 "${full_render_vals[@]}")"
echo "Scroll jank (% janky frames): median=$(percentile 50 "${jank_pct_vals[@]}") p90=$(percentile 90 "${jank_pct_vals[@]}")"
echo "Scroll frame time, 90th pct per run (ms): median=$(percentile 50 "${p90_frame_vals[@]}") p90=$(percentile 90 "${p90_frame_vals[@]}")"
