---
name: parallel-path-consistency
description: Use when writing, modifying, or reviewing code that involves conditional structures handling multiple entity types — enforces consistency of side effects across sibling code paths. Applies to .js, .ts, .vue, and .tsx files. Also applies to .md files within openspec directories for cross-file value consistency. Also triggers during spec planning to ensure all relevant entity types are addressed.
---

# Parallel Path Consistency

## Overview

Change completeness check for conditional structures. When code has multiple branches handling related entities (types, cases, variants), a behavioral change to one branch must be evaluated for applicability to sibling branches.

This is NOT a design principle — it answers: "Is this change complete across all relevant code paths?"

## When to Use

- Implementing a change inside a conditional branch (switch/if-else) that handles a specific entity type
- Writing a spec that describes operations on a specific entity type
- Reviewing a diff that modifies one branch of a conditional structure
- Loaded by code-review skill for systematic checking

## Core Rule

**When you modify a branch in a conditional structure, STOP and check sibling branches before proceeding.**

Identify:
1. What side effect did you add/modify? (dispatch, commit, emit, API call, state mutation)
2. What sibling branches exist in the same conditional?
3. Do those siblings handle related entities that may need the same treatment?

## Passive Mode (Implementation)

**Trigger:** Writing or modifying code inside a conditional branch that handles a specific entity type. Conditional structures include switch statements, if-else chains, and object/map-based dispatch (e.g., `handlers[type]()`).

**Procedure:**

1. Identify the enclosing conditional structure (switch/if-else chain)
2. List all sibling branches and what entity types they handle
3. For each side effect you are adding or modifying, ask:

> **Parallel Path Check**: You added `[side effect]` in the `[entity type A]` branch. Sibling branches handle `[B, C, D]` — do they also need this treatment?

4. If developer says "no" — accept, do not re-prompt

**Do NOT silently implement only the requested branch.** The check must happen before presenting the code.

## Active Mode (Code Review)

**Trigger:** Loaded by code-review via dynamic discovery when `.js`, `.ts`, `.vue`, or `.tsx` files are in the changeset.

**Procedure:**

1. In the diff (current branch vs upstream base), find modified conditional structures
2. Identify which branch was modified and what side effect was added/changed
3. Check sibling branches in the same conditional for corresponding treatment
4. If siblings lack corresponding treatment → finding at **HIGH** severity
5. Escalate to **CRITICAL** if missing side effect involves data deletion, security controls, or financial operations

**Do NOT hedge.** If sibling branches handle related entity types and lack the same side effect, flag it directly. Do not downgrade to Medium or frame as "might need confirmation."

### Scope

- Analyzes only conditional structures that contain at least one diff-modified branch
- Within those structures, examines all sibling branches regardless of whether they appear in the diff
- Does not compare against other feature branches
- Does not auto-fix

### Review Dimensions

For code-review Per-Skill Completeness Checkpoint (Step 5c):

1. **Side-effect consistency** — Side effects in conditional branches are consistently applied across sibling code paths. Must be checked for **every modified conditional structure** in the file, not just one per file.
2. **Cross-file value consistency** — Concrete values (counts, identifiers, variable names) referenced across multiple `.md` files in the same openspec directory are consistent. Must be checked for **every modified value** in `.md` files.
3. **Cross-file claim reconciliation** — When `.md` files in the changeset contain numeric claims (counts, totals, "N items", "replace N") about content detailed in sibling `.md` files, verify the stated numbers match the actual item count in the sibling. Also verify identifier formats match the target file type context (e.g., CSS custom properties for `.js` files, Less variables for `.vue` style blocks). Must be checked for **every numeric claim** that references sibling file content.

## Spec Planning Mode

**Trigger:** Always-on awareness during spec/design writing when the topic involves operations on a specific entity type.

When the spec describes an operation targeting a specific entity type:

> **Parallel Path Check**: This spec describes `[operation]` for `[entity type A]`. Are there sibling entity types (`[B, C, D]`) that need the same operation? If intentionally excluded, document the reason.

