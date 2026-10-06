#!/bin/bash
# PreToolUse (Bash) hook: route PR comments and reviews through the github-pr skill.
#
# Claude Code sends the tool call as JSON on stdin; the command is at
# .tool_input.command. A blocked call exits 2, and Claude Code shows stderr to
# the model as the reason, so the message goes to stderr.

INPUT="$(jq -r '.tool_input.command // empty' 2>/dev/null)"

block() {
  echo "BLOCKED: $1" >&2
  exit 2
}

# --- Allow list (check first) ---

# Allow: submit pending review
if echo "$INPUT" | grep -qE 'reviews/[0-9]+/events'; then
  exit 0
fi

# Allow: delete pending review
if echo "$INPUT" | grep -qE 'reviews/[0-9]+"\s*--method\s+DELETE|reviews/[0-9]+\s+--method\s+DELETE'; then
  exit 0
fi

# Allow: add comment to existing pending review
if echo "$INPUT" | grep -qE 'reviews/[0-9]+/comments'; then
  exit 0
fi

# --- Block list ---

if echo "$INPUT" | grep -qE 'gh\s+pr\s+comment'; then
  block "請使用 github-pr skill 發布 PR comment。"
fi

if echo "$INPUT" | grep -qE 'gh\s+pr\s+review'; then
  block "請使用 github-pr skill 發布 PR review。"
fi

# Direct review creation/update (POST or PUT)
if echo "$INPUT" | grep -qE 'pulls/[0-9]+/reviews.*(POST|PUT)'; then
  block "請使用 github-pr skill 建立/更新 pending review。"
fi

# --- Default: allow ---
exit 0
