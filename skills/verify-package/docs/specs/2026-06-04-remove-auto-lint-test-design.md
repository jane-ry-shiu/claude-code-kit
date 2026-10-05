# Remove Auto lint/test from review-workflow and fix-planning

**Date:** 2026-06-04
**Status:** Approved (pending implementation)
**Affected skills:** `review-workflow` (local-branch reference), `fix-planning`
**Touched but not modified:** `shared-verification`, `code-review`, `branch-workflow`

## Goal

Lint and unit-test verification (and any auto-fix loops driven by them) must be triggered **only** by the user via `shared-verification` at `git push` time. No other skill runs `pnpm lint`, `pnpm test:unit`, `npx eslint`, or any equivalent verification command on the user's behalf.

## Why

`shared-verification` already declares itself as the mandatory pre-push gate, with `git push` as its trigger word. Having `review-workflow` and `fix-planning` independently run lint/test creates three problems:

1. **Duplicate work.** Phase 1.5, Phase 4c, and `fix-planning` Step 5a each re-run lint that `shared-verification` will run again at push. Same with tests.
2. **Skill responsibility blur.** `code-review`'s boundaries explicitly say it does not run linters ("assumes CI handles these"). `review-workflow` and `fix-planning` quietly took on that responsibility. The user wants verification consolidated under one user-triggered entry point.
3. **Auto-fix loops surprise the user.** Phase 4c and Phase 1.5 silently commit `fix: resolve lint errors (round N)` and `style: auto-fix eslint errors` commits. The user has decided these belong only to a verification step they explicitly invoke.

## Non-goals

- **Not** removing `shared-verification` itself.
- **Not** removing `fix-planning` Step 5b (finding-level semantic validation). That step verifies "did the fix match the finding's intent" — it is not lint/test and does not overlap with `shared-verification`.
- **Not** modifying `code-review` (already correct).
- **Not** modifying `branch-workflow` (already correctly delegates to `shared-verification` at L123).

## Scope of changes

### A. `~/.claude/skills/review-workflow/references/local-branch.md`

#### A1. Process digraph

Remove nodes `Phase 1.5: Pre-Review Lint` and `Phase 4c: Post-Fix Lint`, and reroute their edges. Resulting flow:

```
Parse input → Phase 1: Collect Diff → Phase 2: Review → Phase 3: Save Findings → BREAKPOINT → Phase 4: Fix → Done
```

#### A2. Remove Phase 1.5 entirely

Delete the entire `## Phase 1.5: Pre-Review Lint Check` section, including all 8 sub-steps (eslint --fix, auto-commit, eslint scan, error-to-finding mapping, merge into Phase 2 findings).

#### A3. Remove Phase 4c entirely

Delete the entire `### Phase 4c: Post-Fix Lint Verification` section, including the 3-round auto-fix loop and its block-and-report behavior.

#### A4. Phase 4b tail edit

In Phase 4b, the line:

> **If all findings are out-of-scope:** skip Phase 4a and `fix-planning`, only insert TODOs (step 2), then run verification (lint + test).

Becomes:

> **If all findings are out-of-scope:** skip Phase 4a and `fix-planning`, only insert TODOs (step 2).

#### A5. Common Mistakes table — remove these rows

| Row to remove |
|---------------|
| `Claiming eslint/tests pass without running them \| fix-planning uses verification-before-completion — evidence before claims` |
| `Skipping Phase 1.5 pre-review lint \| Always run eslint on changed files before code-review — catches lint errors early` |
| `Skipping Phase 4c post-fix lint \| Always run full package lint after fix-planning completes — ensures no lint errors remain` |
| `Including eslint warnings in findings \| Only eslint errors become findings; warnings are ignored` |

(The last row loses its context once Phase 1.5 is gone.)

#### A6. Phase numbering

Phases 1, 2, 3, 4 remain consecutive after the removals. No renumbering required.

---

### B. `~/.claude/skills/fix-planning/SKILL.md`

#### B1. Process digraph

Remove `Lint & Test` node. Resulting flow:

```
Execute plan / Commit simple fixes → Finding-level validation → Output commit list
```

