#!/usr/bin/env bash
# Integrity check for the implementation-parity skill.
set -uo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
fail=0
err() { echo "FAIL: $*"; fail=1; }

[ -f "$ROOT/SKILL.md" ] || err "SKILL.md missing"
if [ -f "$ROOT/SKILL.md" ]; then
  head -1 "$ROOT/SKILL.md" | grep -qx -- '---' || err "SKILL.md: no frontmatter opener"
  grep -qE '^name: implementation-parity$' "$ROOT/SKILL.md" || err "SKILL.md: name must be implementation-parity"
  grep -qE '^description: .+' "$ROOT/SKILL.md" || err "SKILL.md: description missing"
fi

while IFS= read -r line || [ -n "$line" ]; do
  [ -z "$line" ] && continue
  case "$line" in \#*) continue ;; esac
  file="${line%% ::*}"
  if [ ! -f "$ROOT/$file" ]; then err "$file: listed in manifest but missing"; continue; fi
  grep -qF "$(basename "$file")" "$ROOT/SKILL.md" 2>/dev/null || err "$file: not linked from SKILL.md"
  headings="${line#"$file"}"
  while [ -n "$headings" ]; do
    headings="${headings# :: }"
    case "$headings" in *" :: "*) h="${headings%% :: *}"; headings="${headings#*" :: "}" ;; *) h="$headings"; headings="" ;; esac
    [ -z "$h" ] && continue
    grep -qF "$h" "$ROOT/$file" || err "$file: required heading missing -- $h"
  done
done < "$ROOT/docs/manifest.txt"

if [ -d "$ROOT/references" ]; then
  for f in "$ROOT"/references/*.md; do
    [ -e "$f" ] || continue
    grep -qF "references/$(basename "$f")" "$ROOT/docs/manifest.txt" || err "references/$(basename "$f"): not in manifest"
  done
fi

if grep -rn 'mcp__chrome-devtools__' "$ROOT" --include='*.md' 2>/dev/null | grep -v '/docs/'; then
  err "bare mcp__chrome-devtools__ entry found (must be mcp__chrome-devtools-<lane>__)"
fi
if grep -rnE '\b(TBD|TODO|FIXME|XXX)\b' "$ROOT" --include='*.md' 2>/dev/null | grep -v '/docs/'; then
  err "placeholder markers found"
fi
if grep -rn 'implementation-verification' "$ROOT" --include='*.md' 2>/dev/null | grep -v '/docs/'; then
  err "SKILL.md/references still reference the replaced skill"
fi

[ "$fail" -eq 0 ] && echo "OK: all checks passed"
exit "$fail"
