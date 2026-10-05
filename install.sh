#!/usr/bin/env bash
# Install claude-code-kit into ~/.claude by symlinking each item.
#
# Every skill, agent, rule, hook and script is linked one by one, so `git pull`
# in this repo updates what Claude Code loads, and anything you already have in
# ~/.claude with the same name is left alone (reported, never overwritten).
#
# Usage:
#   ./install.sh [options]
#
# Options:
#   --personal     also link the personal layer: the response-format rule and
#                  the author's global CLAUDE.md (only where none exists yet)
#   --statusline   link the status line script and point settings at it
#                  (only when no status line is configured yet)
#   --mcp          register the MCP servers in mcp/servers.json at user scope
#                  (servers you already have under the same name are skipped)
#   --dry-run      print what would happen, change nothing
#   --uninstall    remove every link that points into this repo and the hook
#                  entries this script added
#   -h, --help     show this help
#
# Another pack (a directory with the same layout: skills/, agents/, rules/,
# mcp/servers.json) can be installed with this script by setting KIT_DIR:
#   KIT_DIR=~/other-pack ~/claude-code-kit/install.sh [--mcp]
# The credential helpers in bin/ always come from this kit.

set -euo pipefail

KIT_BIN="$(cd "$(dirname "$0")" && pwd)/bin"
KIT="$(cd "${KIT_DIR:-$(dirname "$0")}" && pwd)"
CLAUDE_HOME="${CLAUDE_CONFIG_DIR:-$HOME/.claude}"
SETTINGS="$CLAUDE_HOME/settings.json"
HOOKS_FRAGMENT="$KIT/hooks/settings-hooks.json"

WITH_PERSONAL=0
WITH_STATUSLINE=0
WITH_MCP=0
DRY_RUN=0
UNINSTALL=0

usage() { sed -n '2,29p' "$0" | sed 's/^# \{0,1\}//'; }

while [[ $# -gt 0 ]]; do
  case "$1" in
    --personal)   WITH_PERSONAL=1 ;;
    --statusline) WITH_STATUSLINE=1 ;;
    --mcp)        WITH_MCP=1 ;;
    --dry-run)    DRY_RUN=1 ;;
    --uninstall)  UNINSTALL=1 ;;
    -h|--help)    usage; exit 0 ;;
    *) echo "unknown option: $1" >&2; usage >&2; exit 64 ;;
  esac
  shift
done

command -v jq >/dev/null 2>&1 || { echo "install.sh needs jq (brew install jq)" >&2; exit 69; }

LINKED=0; KEPT=0; SKIPPED=0

run() {
  if [[ $DRY_RUN -eq 1 ]]; then echo "  would: $*"; else "$@"; fi
}

# link SRC DST — create DST -> SRC unless something else already sits at DST.
link() {
  local src="$1" dst="$2"
  if [[ -L "$dst" && "$(readlink "$dst")" == "$src" ]]; then
    KEPT=$((KEPT + 1)); return
  fi
  if [[ -e "$dst" || -L "$dst" ]]; then
    echo "  skip  ${dst/#$HOME/~}  (already exists, not touched)"
    SKIPPED=$((SKIPPED + 1)); return
  fi
  run mkdir -p "$(dirname "$dst")"
  run ln -s "$src" "$dst"
  echo "  link  ${dst/#$HOME/~}"
  LINKED=$((LINKED + 1))
}

link_children() {  # link_children SRC_DIR DST_DIR GLOB
  local src_dir="$1" dst_dir="$2" pattern="$3" item
  [[ -d "$src_dir" ]] || return 0
  for item in "$src_dir"/$pattern; do
    [[ -e "$item" ]] || continue
    link "$item" "$dst_dir/$(basename "$item")"
  done
}

write_settings() {  # write_settings JQ_FILTER [jq args...]
  local filter="$1"; shift
  local current tmp
  current="$( [[ -f "$SETTINGS" ]] && cat "$SETTINGS" || echo '{}' )"
  tmp="$(printf '%s' "$current" | jq "$@" "$filter")"
  if [[ "$tmp" == "$(printf '%s' "$current" | jq .)" ]]; then
    echo "  settings unchanged"; return
  fi
  if [[ $DRY_RUN -eq 1 ]]; then echo "  would update ${SETTINGS/#$HOME/~}"; return; fi
  mkdir -p "$CLAUDE_HOME"
  [[ -f "$SETTINGS" ]] && cp "$SETTINGS" "$SETTINGS.bak-kit-$(date +%Y%m%d%H%M%S)"
  printf '%s\n' "$tmp" > "$SETTINGS"
  echo "  updated ${SETTINGS/#$HOME/~} (backup kept next to it)"
}

