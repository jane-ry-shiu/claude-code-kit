#!/bin/bash
# Start a visible Google Chrome with its own profile and a CDP port, on the built-in display.
# `open -na` makes Chrome its own TCC identity, so it uses Chrome's Screen Recording permission, not the host app's.
# usage: bash launch-chrome.sh <profile-dir> [cdp-port=9333] [x,y=0,30] [w,h=1512,952]
set -euo pipefail
PROFILE="$1"; PORT="${2:-9333}"; POS="${3:-0,30}"; SIZE="${4:-1512,952}"
mkdir -p "$PROFILE"
open -na "Google Chrome" --args --user-data-dir="$PROFILE" --remote-debugging-port="$PORT" \
  --auto-select-desktop-capture-source=Built-in --no-first-run --no-default-browser-check \
  --window-position="$POS" --window-size="$SIZE" about:blank
for i in $(seq 1 30); do curl -s "http://127.0.0.1:$PORT/json/version" >/dev/null && { echo "chrome up on $PORT"; exit 0; }; sleep 0.5; done
echo "chrome did not open CDP port $PORT" >&2; exit 1
