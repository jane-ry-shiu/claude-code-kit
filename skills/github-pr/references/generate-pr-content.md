# Generate PR Content

Analyze diff content to produce a PR title and description.

## Title Format

Conventional commit style, English:

```
type(scope): [TICKET] description
```

- **type**: infer from diff — `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `chore`
- **scope**: fixed mapping from package path:

| Package path | scope |
|---|---|
| `packages/app-vsaas-portal` | `vsaas-portal` |
| `packages/app-reseller-portal` | `reseller` |

  Other paths: infer from directory name as before.

- **ticket**: required, resolved in this order:
  1. User explicitly provides → use directly
  2. Parse from branch name → regex `[A-Z]+-\d+` (branch format is `<github-username>/<JIRA-KEY>/<type>-<description>`)
  3. Ask user
  4. User declines → omit ticket, show `⚠️ 未提供 ticket number，建議補上`

  Supported format — Jira only: `[VOR-12345]`, `[ADAT-678]` (pattern: `[A-Z]+-\d+`). A Redmine issue number is never used as the ticket tag; that work carries a Jira ticket (see the `redmine` skill).

### Title Examples

```
feat(reseller): [VOR-12345] add export feature
fix(vsaas-portal): [PROJ-678] resolve login redirect loop
refactor(reseller): update store structure          ← no ticket (with warning)
```

## Description Format

繁體中文，結構為「總結 + bullet list + ticket link」：

1. 第一行：一句話總結整體變更方向
2. 空行
3. Bullet list：每條聚焦「做了什麼」，不提檔名
4. 空行
5. Ticket URL（有明確 ticket 時必須附上）

### Scope-Aware Description

Before generating the description, collect scope information to identify out-of-scope changes. Use the first layer that yields results:

1. **User-provided review file** — If the user explicitly provides a review findings file (e.g., branch-review context file), read it and extract in-scope / out-of-scope markers. Most precise source. Do not auto-detect or search for files.
2. **Ticket context + LLM judgment** — Parse the Jira issue key from the branch name. Fetch ticket content (description, acceptance criteria) via API. Use ticket info as supplementary context alongside the diff — LLM judges which changes may fall outside the ticket's scope. Ticket info does not directly determine scope.
3. **Commit message pattern** — Scan commit messages for explicit patterns: `out-of-scope`, `TODO comment for out-of-scope`, etc.
4. **None found** — No annotation. Use standard single bullet list format.

When out-of-scope items are identified, split into two sections:

```markdown
總結句。

- in-scope 項目 1
- in-scope 項目 2

順帶修正（非本次 scope）：
- out-of-scope 項目 1
- out-of-scope 項目 2

https://dibts3.atlassian.net/browse/VOR-12345
```

When no out-of-scope items exist, use standard single bullet list format.

### Ticket URL Rules

When a ticket is identified, append its URL as the last line of the description:

Use the `browse_url` field that `jira_get_issue` returns, verbatim.

Do NOT hardcode the Jira host. The site has been migrated before, and a hardcoded host silently produces links pointing at the wrong instance — a link that still returns a page, so the mistake survives review. If the issue cannot be fetched, ask the user for the URL rather than assembling one.

### Description Examples

```markdown
調整平面圖頁面 UI 樣式以符合設計稿。

- 調整 canvas 控制按鈕位置
- 移除狀態圖例多餘邊框與陰影
- 修正樹狀節點展開箭頭旋轉方向
- canvas 尺寸計算改用 Math.ceil 避免渲染問題

https://dibts3.atlassian.net/browse/VOR-12345
```

With scope-aware split:

```markdown
新增 floor plan 至降級檢查清單。

- 在 DOWNGRADE_MISSION_KEY 新增 FLOOR_PLAN 常數
- 新增 floor plan mission item，包含 title、description 及導向路由
- 新增 floor plan mission 的單元測試，驗證屬性正確性及 verified/unverified 狀態

順帶修正（非本次 scope）：
- 修正 t() mock 為 identity function 以支援文字內容驗證

https://dibts3.atlassian.net/browse/ADAT-15
```

不使用 markdown heading。不列檔名或路徑。

## How to Get Diff

| 情境 | 方式 |
|------|------|
| 當前 branch 開新 PR | `git diff origin/main` |
| 已存在的 PR | `gh pr diff <number>` 或 GitHub API |
| 使用者提供 diff | 直接分析 |

## Common Mistakes

| Mistake | Fix |
|---------|-----|
| Generic title like "update code" | Analyze diff to produce specific conventional commit title |
| Description lists file names | Focus on what was done, not which files |
| Description uses markdown headings | Use plain summary + bullet list only |
| Description in English | Must be 繁體中文 |
| Title in Chinese | Must be English |