Edge changes:
- `Execute plan` → `Finding-level validation` (was: → `Lint & Test`)
- `Commit simple fixes` → `Finding-level validation` (was: → `Lint & Test`)
- Remove edge `Lint & Test` → `Finding-level validation`

#### B2. Step 5 rewrite

Original Step 5 is a parent heading `## Step 5: Verify` containing two subsections (5a Lint & Test, 5b Finding-Level Validation). Removing 5a leaves 5b as the only content. Collapse to a single section:

```markdown
## Step 5: Finding-Level Validation

Re-read each original finding and verify the fix is semantically correct:

- Does the fix match the finding's suggested fix or intent?
- Does the fix comply with the referenced skill's rules (e.g., if finding
  says "bare `Array<Object>` violates jsdoc rule", is the replacement type
  actually specific)?
- Did the fix introduce new issues in the same area?

If any finding is not properly addressed → fix it before proceeding.
```

Removed elements:
- Original `### 5a: Lint & Test` heading and body (the `pnpm --filter <package> lint` / `pnpm --filter <package> test` block, the `verification-before-completion` REQUIRED SKILL line, and the failure-handling instruction).
- Original `### 5b: Finding-Level Validation` heading.
- Subsection 5b's leading "After lint/test pass," — no longer accurate.
- Subsection 5b's trailing "This step catches 'modified but not correctly fixed' issues that lint/test cannot detect." — comparison target gone.

#### B3. Step numbering

Steps 1, 2, 3, 4, 5, 6 remain consecutive. Step 6 (Output) heading and content unchanged.

#### B4. Common Mistakes table

Remove:

| Row to remove |
|---------------|
| `Skipping verification \| Always run lint + test with evidence` |
| `Claiming success without command output \| Use verification-before-completion` |

Rewrite (replaces existing row):

- Original: `Only running lint/test without checking fix correctness | After lint/test, re-read each finding and verify the fix matches the intent`
- New: `Skipping finding-level validation | Re-read each finding and verify the fix matches the intent before reporting done`

#### B5. Boundaries

No change. The "DOES: Orchestrate fix → commit → verify" line remains accurate — Step 5 is still a verification step (semantic, not mechanical).

---

## Out of scope (intentionally not changed)

| Skill / file | Why untouched |
|--------------|---------------|
| `shared-verification/SKILL.md` | This *is* the consolidated verification entry. |
| `code-review/SKILL.md` | Already declares it does not run lint/test. |
| `branch-workflow/SKILL.md` | Already delegates to `shared-verification` correctly (L123). |
| `code-review/docs/{plans,specs}/2026-06-04-...md` | Historical design docs, not runtime behavior. |

## Validation after change

After applying the edits, the following statements must hold:

1. `grep -rn "pnpm.*lint\|pnpm.*test\|npx eslint" ~/.claude/skills/review-workflow ~/.claude/skills/fix-planning` returns **zero** verification-command matches inside SKILL.md / referenced .md files.
2. `~/.claude/skills/review-workflow/references/local-branch.md` contains no heading matching `Phase 1\.5` or `Phase 4c`.
3. `~/.claude/skills/fix-planning/SKILL.md` contains a single `## Step 5: Finding-Level Validation` heading and no `### 5a` / `### 5b` subheadings.
4. The two SKILLs' Common Mistakes tables no longer reference lint or test execution.
5. `shared-verification/SKILL.md`, `code-review/SKILL.md`, and `branch-workflow/SKILL.md` are byte-for-byte identical to their pre-change content (verify via mtime or hash if needed).

## Future extensions (deferred)

Not part of this change, but worth noting for future work:

- A user may eventually want explicit cross-references in `review-workflow` and `fix-planning` Boundaries pointing at `shared-verification` (mirroring `branch-workflow` L123). Approach B from brainstorming. Deferred — current decision is "clean removal, no replacement signage."
- An end-of-flow reminder line in `fix-planning` Step 6 output ("push 前請自行執行 shared-verification") was considered (Approach C) and rejected — the trigger-word interception design already covers it.
