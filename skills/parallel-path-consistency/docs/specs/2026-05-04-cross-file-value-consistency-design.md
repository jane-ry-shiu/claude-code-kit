# Design: Add Cross-File Value Consistency to parallel-path-consistency

**Date**: 2026-05-04
**Trigger**: PR #7516 review bots caught 5 documentation inconsistencies that branch-review-workflow missed

## Problem

branch-review-workflow found DeviceCard "9→8" in design.md and fixed it, but the same incorrect "9" existed in proposal.md and spec.md — unfixed. Other count/notation mismatches across sibling `.md` files were also missed.

Root cause: `parallel-path-consistency` only applies to `.js/.ts/.vue/.tsx` conditional structures. The concept of "when you modify one sibling, check all siblings" was not applied to documentation files sharing the same spec directory.

## Changes

Three additions to `parallel-path-consistency/SKILL.md`:

1. **Description**: Add `.md` files in openspec directories to trigger dynamic discovery by code-review and fix-planning
2. **New pattern "Cross-File Value Consistency"**: When a concrete value (count, identifier, variable name) in a `.md` file is modified or flagged, grep all sibling `.md` files in the same openspec directory (including subdirectories) for the same value
3. **Review Dimensions**: Add dimension #2 for cross-file value consistency in `.md` files

## Scope

- Sibling files = all `.md` files under the same openspec directory tree
- Applies during review (Active Mode) and fix (when loaded by fix-planning)
- Does NOT apply to unrelated `.md` files outside the openspec directory
