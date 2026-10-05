# Code Review Checklist

Base checklist applied to all code reviews regardless of loaded skills.

## Inspection Strategy

| Check type | What to read |
|------------|-------------|
| Structural checks (function length, file length, nesting, component style) | Full file |
| Change-specific checks (secrets, immutability, error handling, i18n) | Diff hunks only |
| Design principles (OCP, SRP, information leakage, pass-through methods) | Full enclosing scope of each diff hunk (see SKILL.md Step 5a) |
| New / untracked files | Full file (everything is new) |
| Non-code files (`.scss`, `.json`, `.md`, config) | #1 (hardcoded secrets) always; #18 and #19 when changeset contains multiple related `.md` files describing the same entities |

## Security (CRITICAL)

| # | Check | Applies to | What to look for |
|---|-------|-----------|------------------|
| 1 | Hardcoded secrets | All files | API keys, passwords, tokens, private keys in source code |
| 2 | Input validation | `.js`, `.vue` | User inputs without sanitization, innerHTML usage, unparameterized queries |

## Code Quality (HIGH)

| # | Check | Applies to | What to look for |
|---|-------|-----------|------------------|
| 3 | Function length | `.js`, `.vue` | Functions exceeding 80 lines |
| 4 | File length | `.js`, `.vue` | Files exceeding 800 lines |
| 5 | Nesting depth | `.js`, `.vue` | More than 4 levels of nesting (if/for/while/try) |
| 6 | Immutability | `.js`, `.vue` | Direct mutation of objects/arrays (push, splice, direct property assignment on shared state) |
| 7 | Error handling | `.js`, `.vue` | Empty catch blocks, swallowed errors without re-throw or logging. Also check: catch blocks that set an error state (e.g., `state = ERROR`) but do not set a user-facing error message — must have a fallback message |

## Project Conventions (HIGH)

| # | Check | Applies to | What to look for |
|---|-------|-----------|------------------|
| 8 | JSDoc | `.js`, `.vue` `<script>` | Exported functions / public APIs missing JSDoc — **check existence first, then correctness** (missing JSDoc > incorrect JSDoc). If a JSDoc-specific skill is loaded, defer detailed format checks to it |
| 9 | Vue component style | `.vue` only | Options API usage, missing `<script setup>`, `defineComponent()` |
| 10 | i18n | `.vue` `<template>` | Hardcoded user-visible text not wrapped in `$t()` |
| 14 | Implicit constraints | `.js`, `.vue` | Code with non-obvious rules (e.g., order-dependent arrays, entries that must not be removed, naming conventions with semantic meaning) missing a comment explaining the constraint |
| 15 | Constant reuse | `.js`, `.vue` | Magic strings or inline values that duplicate an existing constant, enum, or shared definition elsewhere in the project — should import and reference the single source of truth instead |

## Side-Effect Completeness (HIGH)

| # | Check | Applies to | What to look for |
|---|-------|-----------|------------------|
| 17 | Parallel code path consistency | `.js`, `.vue` | Diff adds a new side effect (dispatch, commit, emit, API call, state mutation) in one branch of a conditional or after a conditional block — check whether sibling branches that handle related entities (child types, variant types, sub-items) also need the same side effect. **Defers to `parallel-path-consistency` skill when loaded.** |

## Testing (MEDIUM)

| # | Check | Applies to | What to look for |
|---|-------|-----------|------------------|
| 11 | Test file exists | `.js`, `.vue` under `src/` in: `api/`, `components/`, `composables/`, `models/`, `stores/`, `utils/`, `pages/` | Missing co-located `*.test.js` or `*.spec.js` file. **Important:** flag this even if the developer did not include a test file in the changeset |
| 12 | Test selectors | `.test.js` | Element selection not using `data-test` attributes (e.g., using class selectors, tag selectors) |
| 16 | Component state completeness | `.vue` (new components only) | New components that fetch data or have async operations must handle all three UI states: loading, error, and empty. Flag if any state is missing or if a state variable exists but is never used in the template |

