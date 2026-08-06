#!/usr/bin/env bash
# testCommand for `flashlight test` (scripts/benchmark-p6.sh). Flashlight force-stops the app
# before each iteration, then runs this command — so this launches the activity and performs the
# same 8-swipe scroll pattern scripts/benchmark-tile.sh uses, for comparability.
set -euo pipefail

PKG="com.vaidik.sduiassignments"
ACTIVITY="$PKG/.MainActivity"

adb shell am start -n "$ACTIVITY" >/dev/null
sleep 2

for _ in $(seq 1 8); do
  adb shell input swipe 540 1900 540 300 150
  sleep 0.25
done
