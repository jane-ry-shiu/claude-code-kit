# Hook Installation Guide

> **Platform Note:** This hook is designed for Claude Code's tool interception system (`~/.claude/hooks/`, `PreToolUse` matcher). Adaptation may be needed for Kiro CLI.

The hook intercepts Bash commands that attempt to post PR comments directly, redirecting to this skill.

**Scope:** Bash tool only. MCP tool calls are not intercepted.

## Hook Script

**~/.claude/hooks/intercept-pr-comment.sh:**
```bash
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
  echo "請使用 github-pr-comments skill 發布 PR comment。"
  exit 2
fi

# Block: gh pr review
if echo "$INPUT" | grep -qE 'gh\s+pr\s+review'; then
  echo "BLOCKED"
  echo "---"
  echo "請使用 github-pr-comments skill 發布 PR review。"
  exit 2
fi

# Block: direct review creation/update (POST or PUT)
if echo "$INPUT" | grep -qE 'pulls/[0-9]+/reviews.*(POST|PUT)'; then
  echo "BLOCKED"
  echo "---"
  echo "請使用 github-pr-comments skill 建立/更新 pending review。"
  exit 2
fi

# --- Default: allow ---
exit 0
```

## Settings Configuration

Merge into **~/.claude/settings.json**:
```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Bash",
        "hooks": [
          {
            "type": "command",
            "command": "~/.claude/hooks/intercept-pr-comment.sh \"$TOOL_INPUT\""
          }
        ]
      }
    ]
  }
}
```

## Installation

```bash
mkdir -p ~/.claude/hooks
cp intercept-pr-comment.sh ~/.claude/hooks/
chmod +x ~/.claude/hooks/intercept-pr-comment.sh
# Then merge hook config into ~/.claude/settings.json
```

## Interception Scope

| Command | Action |
|---------|--------|
| `gh pr comment ...` | Block |
| `gh pr review ...` | Block |
| `gh api .../reviews POST` | Block |
| `gh api .../reviews PUT` | Block |
| `gh api .../reviews/{id}/events POST` | Allow (submit) |
| `gh api .../reviews/{id} DELETE` | Allow (delete) |
| `gh api .../reviews/{id}/comments POST` | Allow (add to pending) |
| All other commands | Allow |