## Documentation Accuracy

| # | Check | Applies to | What to look for |
|---|-------|-----------|------------------|
| 18 | Cross-file value consistency (new files) | Multiple related `.md` files in the same changeset that describe the same set of entities | When multiple files describe the same entity, concrete values (counts, identifiers, variable names) must be consistent. **Procedure:** for each entity mentioned across files, build a comparison of concrete values from each file and flag discrepancies. Covers creation-time inconsistencies only (no old value to grep); diff-triggered cases defer to `parallel-path-consistency` when loaded. |
| 19 | Spec notation matches target tech context | `.md` spec files describing token/variable/API replacements for specific target files | Technical notation in the spec must match the target file's technology context. Examples include but are not limited to: Vue SFC `<style lang="less">` → Less variables (`@color-*`); JS files using `getComputedStyle` → CSS custom properties (`--color-*`); REST API specs → correct HTTP method and path format. |

## Commit (MEDIUM)

| # | Check | Applies to | What to look for |
|---|-------|-----------|------------------|
| 13 | Commit message | Local changes only | Message not matching `type: description` format. Check `.git/COMMIT_EDITMSG` or ask user. Skip for GitHub PR reviews (commit messages already pushed). |

## Severity Mapping

| Severity | Checks |
|----------|--------|
| CRITICAL | #1 secrets, #2 input validation |
| HIGH | #3 fn length, #4 file length, #5 nesting, #6 immutability, #7 error handling, #8 JSDoc, #9 `<script setup>`, #10 i18n, #14 implicit constraints, #15 constant reuse, #17 parallel code path consistency, #18 cross-file value consistency |
| MEDIUM | #11 test file exists, #12 test selectors, #13 commit message, #16 component state completeness, #19 spec notation matches target |

## Deduplication with Loaded Skills

When a dynamically loaded skill covers the same area as a base check, the skill's deeper analysis takes precedence. Do not duplicate findings.

**Deduplication rules:**
- If a loaded skill provides deeper JSDoc analysis → that skill owns JSDoc findings, base check #8 does not flag separately
- If a loaded skill provides component development rules → that skill owns component convention findings, base check #9 defers to it for component-specific checks
- If a loaded skill provides testing quality rules → that skill owns test quality findings, base checks #11 and #12 still flag missing test files but defer test content quality to the loaded skill
- If a loaded skill provides software design principles → that skill owns structural design findings (e.g., OCP, SRP violations), base checks #3-#7 still apply for mechanical thresholds (line count, nesting depth)
- If a loaded skill provides story file management rules → that skill owns story-related findings, no base check overlap
- If a loaded skill provides parallel path consistency checks → that skill owns side-effect completeness findings, base check #17 does not flag separately

**General principle:** Base checks handle mechanical/threshold checks. Loaded skills handle semantic/design-level analysis. When both could flag the same issue, the loaded skill's finding wins.

**Dedup-to-Checkpoint guarantee:** When deferring a base check to a loaded skill, the loaded skill's Review Dimensions for that area become mandatory coverage targets in the Per-Skill Completeness Checkpoint (code-review Step 5c). This ensures no gap between the base check releasing ownership and the loaded skill picking it up.

| Base Check | Defers To | Mandatory Review Dimensions |
|------------|-----------|----------------------------|
| #8 JSDoc | jsdoc-documentation | Existence, Type correctness, Description quality (invariants, lifecycle/staleness, sync model, error behavior) |
| #9 Vue component style | vue-best-practices | Options ordering, Reactivity correctness, Anti-patterns |
| #11 Test file exists | testing-principles | Test file existence |
| #12 Test selectors | testing-principles | Selector strategy |
| #17 Side-effect completeness | parallel-path-consistency | Side-effect consistency |
| #18 Cross-file value consistency | parallel-path-consistency | Cross-file value consistency (diff-triggered only; Rule 18 retains ownership for newly created files) |
