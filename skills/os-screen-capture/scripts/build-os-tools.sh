#!/bin/bash
# Compile the macOS helpers into $OSBIN (default ~/.cache/os-screen-capture/bin). Needs Xcode command line tools.
set -euo pipefail
SRC="$(cd "$(dirname "$0")/os" && pwd)"
OSBIN="${OSBIN:-$HOME/.cache/os-screen-capture/bin}"
mkdir -p "$OSBIN"
for f in "$SRC"/*.swift; do
  n="$(basename "$f" .swift)"
  swiftc -O "$f" -o "$OSBIN/$n" 2>&1 | grep -v warning || true
  [ -x "$OSBIN/$n" ] || { echo "build failed: $n" >&2; exit 1; }
done
echo "built into $OSBIN: $(ls "$OSBIN" | tr '\n' ' ')"
