---
name: analysis-context
description: Use when an analysis/reading skill needs to save results as markdown context, when user asks to save recent analysis results, or when upstream skills need the format schema for producing structured output
---

# Analysis Context

## Overview

Manages saving analysis results as local markdown files for future context reuse. After saving, verifies the analysis direction against source code and appends a suggested direction section.

## When to Use

- After a reading/analysis skill finishes presenting results (invoked by upstream)
- User manually asks to save recent analysis (e.g., "幫我存剛才的分析")
- Upstream skill needs to know the output schema before assembling content

## When NOT to Use

- User is in a compound command chain — defer until chain completes
- User explicitly stated they don't want to save

## Dispatch

| Trigger | Load Reference | Action |
|---------|---------------|--------|
| Upstream skill invokes with schema-compliant markdown | save.md | Proceed to save flow (skip "do you want to save?" only), then verify-direction |
| User manually triggers save | format.md → save.md | Extract from conversation history, assemble per schema, then write |
| Upstream skill queries format | format.md | Return schema definition only |
| File successfully saved | verify-direction.md | Compare with source data + codebase, append Suggested Direction |

## For Upstream Skill Authors

To integrate with this skill:

1. Read `references/format.md` for the strict schema
2. After presenting results, assemble schema-compliant markdown (frontmatter + sections)
3. Invoke `analysis-context` with the assembled markdown — it will skip the "do you want to save?" prompt and proceed to save directly

Whether to confirm with the user before invoking is the upstream skill's responsibility.

**Note:** "Save directly" only skips the initial save decision. File-level safety checks (e.g., overwrite confirmation when a file with the same name already exists) are NEVER skipped.

After saving, `analysis-context` will automatically:
1. Search the codebase for related source code
2. Assess complexity (simple vs complex)
3. For simple issues: directly append `## Suggested Direction` to the file
4. For complex issues: invoke `superpowers:brainstorming` for full collaborative analysis, then append result

## Quick Reference

| Reference | Purpose |
|-----------|---------|
| references/format.md | Strict schema contract — frontmatter fields + content sections |
| references/save.md | File naming, paths, write flow, image handling, edge cases |
| references/verify-direction.md | Post-save: compare with source + codebase, append suggested direction |