# Add each hook group unless a group running the same command already exists.
merge_hooks() {
  [[ -f "$HOOKS_FRAGMENT" ]] || return 0
  write_settings '
    reduce ($frag[0] | to_entries[]) as $event (.;
      .hooks[$event.key] = (
        reduce $event.value[] as $group ((.hooks[$event.key] // []);
          if any(.[].hooks[]?; .command == $group.hooks[0].command)
          then . else . + [$group] end)))' \
    --slurpfile frag "$HOOKS_FRAGMENT"
}

remove_hooks() {
  [[ -f "$HOOKS_FRAGMENT" ]] || return 0
  write_settings '
    [$frag[0][][].hooks[].command] as $ours
    | if .hooks then
        .hooks |= with_entries(
          .value |= map(select(any(.hooks[]?; .command as $c | $ours | index([$c])) | not))
          | select(.value | length > 0))
      else . end' \
    --slurpfile frag "$HOOKS_FRAGMENT"
}

install_statusline() {
  link "$KIT/statusline/statusline-command.sh" "$CLAUDE_HOME/statusline-command.sh"
  write_settings '
    if .statusLine then . else
      .statusLine = {type: "command", command: ("bash " + $script), padding: 0}
    end' \
    --arg script "$CLAUDE_HOME/statusline-command.sh"
}

install_mcp() {
  if ! command -v claude >/dev/null 2>&1; then
    echo "  skip  MCP servers (claude CLI not on PATH)"; return
  fi
  local name json
  [[ -f "$KIT/mcp/servers.json" ]] || { echo "  skip  MCP servers (no mcp/servers.json in this pack)"; return; }
  for name in $(jq -r 'keys[] | select(startswith("_") | not)' "$KIT/mcp/servers.json"); do
    if claude mcp get "$name" >/dev/null 2>&1; then
      echo "  skip  MCP $name (already registered)"; continue
    fi
    json="$(jq -c --arg bin "$KIT_BIN" --arg home "$HOME" --arg n "$name" '
      .[$n] | walk(if type == "string"
                   then gsub("__KIT_BIN__"; $bin) | gsub("__HOME__"; $home)
                   else . end)' "$KIT/mcp/servers.json")"
    run claude mcp add-json --scope user "$name" "$json"
    echo "  add   MCP $name"
  done
}

uninstall() {
  echo "Removing links into ${KIT/#$HOME/~}"
  local link_path
  while IFS= read -r link_path; do
    case "$(readlink "$link_path")" in
      "$KIT"/*) run rm "$link_path"; echo "  unlink ${link_path/#$HOME/~}" ;;
    esac
  done < <(find "$CLAUDE_HOME" -maxdepth 3 -type l 2>/dev/null)
  echo "Removing hook entries"
  remove_hooks
  echo "Removing the status line setting if it points at the kit's script"
  write_settings '
    if .statusLine.command == ("bash " + $script) then del(.statusLine) else . end' \
    --arg script "$CLAUDE_HOME/statusline-command.sh"
  echo "MCP servers were left registered; remove them with: claude mcp remove <name> --scope user"
}

if [[ $UNINSTALL -eq 1 ]]; then uninstall; exit 0; fi

echo "Installing ${KIT/#$HOME/~} into ${CLAUDE_HOME/#$HOME/~}"
[[ $DRY_RUN -eq 1 ]] && echo "(dry run: nothing will change)"

echo "Skills";  link_children "$KIT/skills"  "$CLAUDE_HOME/skills"  "*"
echo "Agents";  link_children "$KIT/agents"  "$CLAUDE_HOME/agents"  "*.md"
echo "Rules"
link_children "$KIT/rules/custom"   "$CLAUDE_HOME/rules/custom"   "*.md"
link_children "$KIT/rules/openspec" "$CLAUDE_HOME/rules/openspec" "*.md"
echo "Hooks"
link_children "$KIT/hooks" "$CLAUDE_HOME/hooks" "*.sh"
link_children "$KIT/hooks" "$CLAUDE_HOME/hooks" "*.py"
merge_hooks
echo "Scripts"; link_children "$KIT/scripts" "$CLAUDE_HOME/scripts" "*.sh"

if [[ $WITH_PERSONAL -eq 1 ]]; then
  echo "Personal layer"
  link_children "$KIT/personal/rules" "$CLAUDE_HOME/rules/custom" "*.md"
  link "$KIT/personal/CLAUDE.md" "$CLAUDE_HOME/CLAUDE.md"
fi
if [[ $WITH_STATUSLINE -eq 1 ]]; then echo "Status line"; install_statusline; fi
if [[ $WITH_MCP -eq 1 ]]; then echo "MCP servers"; install_mcp; fi

echo
echo "Done: $LINKED linked, $KEPT already linked, $SKIPPED skipped."
if [[ $SKIPPED -gt 0 ]]; then
  echo "Skipped items already exist in ${CLAUDE_HOME/#$HOME/~}; move yours aside and re-run to use the kit's version."
fi
echo "Credentials: see README → Credentials (bin/kit-secret set <NAME>)."
