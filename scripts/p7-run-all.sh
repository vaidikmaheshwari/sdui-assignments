#!/usr/bin/env bash
# Runs scripts/benchmark-p7.sh for every built P7 variant, n=10 each, then prints the
# before/after table for all of them (docs/PROMPTS.md P7).
#
# The baseline is measured FIRST and re-measured LAST under the same conditions as everything
# else. Cold-start numbers drift with device thermal state and whatever else the phone decides
# to do over a 40-minute session; if the two baseline blocks disagree materially, the deltas in
# between are noise and the run should be thrown away rather than reported.
#
# Usage: scripts/p7-run-all.sh [n]
set -euo pipefail

N="${1:-10}"
HERE="$(cd "$(dirname "$0")" && pwd)"
cd "$HERE/.."

if ! curl -s -o /dev/null http://127.0.0.1:8787/health; then
  echo "[fatal] payload server not running — start: node scripts/payload-server.js" >&2
  exit 1
fi

VARIANTS=(baseline opt1 opt2 opt3 opt4 opt5 opt6)

for v in "${VARIANTS[@]}"; do
  APK="bench/apks/p7-${v}-release.apk"
  if [ ! -f "$APK" ]; then
    echo "[fatal] missing $APK — run scripts/p7-build.sh $v" >&2
    exit 1
  fi
done

for v in "${VARIANTS[@]}"; do
  scripts/benchmark-p7.sh "bench/apks/p7-${v}-release.apk" "$v" "$N"
done

# Baseline drift check: same APK, same n, recorded under a distinct label so it never pollutes
# the real baseline's numbers.
echo ""
echo "== re-measuring baseline as a drift check =="
EXPECTED_OPT=baseline scripts/benchmark-p7.sh "bench/apks/p7-baseline-release.apk" "baseline-recheck" "$N"

echo ""
echo "##########  P7 SUMMARY  ##########"
scripts/p7-report.js --all
