# Batch Strategy

When a review involves many changed files, split into batches by file type to keep each batch focused and manageable.

## When to Batch

| Condition | Action |
|-----------|--------|
| Total changed files ≤ 15 | Single pass, no batching |
| Total changed files > 15 | Split into batches |

## Batch Order

| Batch | Contents | Skill Loading |
|-------|----------|---------------|
| 1 — Core logic | `.js` and `.vue` files (excluding test files), **including `route.js` / `router/*.js`** | Load all skills applicable to these file types |
| 2 — Test files | `*.test.js`, `*.spec.js` | Load skills applicable to test files |
| 3 — Config/Style/Other | `.scss`, `.json`, `.md`, config files, etc. (excluding route files — those belong in Batch 1) | Base checklist only (#1 secrets scan) |

**Why route files are Core Logic:** Route files define permissions (`meta.permission`), navigation guards, and auth requirements. They are behavioral logic, not static configuration. Misclassifying them as config causes implicit constraint checks (#14) and convention checks to be skipped.

## Batch Flow

```
Review Batch 1 (core logic)
  → Output findings
  → "Batch 1 完成。是否繼續 review 下一批（測試檔案）？"
  → User confirms
Review Batch 2 (test files)
  → Output findings
  → "Batch 2 完成。是否繼續 review 下一批（config/style/其他）？"
  → User confirms
Review Batch 3 (config/style/other)
  → Output findings
  → Final summary
```

## Empty Batches

If a batch has no files (e.g., no test files changed), skip it silently and move to the next batch. Do not ask the user about empty batches.

## GitHub PR Output

For GitHub PR reviews, all batches accumulate into the same pending review. Do not create separate reviews per batch. The notification is sent only after the final batch (or when the user stops).

## Local Changes Output

For local changes, each batch produces its own terminal report section. A final summary aggregates all findings across batches.

```
━━━━━━━━━━━━ Code Review — Batch 1: Core Logic ━━━━━━━━━━━━
...findings...

━━━━━━━━━━━━ Code Review — Batch 2: Test Files ━━━━━━━━━━━━
...findings...

━━━━━━━━━━━━ Code Review — Final Summary ━━━━━━━━━━━━
總檢查檔案數：{N}
摘要：{N} CRITICAL, {N} HIGH, {N} MEDIUM, {N} LOW
結論：{verdict}
```
