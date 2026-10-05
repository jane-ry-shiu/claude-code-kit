# interface-impact-check — Status & Remaining Verification

Last updated: 2026-07-16. Self-contained: a fresh session needs nothing but this file.

## What exists

- `~/.claude/skills/interface-impact-check/SKILL.md` (new, ~215 lines) — the worker skill.
  Explicitly gated: its `description` names no file types, so `code-review`'s dynamic
  discovery cannot auto-load it.
- `~/.claude/skills/code-review/SKILL.md` — modified, 392 → 442 lines, 7 edit regions:
  Step 3c discovery exclusion, Step 3d contract-change gate (3 stages), Step 5b scope row
  (at L232, immediately ABOVE the general "other files → out-of-scope" row — order is
  load-bearing), Step 6 `Interface impact：` header + 未觸發 doc, 2 Boundaries amendments,
  2 Common Mistakes rows.

Design: `docs/specs/2026-07-16-interface-impact-check-design.md`
Plan: `docs/plans/2026-07-16-interface-impact-check.md`

`~/.claude` is NOT a git repo. There are no commits. The backup below is the only rollback.

## VERIFIED

- **Lateral 17 → 6** — blind-tested twice. Run 1 FAILED (17→5 + 1 UNDECIDABLE): the
  discriminator said "becomes part of the entity's data", which cannot classify
  `useTableDeviceActivationTools.js:289` because `initTargetMap` is transient and never
  written back — and that file holds `activationConfigAutoSetup`, the check's whole reason
  to exist. Fixed by ruling on structure, not lifetime. Run 2: 17→6 exact.
- **Gate positive** — signals 1/2/3 fire on the real `deviceVO.js` diff.
- **Gate negative** — constructed comment-only `api/` diff: signal 2 fires, Stage 2 clears
  it, 0 agents. Signal 1 correctly resisted the context-line trap (the helper name appears
  in a context line, but signal 1 requires +/- lines).
- **Description does not leak file types** — dynamic discovery cannot pick it up.

## NOT VERIFIED — the expensive half

**The downstream fan-out (3 lenses: read / write / enumerate) has never been exercised.**
Whether the `write` lens actually surfaces the `activationConfigAutoSetup` dual-`productType`
defect is the check's entire justification, and there is currently zero evidence for it.
Also untested: verdict WARN-not-PASS, ticket-suppression resistance, and the
one-comment-anchored-at-producer output shape.

## How to run the remaining verification

**Order matters — do not read the criteria first.** This session's earlier runs stayed honest
because the expected answers were withheld from whoever ran them. A controller who knows the
expected finding can steer its agents toward it without noticing, and the run proves nothing.

1. Run, and save the output:
   ```
   /review-workflow https://github.com/VIVOTEK-IT/webtech-monorepo/pull/8370
   ```
   PR #8370 is not merged; `review-workflow` Step 2 fetches `pull/8370/head` → the PR branch.

2. **Only after the output is captured**, open the plan's Task 3 Step 5 and compare against
   its five criteria (`grep -n "Step 5: Run the test" -A 20 docs/plans/2026-07-16-interface-impact-check.md`).

3. Then run the cost test (plan Task 3 Step 6): review any recent leaf-component branch with
   no contract change. Header must read `Interface impact：未觸發`, zero agents, token usage
   unchanged. If the gate fires there, signal 2's path list is too broad.

Known-good number for the lateral narrowing on #8370 is **6**, not 5. An earlier draft said 5
— it dropped a wildcard (`FormDeviceActivationManualSetup*.vue` covers two files). Verified
against source at `be031eac5f`.

## Rollback

```bash
cp ~/.claude/skills/.backup-2026-07-16/code-review/SKILL.md ~/.claude/skills/code-review/SKILL.md
rm -rf ~/.claude/skills/interface-impact-check
```

## Constraints that still bind

- `~/vivotek/webtech-monorepo` is READ-ONLY reference. Never modify, never commit.
- `~/.claude` is not a git repo. Do not `git init`. No commits anywhere.
