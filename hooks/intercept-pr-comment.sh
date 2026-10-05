#!/bin/bash

INPUT="$1"

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

# Block: gh pr comment
if echo "$INPUT" | grep -qE 'gh\s+pr\s+comment'; then
  echo "BLOCKED"
  echo "---"
  echo "請使用 github-pr skill 發布 PR comment。"
  exit 2
fi

# Block: gh pr review
if echo "$INPUT" | grep -qE 'gh\s+pr\s+review'; then
  echo "BLOCKED"
  echo "---"
  echo "請使用 github-pr skill 發布 PR review。"
  exit 2
fi

# Block: direct review creation/update (POST or PUT)
if echo "$INPUT" | grep -qE 'pulls/[0-9]+/reviews.*(POST|PUT)'; then
  echo "BLOCKED"
  echo "---"
  echo "請使用 github-pr skill 建立/更新 pending review。"
  exit 2
fi

# --- Default: allow ---
exit 0
