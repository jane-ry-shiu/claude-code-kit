#!/usr/bin/env bash
# Launch (or report) the shared Chrome that chrome-devtools-a / -b attach to.
#
# Why this exists: chrome-devtools-mcp normally launches its OWN Chrome and
# holds an exclusive lock on its profile directory, so a second Claude Code
# session cannot get a browser at all. Pointing several server entries at one
# manually-launched Chrome removes that lock, and because each server process
# owns its own internal mutex, those sessions also run genuinely concurrently.
#
# Usage:
#   shared-chrome.sh          start it (no-op if already running)
#   shared-chrome.sh status   report
#   shared-chrome.sh stop     quit it
#
# SECURITY: the debugging port lets ANY local process drive this browser.
# Keep it to non-production sign-ins only. Never use this profile for banking,
# personal mail, or anything you would mind another program reading.

set -euo pipefail

PORT=9222
PROFILE="$HOME/.cache/claude-shared-chrome"
CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"

is_up() { curl -s --max-time 1 "http://127.0.0.1:$PORT/json/version" >/dev/null 2>&1; }

case "${1:-start}" in
  status)
    if is_up; then
      echo "up   port=$PORT profile=$PROFILE"
      curl -s "http://127.0.0.1:$PORT/json/version" | sed -n 's/.*"Browser": *"\([^"]*\)".*/  \1/p'
    else
      echo "down port=$PORT"
    fi
    ;;

  stop)
    pkill -f -- "--user-data-dir=$PROFILE" 2>/dev/null || true
    sleep 1
    is_up && echo "still up — check manually" || echo "stopped"
    ;;

  start)
    if is_up; then echo "already up on port $PORT — nothing to do"; exit 0; fi
    [ -x "$CHROME" ] || { echo "Chrome not found at: $CHROME" >&2; exit 1; }
    mkdir -p "$PROFILE"

    # The three --disable-*background* flags are NOT optional.
    # Chrome throttles requestAnimationFrame in a tab that is not frontmost.
    # Vue/React transitions then never advance, so modals, dropdowns and
    # tooltips freeze at opacity 0 — invisible in screenshots and unclickable,
    # with no error raised. Puppeteer passes these automatically when IT
    # launches Chrome; launching by hand means passing them yourself.
    nohup "$CHROME" \
      --remote-debugging-port="$PORT" \
      --user-data-dir="$PROFILE" \
      --disable-background-timer-throttling \
      --disable-backgrounding-occluded-windows \
      --disable-renderer-backgrounding \
      --no-first-run \
      --no-default-browser-check \
      >/dev/null 2>&1 &

    for _ in $(seq 1 20); do is_up && break; sleep 1; done
    if is_up; then
      echo "up   port=$PORT profile=$PROFILE"
      echo "next: sign in to the sites you need ONCE in this window; the profile keeps the session."
    else
      echo "failed to come up within 20s" >&2; exit 1
    fi
    ;;

  *) echo "usage: $0 [start|status|stop]" >&2; exit 2 ;;
esac