The spec should explicitly state which sibling entity types are in-scope or out-of-scope. If the spec author does not address the prompt, the skill does not block.

## Pattern: Side-Effect Consistency

**Condition:** Code adds or modifies a side effect in one branch of a conditional structure.

**Check:** Do sibling branches that handle related entity types also perform the corresponding side effect?

```javascript
// ❌ BAD: Only camera branch gets floorplan cleanup
switch (device.type) {
  case 'camera':
    await deleteDevice(device.id)
    await removeFromFloorplan(device.id) // new side effect
    break
  case 'speaker':
    await deleteDevice(device.id)
    // missing: removeFromFloorplan?
    break
}

// ✅ GOOD: All device types checked
switch (device.type) {
  case 'camera':
    await deleteDevice(device.id)
    await removeFromFloorplan(device.id)
    break
  case 'speaker':
    await deleteDevice(device.id)
    await removeFromFloorplan(device.id) // confirmed needed
    break
}
```

## Pattern: Cross-File Value Consistency

**Condition:** A `.md` file within an openspec directory is modified or a finding identifies an incorrect concrete value (count, identifier, variable name) in such a file.

**Sibling scope:** All `.md` files under the same openspec directory tree (the directory containing `.openspec.yaml`, including subdirectories).

**Check (Review — Active Mode):** When a diff modifies a concrete value in a `.md` file, grep all sibling `.md` files for the old value. If found, flag as **HIGH**:

> **Cross-File Value Check**: `[file A]` changed `[old value]` → `[new value]`. Sibling files `[B, C]` still contain `[old value]` — update needed.

**Check (Fix — when loaded by fix-planning):** Before committing a value fix in one `.md` file, grep the openspec directory (including subdirectories) for all occurrences of the old value across sibling `.md` files. Fix all occurrences in the same commit.

```
# Example: fixing "9 hardcoded" → "8 hardcoded" in design.md
# Before committing, run:
grep -rn "9 hardcoded" --include="*.md" <openspec-directory>/
# Fix ALL matching files, not just the one in the finding
```

## Quick Reference

| Phase | Trigger | Action |
|-------|---------|--------|
| Spec planning | Describing operation for one entity type | Ask: do sibling types need same operation? |
| Implementation | Modifying a branch in conditional structure | STOP — check sibling branches before proceeding |
| Code review | Diff modifies one branch of conditional | Flag siblings lacking corresponding side effect (HIGH) |
| Code review | Diff modifies a concrete value in openspec `.md` | Grep sibling `.md` files for same old value (HIGH) |
| Fix execution | Fixing a value in one openspec `.md` file | Grep directory for all occurrences, fix all in same commit |

## Common Mistakes

| Mistake | Fix |
|---------|-----|
| Implementing only the requested branch without checking siblings | Always identify and check sibling branches before presenting code |
| Flagging parallel path issue but hedging ("might need", "if applicable") | Assert directly — if siblings handle related entities, flag it at HIGH |
| Downgrading severity to Medium because "it depends on business logic" | Default to HIGH; let the developer decide if siblings truly don't need it |
| Only checking the branch in the diff, not reading sibling branches | Read the full conditional structure, not just the diff lines |
| Fixing a value in one `.md` file without grepping sibling files | Before committing, grep the openspec directory for all occurrences of the old value |
| Only matching exact strings when checking `.md` sibling files | Also check semantic equivalents (e.g., "replace 7 + keep 2" implies total 9) |

## Integration with code-review

When loaded by code-review:
- Checklist #17 (Side-Effect Completeness) defers to this skill
- This skill's Review Dimensions become mandatory targets in Per-Skill Completeness Checkpoint (Step 5c)
- The Enclosing-Scope Checkpoint (Step 5a) skips its inline #17 check; this skill handles it via Step 5c

## Future Patterns (Not Yet Active)

Added when backed by real-world cases (at least one missed finding causing rework):

- Error handling consistency
- UI state consistency (loading/disabled)
- Cleanup/teardown consistency
- New enum value completeness
