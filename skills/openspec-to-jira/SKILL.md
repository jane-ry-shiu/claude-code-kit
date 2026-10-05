---
name: openspec-to-jira
description: "Use when user wants to create or update Jira tickets from an OpenSpec change \u2014 either a spec conversion ticket (high-level \u2192 low-level) or parent task + sub-tasks from tasks.md with dependency marking"
---

# OpenSpec to Jira

Unified entry point for creating Jira tickets from OpenSpec changes. Dispatches to focused reference files based on user intent.

## Reference Dispatch

| Trigger | Reference |
|---------|-----------|
| User wants to create or update a spec conversion ticket (high-level → low-level) | [spec-conversion.md](references/spec-conversion.md) |
| User wants to create parent task + sub-tasks from an openspec change with tasks.md | [spec-tasks.md](references/spec-tasks.md) |

Load only the matching reference. Do not load both simultaneously. If user intent is ambiguous (e.g., "create Jira tickets from this openspec change" and the change has both specs/ and tasks.md), ask the user which operation they want.

## Shared Parameters

Ask for any missing parameter before dispatching:

| Parameter | Required | Example |
|-----------|----------|---------|
| OpenSpec change path | ✅ | `docs/openspec/changes/add-floor-plan-license-control` |
| Jira project key | ✅ | `VOR` |

## Dependencies

- `jira` skill — description-format, create-ticket, update-ticket, summary-title-format
