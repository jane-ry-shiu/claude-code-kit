---
name: diagnose-bug
description: Use when user describes a bug symptom and asks to find the root cause, when asked to diagnose or analyze a problem after reading a Redmine/Jira issue, or via manual invocation. Analyzes descriptions and screenshots to trace data flow in the codebase and classify breakpoints as frontend/backend/both.
---

# Diagnose Bug

Trace bug symptoms to root causes by analyzing descriptions, screenshots, and codebase data flow.

## Reference Dispatch

When triggered without explicit depth instruction, ask the user:

> How would you like to analyze?
> 1. **Quick** — shallow scan, list possible causes with confidence levels (suitable for triage / batch review)
> 2. **Deep** — full data flow trace to locate root cause

| Step | Condition | Reference |
|------|-----------|-----------|
| 1a | User chooses Quick | [quick-hypothesis.md](references/quick-hypothesis.md) — shallow scan, hypothesis list |
| 1b | User chooses Deep | [analyze.md](references/analyze.md) — locate component, trace data flow within current workspace |
| 2 | Deep analysis hits codebase boundary, user provides another repo | [cross-project.md](references/cross-project.md) — continue tracing in additional project |
| 2 | Analysis finds root cause, or user stops | Done |

Load only the reference matching the current step. Do not load both simultaneously.
