#!/usr/bin/env bash
# Builds one P7 release APK per variant (docs/PROMPTS.md P7).
#
# The `--rerun-tasks` on createBundleReleaseJsAndAssets is not belt-and-braces. Gradle does not
# treat EXPO_PUBLIC_* env vars as inputs to that task, so building a second variant reuses the
# first variant's JS bundle and produces two APKs that measure the same code. That exact failure
# happened during P6 (docs/ai-log.md) and was only caught by an in-app variant marker; both are
# kept here — this rerun, and benchmark-p7.sh's SDUI_P7_OPT assertion at run time.
#
# Usage: scripts/p7-build.sh <variant> [<variant> ...]
#   e.g. scripts/p7-build.sh baseline opt1 opt2 opt3 opt4 opt5 opt6
set -euo pipefail

OUT_DIR="bench/apks"
mkdir -p "$OUT_DIR"

for VARIANT in "$@"; do
  SAFE=$(echo "$VARIANT" | tr ',' '-')
  echo ""
  echo "=========================================================="
  echo "== building EXPO_PUBLIC_SDUI_OPT=$VARIANT"
  echo "=========================================================="
  (
    cd android
    EXPO_PUBLIC_SDUI_OPT="$VARIANT" ./gradlew :app:createBundleReleaseJsAndAssets --rerun-tasks -q
    EXPO_PUBLIC_SDUI_OPT="$VARIANT" ./gradlew :app:assembleRelease -q
  )
  cp android/app/build/outputs/apk/release/app-release.apk "$OUT_DIR/p7-${SAFE}-release.apk"
  echo "-> $OUT_DIR/p7-${SAFE}-release.apk"
done
