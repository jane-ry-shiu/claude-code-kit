# Post-Review Validation

Validate all pending review comments after creation, before notifying the user. Catches line number errors, misapplied rules, incorrect severity, and formatting issues.

## When to Run

After Step 6a (all pending review comments created) and before Step 6c (notification). GitHub PR path only — does not apply to local terminal reports.

## Validation Checklist

For each pending comment, run V1 → V2 → V3 → V4 sequentially.

### V1: Line Number Correctness

1. Re-derive the target line number from the diff hunk header using **only the line-derivation algorithm** in `github-pr/references/line-comment.md` (section "Rule: Line Number Must Be Within Diff Hunk" — parse `@@ +new_start @@`, count ` `/`+`/`-` prefixes). Use that file solely for the line-number algorithm; its body-format rules do NOT govern review comment bodies (V4 does).
2. Read the actual code at the comment's `line`/`startLine` from the diff
3. Verify the code at that location matches the subject described in the comment body

**Fail →** Auto-fix: delete comment, recreate with recalculated line. Re-validate once. Still wrong → leave reply for human.

### V2: Rule Applicability

Confirm the rule cited in the comment actually applies to the target file:
- No component-specific rules on page-level `.vue` files
- No Vue-specific rules on plain `.js` utility files
- No test-content rules on non-test files
- The loaded skill that sourced this finding was correctly matched to the file type

**Fail →** Delete comment. Record in discarded list with reason.

### V3: Severity Correctness

Compare the comment's severity against the mapping defined in `checklist.md` and any loaded skill's severity definitions:
- CRITICAL: secrets, input validation
- HIGH: fn length, file length, nesting, immutability, error handling, JSDoc, `<script setup>`, i18n, implicit constraints, constant reuse
- MEDIUM: missing test file, test selectors, commit message
- Design principles: MEDIUM for pre-existing violations worsened by PR, HIGH for new structural violations

**Fail →** Auto-fix: delete comment, recreate with correct severity.

### V4: Language & Format

- Body uses zh-TW (Traditional Chinese)
- Technical terms and code remain in English
- Body does NOT restate the finding's own anchor file:line (that belongs in tool params `path`/`line`/`side`)
- The `參考依據：{file}:{line}` cross-file evidence pointer IS allowed in the body — it is the basis for the finding and usually points to a different file than the anchor
- No bundled multiple issues in one comment

**Fail →** Auto-fix: delete comment, recreate with corrected body.

## Failure Handling

| Outcome | Action |
|---------|--------|
| Auto-fixable (V1, V3, V4) | Delete + recreate with corrected values |
| Rule not applicable (V2) | Delete comment, add to discarded list |
| Indeterminate / auto-fix retry failed | Leave reply on comment via `add_reply_to_pull_request_comment`: `"⚠️ 此 comment 需要人工檢查：{reason}"` |

**Max retry:** 1 attempt per comment per check. If the auto-fix still fails after one retry, flag for human.

## Notification Format (replaces original)

After validation, output:

```
已建立 {N} 筆 pending review comment。

驗證結果：
  ✅ 通過：{N} 筆
  🔧 自動修正：{N} 筆
  🗑️ 丟棄：{N} 筆（規則不適用）
  ⚠️ 需人工檢查：{N} 筆

請到 GitHub 預覽內容：
https://github.com/{owner}/{repo}/pull/{pr_number}
```

When all comments pass with zero fixes/discards/flags, simplify to the original format (no validation summary section).
