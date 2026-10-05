---
name: analyzing-requirements
description: Use when converting a high-level spec into a low-level/implementation spec, or analyzing any requirement before building it — especially when it involves UI components, an over-packed spec covering several pages/features, behavior the spec leaves ambiguous, or API/data limits not yet verified against the real system.
---

# Analyzing Requirements

## Overview

Turn a requirement source into a reviewed, scoped, fully-assessed analysis record plus a recommended slicing — **before** any low-level spec or code is produced. Stop at the slicing; do not generate the low-level spec.

**Two things reliably go wrong — each gets a HARD GATE:**

1. **Scoping from the spec text alone, without opening the real code.** Agents group scope by the spec's module names and take its "current state" claims as fact — so scope is mis-sized, same-pattern surfaces are split, and untracked surfaces are missed. **REQUIRED: read `references/codebase-grounding.md` before finalizing the Phase-1 scope.**
2. **Specifying or deferring UI components from the spec text alone, without binding them to the design source.** **REQUIRED: read `references/design-source-binding.md` before specifying any component.**

The rest (surfacing undecided behavior, one-logical-unit splitting) the reference files cover as lightweight checklists — to keep it reliable and produce a shareable record, not heavy process.

## When to use

- Converting a high-level OpenSpec change into low-level work.
- Any requirement → implementation breakdown, especially involving UI.
- Symptoms: a spec packs several pages/features; the spec asserts a "current state" you haven't verified in code; its module split may not match how the surfaces are actually built; behavior is ambiguous (filter AND/OR, selection limits); you're about to specify components without a mockup; an API's real limits are unverified.

Not for: a trivial single-component change with the mockup already in hand.

## Output

One growing, reviewable record — format + status model in `references/record-format.md`, with a worked example to match in `references/example-record.md`. Track every decision/gap/constraint via `references/decision-tracking.md`.

## Phases (run in order)

1. **Understand & confirm scope** — `references/requirement-summary.md`, then **`references/codebase-grounding.md` (HARD GATE: open the real code, classify each surface by UI-pattern type, verify the spec's current-state claims, inventory untracked same-pattern surfaces)**, then `references/scope-boundary.md` (group by pattern type, not module). Batch-produce a scope list; the user confirms in/out. Confirmed scope gates what Phase 3 assesses.
2. **Coarse work breakdown** — `references/work-breakdown.md`. Components / pages / APIs, no detail.
3. **Assess** each work item:
   - `references/design-source-binding.md` — **HARD GATE** for components.
   - `references/spec-gap-check.md` — pages/behavior vs the spec.
   - `references/technical-constraints.md` — verify API/data against the **real** system.
4. **Recommend slicing & hand off** — `references/slicing-recommendation.md`. Recommend the change/capability split, then STOP. Generating the low-level spec is the next stage (OpenSpec proposal flow).

## Boundary

Stops at the recommended slicing. Never writes `proposal.md` / `specs/`.
