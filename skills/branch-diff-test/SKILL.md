---
name: branch-diff-test
description: Analyze current branch UI changes vs baseline and generate a manual testing checklist with before/after comparisons. Trigger when user asks what changed, needs a test plan for the branch, or invokes directly.
---

# Branch Diff Test

Analyze the current branch's UI-visible changes relative to a baseline and output a Markdown checklist for manual testing.

## Trigger

- User asks what changed on the current branch
- User requests a test checklist for the branch
- User invokes directly: "branch diff test", "這個 branch 改了什麼", "幫我列出要測的東西"

## Arguments

Optional baseline override. If user passes an argument (e.g., `origin/feature-x`), use it as the baseline instead of auto-detection.

## Execution

### 1. Determine Baseline

Run in order, use the first that succeeds:

1. **User-specified**: If argument was passed, use it directly
2. **PR base**: Run `gh pr view --json baseRefName -q .baseRefName 2>/dev/null`. If it returns a value, use `origin/<baseRefName>`
3. **upstream/main**: Run `git rev-parse --verify upstream/main 2>/dev/null`. If it exists, use `upstream/main`
4. **origin/main**: Fallback

Store the resolved baseline and its short SHA for the output header.

### 2. Collect UI-Relevant Diff

Run:
```bash
git diff <baseline>...HEAD --name-status
```

**Include** files matching:
- `*.vue`
- `src/constants/**`
- `src/locales/**` or any `*.json` under locale/i18n paths
- `src/styles/**`, `*.scss`
- `src/router/**`
- `src/assets/svg/**`

**Exclude**:
- `*.test.js`, `*.spec.js`
- `vite.config.*`, `eslint.*`, `.env*`, `*.md`
- Files where the diff is ONLY within `<script setup>` and does NOT touch any reactive value used in `<template>` (use judgment — if uncertain, include it)

If no UI-relevant files remain → output "No UI-visible changes found on this branch" with a list of changed non-UI files, then stop.

If >30 UI files changed → summarize by feature area first, ask user if they want full detail or want to focus on a specific area.

### 3. Analyze Each Changed File

For each UI-relevant file, run `git diff <baseline>...HEAD -- <filepath>` and read the diff.

Extract changes in these categories:

| Category | What to extract |
|----------|----------------|
| **Text** | Static text in template, `$t()` key changes, constants with display labels, placeholder text |
| **Style** | Class additions/removals, SCSS property changes, Vuetify props (`variant`, `color`, `size`, `density`, `elevation`), inline styles |
| **Structure** | Component add/remove, `v-if`/`v-show` condition changes, slot content changes, new/removed DOM elements |
| **Interaction** | `@click` handler changes, form field add/remove, dialog/modal triggers, `v-model` changes, navigation (`router-link`, `$router.push`) |

For each change, note the **old value** and **new value** explicitly.

### 4. Locate Page/Route for Each File

For each changed file, determine the page it belongs to:

**Method A (fast, try first):**
- File is under `src/pages/` → read `src/router/routes/` to find matching route path and nav label
- File is under `src/router/` → it IS the route definition; note what pages/paths changed

**Method B (fallback):**
- File is under `src/components/` → extract component name, grep for it in `src/pages/` and `src/router/routes/`
- If found → note the parent page
- If not found → grep component name across `src/` to find importers, trace up

**If neither works:**
- Mark with `⚠️ 需確認所在頁面`

For constants/i18n/style files, determine which components consume them by grepping for the changed keys/classes.

### 5. Generate Output

Use this exact format:

```
## Branch 改動測試清單

Baseline: `<resolved-baseline>` (<short-sha>)
Branch: `<current-branch>` (<short-sha>)
比較範圍: <N> commits

---

### <Page Name 中文>
> 路徑：<how to navigate there, e.g., 側邊欄 > License Management>

- [ ] <具體操作步驟>
  - <驗證項目>: `<舊版>` → `<新版>`
  - <樣式備註 if applicable>

### ⚠️ 需確認所在頁面
- [ ] `<file-path>`
  - <改動描述>: `<舊版>` → `<新版>`
```

### Grouping & Ordering Rules

- Group items by **page/route**, not by file
- Within a page, order by user flow: top → bottom, left → right
- If multiple files contribute to one visual change, consolidate into **one** test item
- Constants/enum changes → note which dropdown/list/table displays them
- Deleted pages → "確認 `<page>` 已不可存取（路由應 404 或 redirect）"
- Deleted components → "確認 `<component>` 已從頁面移除"
- New pages → full navigation path + key elements to verify

### Dynamic Content Flag

If a change involves computed props, API-driven rendering, or conditional logic that depends on runtime data, append:

> ⚠️ 動態內容，需配合實際資料驗證

### i18n Handling

When i18n keys change:
- Show the key name and the **zh-TW** (or **en** if zh-TW unavailable) translation value
- Do NOT list all locales
- Note if the key was added, removed, or its value changed
