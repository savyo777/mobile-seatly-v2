#!/usr/bin/env bash
# Prep the iOS Simulator for Maestro flows:
#   - terminate the app cleanly
#   - re-grant common permissions (Maestro's clearState revokes them
#     when bundled with simctl uninstall+reinstall)
#   - dismiss any lingering system permission dialogs with a keyboard
#     Return (Maestro can't see iOS-system overlays in its a11y tree)
#
# Usage:
#   scripts/maestro-sim-prep.sh <udid>   # explicit udid
#   scripts/maestro-sim-prep.sh          # autodetect booted iPhone
set -euo pipefail

UDID="${1:-}"
if [[ -z "$UDID" ]]; then
  UDID="$(xcrun simctl list devices booted 2>/dev/null \
    | awk '/iPhone/ {print $NF}' \
    | tr -d '()' \
    | head -1)"
fi
if [[ -z "$UDID" ]]; then
  echo "FATAL: no booted iPhone simulator found" >&2
  exit 1
fi

BUNDLE="com.cenaiva.app"

xcrun simctl terminate "$UDID" "$BUNDLE" 2>/dev/null || true
sleep 1

xcrun simctl privacy "$UDID" grant microphone "$BUNDLE" 2>/dev/null || true
xcrun simctl privacy "$UDID" grant camera "$BUNDLE" 2>/dev/null || true
xcrun simctl privacy "$UDID" grant location "$BUNDLE" 2>/dev/null || true
xcrun simctl privacy "$UDID" grant photos "$BUNDLE" 2>/dev/null || true

# If a system permission dialog managed to survive, Return on iOS
# selects the highlighted (default) button. Most dialogs default to
# "Allow"/"OK". Fire a few in case the launcher cascades.
osascript -e 'tell application "Simulator" to activate' 2>/dev/null || true
for _ in 1 2 3; do
  osascript -e 'tell application "System Events" to tell process "Simulator" to keystroke return' 2>/dev/null || true
  sleep 0.5
done

echo "OK: simulator prepped (udid=$UDID)"
