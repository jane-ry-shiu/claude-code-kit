# PR Output-Format SSOT Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers--subagent-driven-development (recommended) or superpowers--executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stabilize PR review comment format by making `pr-review` defer verbatim to `code-review`'s finding block, and reconcile the two validation rules that conflict with the `證據` field.

**Architecture:** Three markdown edits across two `review-workflow` reference files — (1) `pr-review.md` Step 5 comment body defers verbatim to code-review's per-finding block; (2) `post-review-validation.md` V4 narrows its file:line ban so the `證據` cross-file pointer survives; (3) V1 repoints its broken `line-comment.md` reference to the real `github-pr` path, scoped to the line-derivation algorithm only. `line-comment.md` itself is NOT edited.

**Tech Stack:** Markdown skill files under `~/.claude/skills/`. **`~/.claude` is NOT a git repo** — there is no CI and no per-task `git commit`. Rollback is via a one-time `.backup-2026-07-17/` copy (Task 1). There are no automated tests for skill markdown; each edit is verified with `grep`/read, and a final manual double-run is left for the user.

**Spec:** `~/.claude/skills/review-workflow/docs/specs/2026-07-17-pr-output-format-ssot-design.md`

---

## File Structure

| File | Responsibility | Change |
|---|---|---|
| `~/.claude/skills/review-workflow/references/pr-review.md` | PR-path workflow; Step 5 posts pending comments | Step 5 comment-body spec → defer to code-review finding block (Task 2) |
| `~/.claude/skills/review-workflow/references/post-review-validation.md` | Validates pending comments (V1–V4) | V4 narrow (Task 3); V1 repoint + scope (Task 4) |
| `~/.claude/skills/review-workflow/.backup-2026-07-17/` | Rollback copies | Created in Task 1 |

**Not touched:** `code-review/SKILL.md` (format authority, referenced only), `github-pr/references/line-comment.md` (line-selection canonical), `local-branch.md` (already aligned).

All paths below are absolute for the executor. `~` expands to the user home.

---

### Task 1: Backup both target files (rollback safety)

Because `~/.claude` is not a git repo, this backup replaces per-task commits. Do it once, before any edit.

**Files:**
- Create: `~/.claude/skills/review-workflow/.backup-2026-07-17/pr-review.md`
- Create: `~/.claude/skills/review-workflow/.backup-2026-07-17/post-review-validation.md`

- [ ] **Step 1: Create backup dir and copy both files**

```bash
mkdir -p ~/.claude/skills/review-workflow/.backup-2026-07-17
cp ~/.claude/skills/review-workflow/references/pr-review.md \
   ~/.claude/skills/review-workflow/.backup-2026-07-17/pr-review.md
cp ~/.claude/skills/review-workflow/references/post-review-validation.md \
   ~/.claude/skills/review-workflow/.backup-2026-07-17/post-review-validation.md
```

- [ ] **Step 2: Verify both backups exist and are non-empty**

Run:
```bash
ls -l ~/.claude/skills/review-workflow/.backup-2026-07-17/
```
Expected: both `pr-review.md` and `post-review-validation.md` listed with non-zero size.

Rollback at any point: copy the two backups back over `references/`.

---

### Task 2: `pr-review.md` Step 5 — defer comment body to code-review finding block

**Files:**
- Modify: `~/.claude/skills/review-workflow/references/pr-review.md` (Step 5, ~lines 84–92)

- [ ] **Step 1: Confirm the current text is present**

Run:
```bash
grep -n "Body in zh-TW with severity tag" ~/.claude/skills/review-workflow/references/pr-review.md
```
Expected: one match (around line 90). If no match, STOP — the file drifted from the plan; re-read Step 5 before editing.

- [ ] **Step 2: Apply the edit**

Replace this exact block:

```
2. For each validated finding, add a comment: `add_comment_to_pending_review`
   - One finding per comment
   - Line-level annotation (file, line, side)
   - Body in zh-TW with severity tag
```

with:

````
2. For each validated finding, add a comment: `add_comment_to_pending_review`
   - One finding per comment
   - Line-level annotation via tool params: the finding's own anchor `{file}:{line}` → `path` / `line` / `startLine` / `side`. NOT repeated in body.
   - **Body = code-review's finding block, verbatim.** Take that finding's block from code-review's Step 6 output and use it as the comment body, prefixed with a severity tag. Do NOT reformat, reorder, drop, or rename fields.

     Body layout (per finding):

     ```
     [{severity}] [{category}] {issue description}
     規則來源：{skill name}
     修復參照：{skill name} → {section}
     證據：{file}:{line} — {實際讀到的內容}
     導致問題：{what this causes}
     期望目標：{what the correct state should be}
     建議修復：{tiered strategy}
     ```

   - Empty fields keep their label using code-review's degraded form (e.g. `修復參照：N/A`).
   - Report-envelope lines never go in a body: `檢查檔案數 / 候選規則 / 實際套用 / Interface impact / 摘要 / 結論`, nor the `CRITICAL/HIGH/MEDIUM/LOW` group headers — severity is carried by the per-comment `[{severity}]` tag.
````

- [ ] **Step 3: Verify old text gone, new text present**

Run:
```bash
grep -n "Body in zh-TW with severity tag" ~/.claude/skills/review-workflow/references/pr-review.md; echo "---"
grep -n "Body = code-review's finding block, verbatim" ~/.claude/skills/review-workflow/references/pr-review.md
```
Expected: first grep = **no match**; second grep = **one match**.

- [ ] **Step 4: Verify the Step 5 reminder line is still intact (edit did not eat neighbors)**

Run:
```bash
grep -n "Do NOT pass .event. to the create call" ~/.claude/skills/review-workflow/references/pr-review.md
```
Expected: one match (the `**Reminder:**` line directly after the edited block).

---

### Task 3: `post-review-validation.md` V4 — narrow the file:line ban

**Files:**
- Modify: `~/.claude/skills/review-workflow/references/post-review-validation.md` (V4, ~line 45)

- [ ] **Step 1: Confirm the current text is present**

Run:
```bash
grep -n "Body does NOT contain file paths or line numbers" ~/.claude/skills/review-workflow/references/post-review-validation.md
```
Expected: one match (around line 45). If no match, STOP and re-read V4.

- [ ] **Step 2: Apply the edit**

Replace this exact line:

```
- Body does NOT contain file paths or line numbers (these belong in tool parameters)
```

with these two lines:

```
- Body does NOT restate the finding's own anchor file:line (that belongs in tool params `path`/`line`/`side`)
- The `證據：{file}:{line}` cross-file evidence pointer IS allowed in the body — it is the basis for the finding and usually points to a different file than the anchor
```

- [ ] **Step 3: Verify old text gone, new text present**

Run:
```bash
grep -n "Body does NOT contain file paths or line numbers" ~/.claude/skills/review-workflow/references/post-review-validation.md; echo "---"
grep -n "cross-file evidence pointer IS allowed" ~/.claude/skills/review-workflow/references/post-review-validation.md
```
Expected: first grep = **no match**; second grep = **one match**.

- [ ] **Step 4: Verify the other V4 sub-items survived**

Run:
```bash
grep -n "No bundled multiple issues in one comment" ~/.claude/skills/review-workflow/references/post-review-validation.md
```
Expected: one match (V4's last sub-item, untouched).

---

### Task 4: `post-review-validation.md` V1 — repoint reference + scope to algorithm

**Files:**
- Modify: `~/.claude/skills/review-workflow/references/post-review-validation.md` (V1, ~line 15)

- [ ] **Step 1: Confirm the current text is present**

Run:
```bash
grep -n "using the algorithm in .line-comment.md." ~/.claude/skills/review-workflow/references/post-review-validation.md
```
Expected: one match (around line 15). If no match, STOP and re-read V1.

- [ ] **Step 2: Confirm the real target file exists (so the repoint is valid)**

Run:
```bash
ls -l ~/.claude/skills/github-pr/references/line-comment.md
```
Expected: file exists. (This is the canonical the reference should have pointed to all along.)

- [ ] **Step 3: Apply the edit**

Replace this exact line:

```
1. Re-derive the target line number from the diff hunk header using the algorithm in `line-comment.md` (parse `@@ +new_start @@`, count ` `/`+`/`-` prefixes)
```

with:

```
1. Re-derive the target line number from the diff hunk header using **only the line-derivation algorithm** in `github-pr/references/line-comment.md` (section "Rule: Line Number Must Be Within Diff Hunk" — parse `@@ +new_start @@`, count ` `/`+`/`-` prefixes). Use that file solely for the line-number algorithm; its body-format rules do NOT govern review comment bodies (V4 does).
```

- [ ] **Step 4: Verify old bare reference gone, new scoped reference present**

Run:
```bash
grep -n "using the algorithm in .line-comment.md." ~/.claude/skills/review-workflow/references/post-review-validation.md; echo "---"
grep -n "github-pr/references/line-comment.md" ~/.claude/skills/review-workflow/references/post-review-validation.md
```
Expected: first grep = **no match**; second grep = **one match**.

---

### Task 5: Final verification

Automated checks the executor runs now, plus a manual double-run the user runs later.

- [ ] **Step 1: No dangling bare `line-comment.md` reference remains in review-workflow**

Run:
```bash
grep -rn "line-comment.md" ~/.claude/skills/review-workflow/references/
```
Expected: the only match is the V1 line, and it reads `github-pr/references/line-comment.md` (qualified path), not a bare `line-comment.md`.

- [ ] **Step 2: No self-contradiction — V4 no longer bans all file:line**

Run:
```bash
grep -n "does NOT contain file paths or line numbers" ~/.claude/skills/review-workflow/references/post-review-validation.md
```
Expected: **no match** (the absolute ban is gone; only the narrowed anchor rule + 證據 allowance remain).

- [ ] **Step 3: Confirm Section 1 body layout is discoverable in pr-review**

Run:
```bash
grep -n "證據：{file}:{line}" ~/.claude/skills/review-workflow/references/pr-review.md
```
Expected: one match (the body-layout block from Task 2).

- [ ] **Step 4 (MANUAL — user runs): Double-run format-stability check**

This cannot be done by editing files; it validates behavior. Hand back to the user with these instructions (from spec 驗證方式):

1. Run `review-workflow` on the same GitHub PR **twice**. Compare the two sets of pending comments — the **format** (fields, order, `[{severity}]` tag position) should now be identical run-to-run.
2. Pick a finding whose `證據` file differs from its anchor file: its body must **keep** `證據：{file}:{line}`, and V4 must NOT have stripped it.
3. Confirm each comment's GitHub line annotation (`path`/`line`/`side`) lands on the anchor, and the body does **not** repeat the anchor line number.
4. Spot-check one comment body against code-review's terminal output for the same finding — fields should match **line-for-line** (deferral holds).

Report results back; if any check fails, roll back via `.backup-2026-07-17/` and reopen the spec.

---

## Rollback

```bash
cp ~/.claude/skills/review-workflow/.backup-2026-07-17/pr-review.md \
   ~/.claude/skills/review-workflow/references/pr-review.md
cp ~/.claude/skills/review-workflow/.backup-2026-07-17/post-review-validation.md \
   ~/.claude/skills/review-workflow/references/post-review-validation.md
```
