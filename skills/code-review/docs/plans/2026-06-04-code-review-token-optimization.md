# Code Review Skill Token 優化 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在不犧牲 review 品質前提下，將典型 branch review token 用量降低 50% 以上 — 透過 lazy skill loading、light/heavy 模式分流、finding 模板分層，並移除 review/fix 階段的 lint/test 步驟。

**Architecture:** 改動集中在三個 user-level skill 檔案。`code-review/SKILL.md` 引入 Mode Decision 與兩階段 lazy loading；`review-workflow/references/local-branch.md` 移除 Phase 1.5 / 4c；`fix-planning/SKILL.md` 移除 Step 5a，保留 finding-level validation。`shared-verification`、`references/checklist.md`、`references/batch-strategy.md` 不動。

**Tech Stack:** Markdown skill 檔案；無 lint / unit test；驗證透過 manual scenario walk-through。

**Spec:** `~/.claude/skills/code-review/docs/specs/2026-06-04-code-review-token-optimization-design.md`

---

## State at Start (2026-06-05)

外部 terminal 已預先完成 Phase 2 與 Phase 3 大部分改動（wording 與 plan 略有差異，採用外部版本）。本 plan 執行時會跳過已完成 task，僅做 sanity check。

| Task | 狀態 | 備註 |
|---|---|---|
| Phase 0 | 待執行 | Backup 以外部當前狀態為 baseline |
| Phase 1（全部） | 待執行 | `code-review/SKILL.md` 未被外部改動 |
| Task 2.1 流程圖更新 | ✅ Skip — 已完成 | |
| Task 2.2 移除 Phase 1.5 | ✅ Skip — 已完成 | |
| Task 2.3 移除 Phase 4c | ✅ Skip — 已完成（wording 略簡，採用外部版） | |
| Task 2.4 Common Mistakes 清理 | ✅ Skip — 已完成 | |
| Task 2.5 Phase 2 sanity check | 待執行 | |
| Task 3.1 流程圖更新 | ✅ Skip — 已完成 | |
| Task 3.2 Step 5 重整 | ✅ Skip — 已完成（少了「CI owns that layer」說明，採用外部版） | |
| Task 3.3 Cross-ref 3c → 3d Stage 1 | 待執行 | 必須在 Phase 1 完成後做 |
| Task 3.4 Common Mistakes 改寫 | ✅ Skip — 已完成（wording 略簡，採用外部版） | |
| Task 3.5 Phase 3 sanity check | 待執行 | |
| Phase 4 | 待執行 | Manual scenario 走查 |

---

## File Structure

| 檔案 | 動作 | 改動範圍 |
|---|---|---|
| `~/.claude/skills/code-review/SKILL.md` | Modify | Step 3 結構重排（新增 3b Mode Decision，原 3b/3c 後移為 3c/3d）；Step 5 加入 per-file activation；Step 5c 改 wording；Step 6 header + finding 模板分層；Common Mistakes 增條 |
| `~/.claude/skills/review-workflow/references/local-branch.md` | Modify | 流程圖更新；移除 Phase 1.5 與 Phase 4c；Common Mistakes 移除四條 |
| `~/.claude/skills/fix-planning/SKILL.md` | Modify | 流程圖移除 Lint & Test 節點；移除 Step 5a；Step 5b 升為 Step 5；Common Mistakes 改寫；cross-reference 更新（3c → 3d） |
| `~/.claude/skills/.backup-2026-06-04/` | Create | 備份三個原檔案，rollback 用 |

---

## Step Restructure 決議

`code-review/SKILL.md` Step 3 子步驟在本次重排為：

| 舊 | 新 | 變更 |
|---|---|---|
| 3a File Classification | 3a File Classification | 不變 |
| —— | **3b Mode Decision** | 新增 |
| 3b Page Detection | 3c Page Detection | 編號後移；行為依 mode 分流 |
| 3c Skill Discovery | 3d Skill Discovery | 編號後移；改為 Stage 1 candidate discovery |

**為何 Mode Decision 排在 3a 之後 3c (Page Detection) 之前：** Mode 判斷只需 file list + file classification，不需 page detection 結果；而 Page Detection 在 light mode 要省略 router config 讀取，必須先知道 mode 才能分流。Spec 中「Step 3 結束後決定」一句以 3a 結束時間點落地。

連帶 cross-reference 更新：
- `code-review/SKILL.md` 第 128 行「(Step 3b)」→「(Step 3c)」
- `fix-planning/SKILL.md` 第 41 行「Step 3c」→「Step 3d」

---

## Phase 0: Backup

### Task 0.1: 建立備份目錄並複製三個檔案

**Files:**
- Create: `~/.claude/skills/.backup-2026-06-04/code-review/SKILL.md`
- Create: `~/.claude/skills/.backup-2026-06-04/review-workflow/references/local-branch.md`
- Create: `~/.claude/skills/.backup-2026-06-04/fix-planning/SKILL.md`

- [ ] **Step 1: 建立備份目錄結構**

Run:

```bash
mkdir -p ~/.claude/skills/.backup-2026-06-04/code-review
mkdir -p ~/.claude/skills/.backup-2026-06-04/review-workflow/references
mkdir -p ~/.claude/skills/.backup-2026-06-04/fix-planning
```

Expected: 三個目錄建立完成，無錯誤輸出。

- [ ] **Step 2: 複製三個原檔案至備份目錄**

Run:

```bash
cp ~/.claude/skills/code-review/SKILL.md ~/.claude/skills/.backup-2026-06-04/code-review/SKILL.md
cp ~/.claude/skills/review-workflow/references/local-branch.md ~/.claude/skills/.backup-2026-06-04/review-workflow/references/local-branch.md
cp ~/.claude/skills/fix-planning/SKILL.md ~/.claude/skills/.backup-2026-06-04/fix-planning/SKILL.md
```

- [ ] **Step 3: 驗證備份檔案存在且非空**

Run:

```bash
ls -l ~/.claude/skills/.backup-2026-06-04/code-review/SKILL.md \
      ~/.claude/skills/.backup-2026-06-04/review-workflow/references/local-branch.md \
      ~/.claude/skills/.backup-2026-06-04/fix-planning/SKILL.md
```

Expected: 三個檔案皆存在，size > 0。

---

## Phase 1: 修改 code-review/SKILL.md

### Task 1.1: Step 3 區塊重組 — 插入 3b Mode Decision、原 3b/3c 後移

**Files:**
- Modify: `~/.claude/skills/code-review/SKILL.md`（取代 Step 3 整個 section）

- [ ] **Step 1: 用 Edit 取代「### Step 3: Classify Files & Discover Skills」整段**

`old_string` 為從 line 72 的 `### Step 3: Classify Files & Discover Skills` 開始、到 line 132（`After identifying applicable skills, **read each skill's full SKILL.md** to load its rules before proceeding to review.`）為止的整段；`new_string` 為以下內容：

````markdown
### Step 3: Classify Files, Decide Mode & Discover Skills

#### 3a. File Classification

Classify each changed file:

| Category | Pattern |
|----------|---------|
| Core logic | `.js`, `.vue` (non-page) |
| Test files | `*.test.js`, `*.spec.js` |
| Config/Style/Other | `.scss`, `.json`, `.md`, config files, etc. |

#### 3b. Mode Decision

Decide review **mode** once, based on the changeset characteristics gathered in Step 2 + 3a. The decision applies through the rest of the review and does NOT switch mid-flow.

**Mode = `light`** when multiple of the following hold:
- Changes concentrated in a few leaf components, utilities, or bug fixes
- No touches to router / auth / permission / cross-module dispatch
- No new branches added to existing if / switch chains
- No new or significant changes to model / store / API client
- Small line count and narrow file scope

**Mode = `heavy`** when ANY of the following hold:
- Touches router config / permission meta / navigation guards
- Changes span multiple distinct feature modules
- Adds new branches to existing structures (OCP risk)
- Adds or modifies models, stores, composables, or service-layer code
- Includes new components (loading / error / empty state need verification)
- Changeset includes multiple `.md` spec files (may need cross-file consistency)

**User override:** If the user explicitly specifies mode when triggering review (e.g.,「review current branch，用 heavy 模式」), use that mode and skip the heuristic.

**Behavior diff between modes:**

| Step | Light | Heavy |
|---|---|---|
| 3c (Page detection) | Skip router config read; use only `src/pages/` `src/views/` path conventions | Read router config (current behavior) |
| 3d (Skill discovery) | Two-stage lazy loading | Two-stage lazy loading |
| 5a (Enclosing-Scope Checkpoint) | Retained | Retained |
| 5c (Per-Skill Completeness Checkpoint) | Retained | Retained |
| 6 (Finding template) | 4 fields | 6 fields |

Record the resolved mode and the one-line reason for output in Step 6.

#### 3c. Page Detection

To distinguish page-level `.vue` from component `.vue`:

**Heavy mode:**
1. Read router config files (search for `routes` directory or `router/` directory)
2. Extract file paths referenced in route definitions
3. Also check common conventions: `src/pages/`, `src/views/`
4. `.vue` files matching these paths = page-level

**Light mode:**
1. Use only path conventions: `src/pages/`, `src/views/`
2. `.vue` files under these directories = page-level
3. Skip router config read

#### 3d. Skill Discovery (Stage 1 — Candidate Identification)

This step produces a **candidate skill list**. Skill SKILL.md bodies are NOT read here — they are read on demand in Step 5 (Stage 2 activation).

##### Mandatory Skills

Certain skills are always candidates when file conditions are met:

| Condition | Mandatory Skill |
|-----------|----------------|
| Any `.js`, `.ts`, `.vue` file changed | naming-conventions |

Mandatory skills are activated immediately at the start of Step 5 (their SKILL.md is read once before per-file iteration begins).

##### User-Specified Skills

Users can specify extra skills when triggering review, e.g.:
"review current branch，也要檢查 naming-conventions"

User-specified skills become candidates unconditionally, not subject to file type or discovery logic.

##### Dynamic Discovery

Loading order: mandatory → dynamic discovery → user-specified. The candidate set is the union of all three.

Scan all available skills' descriptions only (do NOT read SKILL.md bodies). For each skill, evaluate whether its description indicates it is relevant to **writing, modifying, or reviewing** the types of files present in the changeset. Mark as candidate if:

1. The skill's description mentions applicability to the file types being changed (e.g., `.js`, `.vue`, test files)
2. The skill's description indicates it provides rules, conventions, or quality checks relevant to code review
3. The project configuration matches any prerequisites mentioned in the skill's description (e.g., a skill that requires Storybook should only load if the project has Storybook installed)

**Do NOT add as candidate skills whose descriptions indicate they are for:**
- Creative work, brainstorming, or planning
- Reading/analyzing external resources (Jira, Confluence, Redmine)
- Saving, exporting, or generating documentation
- Language/response formatting

**Special conditions:**
- When source files in testable directories (`api/`, `components/`, `composables/`, `models/`, `stores/`, `utils/`, `pages/`) are changed, add testing-related skills as candidates even if no test files are in the changeset — to check whether tests should exist but are missing
- When `.vue` files are changed, check if they are page-level (Step 3c). Page-level `.vue` files should not trigger component-specific candidate skills
- Design principles skills should be loaded in **active mode** when activated, to catch structural violations like growing conditional chains (OCP), information leakage, pass-through methods, etc.

The output of this step is a candidate list with `{skill name, applicability hint}` per entry. Each candidate's full SKILL.md is read on first applicable file in Step 5 (Stage 2 activation), then cached for the remainder of the review session.
````

Expected: 取代後 line 數會比原檔多（新增了 Mode Decision 段），其餘原檔尾段（Step 4 開始）不變。

- [ ] **Step 2: 驗證 Step 3 重排後文件結構**

Run: 用 Read 工具讀取改後檔案 line 70-160，確認段落順序為 3a → 3b → 3c → 3d，且每個子段都有 `####` 標題與內容。

Expected: 結構完整，無斷裂。

---

### Task 1.2: Step 5 加入 per-file activation 規則

**Files:**
- Modify: `~/.claude/skills/code-review/SKILL.md`

- [ ] **Step 1: 用 Edit 取代 Step 5 開頭至 sub-list 結束**

`old_string`：

```markdown
### Step 5: Review Current Batch

For each file in the batch:

1. **Read full file** for structural checks
2. **Read diff hunks** for change-specific checks (local: `git diff HEAD -- <file>`, PR: from PR diff)
3. **New/untracked files** → read full file
4. **Duplicate suppression** — before emitting a finding, scan the target line ±3 lines for an existing `// TODO: ... (ref: branch-review-...)` comment. If found and the TODO description semantically matches the finding, skip it.
5. **Apply base checklist** — see [checklist.md](references/checklist.md)
6. **Apply loaded skill rules** — evaluate against each discovered skill's criteria
7. **Classify scope** (if branch objective provided) — see Step 5b below
```

`new_string`：

```markdown
### Step 5: Review Current Batch

**Activation prelude (run once before per-file loop):**

1. Read SKILL.md of every **mandatory** candidate (e.g., naming-conventions) and cache its rules
2. Read SKILL.md of every **user-specified** candidate and cache its rules
3. Initialize an empty `activated` set; mandatory + user-specified candidates start in `activated`

For each file in the batch:

1. **Read full file** for structural checks
2. **Read diff hunks** for change-specific checks (local: `git diff HEAD -- <file>`, PR: from PR diff)
3. **New/untracked files** → read full file
4. **Stage 2 activation (per-file)** — for each candidate from Step 3d not yet in `activated`:
   - Check whether its applicability hint matches THIS file
   - If matched → read its SKILL.md once, cache rules, add to `activated`
   - If unmatched → leave as candidate (may activate on a later file)
   - If SKILL.md read fails (file missing, parse error) → skip this skill for this file, log a warning, continue
5. **Duplicate suppression** — before emitting a finding, scan the target line ±3 lines for an existing `// TODO: ... (ref: branch-review-...)` comment. If found and the TODO description semantically matches the finding, skip it.
6. **Apply base checklist** — see [checklist.md](references/checklist.md)
7. **Apply activated skill rules** — evaluate against each activated skill's criteria
8. **Classify scope** (if branch objective provided) — see Step 5b below
```

Expected: Step 5 序言段插入完成，per-file loop 從 6 步擴為 8 步（多了 Stage 2 activation 與 SKILL.md 讀取失敗降級）。

---

### Task 1.3: Step 5c — 改「every loaded skill」為「every activated skill」

**Files:**
- Modify: `~/.claude/skills/code-review/SKILL.md`

- [ ] **Step 1: 用 Edit 取代 Step 5c 整段**

`old_string`：

```markdown
#### 5c. Per-Skill Completeness Checkpoint

After reviewing a batch and before outputting findings, verify that every loaded skill's Review Dimensions have been checked against every applicable file.

**Procedure:**

1. For each loaded skill that has a `## Review Dimensions` section, read its dimensions and applicability rule
2. For each file in the batch that matches the skill's applicability rule:
   - Confirm each dimension was checked (either a finding was produced, or the file was verified clean for that dimension)
   - If a dimension was skipped, go back and check it
3. Merge any new findings into the findings list

**Fallback:** If a loaded skill does not have a `## Review Dimensions` section, skip the checkpoint for that skill. The review proceeds normally using the skill's rules without the checkpoint guarantee.

**Relationship to Enclosing-Scope Checkpoint (5a):** 5a ensures design principles (OCP, Information Hiding, SRP) evaluate full method/class scope. 5c ensures all loaded skills' remaining dimensions are covered across all applicable files. For software-design-principles specifically, 5a covers OCP/Information Hiding/SRP; 5c only covers Pass-through. No duplication.
```

`new_string`：

```markdown
#### 5c. Per-Skill Completeness Checkpoint

After reviewing a batch and before outputting findings, verify that every **activated** skill's Review Dimensions have been checked against every applicable file.

**Procedure:**

1. For each activated skill that has a `## Review Dimensions` section, read its dimensions and applicability rule
2. For each file in the batch that matches the skill's applicability rule:
   - Confirm each dimension was checked (either a finding was produced, or the file was verified clean for that dimension)
   - If a dimension was skipped, go back and check it
3. Merge any new findings into the findings list

**Candidate but not activated:** Skills that remained candidates without activation indicate that no file in the batch triggered their applicability hint — there is no coverage gap to check, so they are excluded from this checkpoint. This is by design (Stage 2 activation in Step 5).

**Fallback:** If an activated skill does not have a `## Review Dimensions` section, skip the checkpoint for that skill. The review proceeds normally using the skill's rules without the checkpoint guarantee.

**Relationship to Enclosing-Scope Checkpoint (5a):** 5a ensures design principles (OCP, Information Hiding, SRP) evaluate full method/class scope. 5c ensures all activated skills' remaining dimensions are covered across all applicable files. For software-design-principles specifically, 5a covers OCP/Information Hiding/SRP; 5c only covers Pass-through. No duplication.
```

Expected: 三處「loaded」改為「activated」；新增「Candidate but not activated」段。

---

### Task 1.4: Step 6 header — Mode 與 Candidate/Activated 兩行

**Files:**
- Modify: `~/.claude/skills/code-review/SKILL.md`

- [ ] **Step 1: 用 Edit 取代 Step 6 模板 header（第一個 code block 開頭至「Branch 目標」那一行）**

`old_string`（Step 6 第一個 code block 的前四行）：

```
━━━━━━━━━━━━ Code Review ━━━━━━━━━━━━

檢查檔案數：{N}
載入規則：{list of loaded skills}
Branch 目標：{objective or "未提供"}
```

`new_string`：

```
━━━━━━━━━━━━ Code Review ━━━━━━━━━━━━

檢查檔案數：{N}
Mode：{light | heavy}（{one-line reason}）
候選規則：{full candidate list from Step 3d}
實際套用：{activated subset after Step 5}
Branch 目標：{objective or "未提供"}
```

Expected: header 多兩行（Mode、候選/實際套用拆兩行），其餘 finding 段落仍待後續 task 改寫。

---

### Task 1.5: Step 6 finding 模板分層 — Light vs Heavy

**Files:**
- Modify: `~/.claude/skills/code-review/SKILL.md`

- [ ] **Step 1: 用 Edit 取代 Step 6 模板中四個 severity 的 finding 範例（CRITICAL / HIGH / MEDIUM / LOW 四段）**

`old_string`（Step 6 模板從 `CRITICAL（必須修復）[in-scope]：` 開始，到 `※ 超出 branch 目標，將以 TODO 註解標記` 之後的 LOW 段尾止）：

````markdown
CRITICAL（必須修復）[in-scope]：
  1. [{category}] {issue description}
     {file}:{line}
     規則來源：{skill name}
     修復參照：{skill name} → {specific section/rule name}
     問題原因：{why this is a problem}
     期望目標：{what the correct state should be}
     建議修復：{see tiered strategy below}

HIGH（強烈建議修復）[in-scope]：
  2. [{category}] {issue description}
     {file}:{line range}
     規則來源：{skill name}
     修復參照：{skill name} → {specific section/rule name}
     問題原因：{why this is a problem}
     期望目標：{what the correct state should be}
     建議修復：{see tiered strategy below}

MEDIUM（建議修復）[out-of-scope]：
  3. [{category}] {issue description}
     {file}
     規則來源：{skill name}
     修復參照：{skill name} → {specific section/rule name}
     問題原因：{why this is a problem}
     期望目標：{what the correct state should be}
     建議修復：{see tiered strategy below}
     ※ 超出 branch 目標，將以 TODO 註解標記

LOW（可選改善）[in-scope]：
  4. [{category}] {issue description}
     {file}:{line}
     規則來源：{skill name}
     修復參照：{skill name} → {specific section/rule name}
     問題原因：{why this is a problem}
     期望目標：{what the correct state should be}
     建議修復：{see tiered strategy below}
````

`new_string`：

````markdown
─── Heavy mode（6 fields per finding） ───

CRITICAL（必須修復）[in-scope]：
  1. [{category}] {issue description}
     {file}:{line}
     規則來源：{skill name}
     修復參照：{skill name} → {specific section/rule name}
     問題原因：{why this is a problem}
     期望目標：{what the correct state should be}
     建議修復：{see tiered strategy below}

HIGH（強烈建議修復）[in-scope]：
  2. [{category}] {issue description}
     {file}:{line range}
     規則來源：{skill name}
     修復參照：{skill name} → {specific section/rule name}
     問題原因：{why this is a problem}
     期望目標：{what the correct state should be}
     建議修復：{see tiered strategy below}

MEDIUM（建議修復）[out-of-scope]：
  3. [{category}] {issue description}
     {file}
     規則來源：{skill name}
     修復參照：{skill name} → {specific section/rule name}
     問題原因：{why this is a problem}
     期望目標：{what the correct state should be}
     建議修復：{see tiered strategy below}
     ※ 超出 branch 目標，將以 TODO 註解標記

LOW（可選改善）[in-scope]：
  4. [{category}] {issue description}
     {file}:{line}
     規則來源：{skill name}
     修復參照：{skill name} → {specific section/rule name}
     問題原因：{why this is a problem}
     期望目標：{what the correct state should be}
     建議修復：{see tiered strategy below}

─── Light mode（4 fields per finding） ───

CRITICAL（必須修復）[in-scope]：
  1. {一句說明}
     {file}:{line}
     修復參照：{skill name} → {section} 或 N/A

HIGH（強烈建議修復）[in-scope]：
  2. {一句說明}
     {file}:{line range}
     修復參照：{skill name} → {section} 或 N/A

MEDIUM（建議修復）[out-of-scope]：
  3. {一句說明}
     {file}
     修復參照：{skill name} → {section} 或 N/A
     ※ 超出 branch 目標，將以 TODO 註解標記

LOW（可選改善）[in-scope]：
  4. {一句說明}
     {file}:{line}
     修復參照：{skill name} → {section} 或 N/A

**Light mode 範例：**

```
CRITICAL：硬編碼 API key
  src/utils/auth.js:42
  修復參照：base checklist → secrets

HIGH：函式長度 120 行超過 80 行門檻
  src/models/Device/DeviceFactory.js:55
  修復參照：base checklist → function length

MEDIUM：缺少 *.test.js 對應檔
  src/composables/useUserList.js
  修復參照：testing-principles → "Test file existence"
```

**為何 light mode 保留 `修復參照`：** `fix-planning` 用此欄位判斷修復複雜度（rule-dependent → 載入該 skill 走複雜路線；N/A → 走簡單路線）。刪掉會把所有 light-mode finding 當成簡單修復處理，可能讓有規則牽涉的修復跳過 dev principle 載入。

**為何 light mode 刪除「規則來源 / 問題原因 / 期望目標 / 建議修復」：** 在 light 場景（小 PR、安全變更）這四欄通常與「一句說明 + 修復參照」同義反覆 —— 一句說明 + 修復參照足以讓人定位、讓 `fix-planning` 路由。
````

Expected: Step 6 模板出現「Heavy mode」「Light mode」兩段對照，並附 light mode 的具體範例與保留 `修復參照` 的理由說明。

- [ ] **Step 2: 用 Edit 在 Tiered Strategy 段前加註「heavy mode 限定」**

`old_string`：

```markdown
#### `建議修復` Tiered Strategy

「建議修復」依修正複雜度分層撰寫：
```

`new_string`：

```markdown
#### `建議修復` Tiered Strategy（heavy mode 限定）

Light mode 不使用 `建議修復` 欄位（已被「一句說明 + 修復參照」取代）。下列 tiered strategy 僅適用於 heavy mode 的 `建議修復` 欄位寫法：
```

Expected: Tiered Strategy 段標題加註「heavy mode 限定」，並補上一句說明 light 不適用。

---

### Task 1.6: Common Mistakes 表 — 新增 light/heavy 模板對應錯誤

**Files:**
- Modify: `~/.claude/skills/code-review/SKILL.md`

- [ ] **Step 1: 用 Edit 在 Common Mistakes 表尾追加一條**

`old_string`（Common Mistakes 最後一條 — Step 5c）：

```markdown
| Skipping Per-Skill Completeness Checkpoint (Step 5c) before outputting findings | Must verify every loaded skill's Review Dimensions were checked for every applicable file. This is the primary mechanism preventing multi-round review convergence failures. |
```

`new_string`：

```markdown
| Skipping Per-Skill Completeness Checkpoint (Step 5c) before outputting findings | Must verify every activated skill's Review Dimensions were checked for every applicable file. This is the primary mechanism preventing multi-round review convergence failures. |
| Using wrong field count for the resolved mode (e.g., 6 fields in light mode, or 4 fields in heavy mode) | Light mode = 4 fields per finding（一句說明 / file:line / 修復參照）；Heavy mode = 6 fields（規則來源、修復參照、問題原因、期望目標、建議修復 等）。Match the template to the mode resolved in Step 3b. |
| Reading SKILL.md for all candidates upfront in Step 3d | Step 3d only collects candidates by description match; SKILL.md bodies are read in Step 5 Stage 2 activation, per-file. |
```

Expected: Common Mistakes 表新增兩條（mode/欄位錯誤、Step 3d 上讀全部 SKILL.md）；同時把原 Step 5c 那條的「loaded」改為「activated」對齊新 wording。

---

### Task 1.7: 修正 Step 3d 內部對 Page Detection 的 cross-reference

**Files:**
- Modify: `~/.claude/skills/code-review/SKILL.md`

- [ ] **Step 1: 用 Edit 把 Step 3d 中的「Step 3c」cross-ref 修正**

Task 1.1 已把 Page Detection 從 3b 改編號為 3c，並把原 Step 3c 內的「(Step 3b)」cross-ref 同步改為「(Step 3c)」於新文字中。本 Step 1 為 sanity check：

Run: Read 工具讀取改後 `code-review/SKILL.md` 的 Step 3d 段，搜尋字串「(Step 3」。

Expected: 唯一的 cross-ref 為「(Step 3c)」（指向 Page Detection），且無遺漏的「Step 3b」舊編號。

---

### Task 1.8: Phase 1 整檔 sanity check

**Files:**
- Read: `~/.claude/skills/code-review/SKILL.md`

- [ ] **Step 1: 全檔讀取，確認結構完整**

Run: Read 整份檔案，依序確認：

| 確認項 | 預期 |
|---|---|
| Step 3 子段順序 | 3a / 3b / 3c / 3d |
| Step 3b 標題 | `#### 3b. Mode Decision` |
| Step 5 序言 | 「Activation prelude (run once before per-file loop)」存在 |
| Step 5 per-file loop | 含 Stage 2 activation 步驟（共 8 個編號 step） |
| Step 5c 用詞 | 三處「activated」取代「loaded」，新增「Candidate but not activated」段 |
| Step 6 header | Mode + 候選規則 + 實際套用 三行齊全 |
| Step 6 finding 模板 | Heavy mode 段（6 欄位）+ Light mode 段（4 欄位）並列 |
| Tiered Strategy 標題 | 含「heavy mode 限定」 |
| Common Mistakes | 新增 mode/欄位錯誤、Step 3d 全讀錯誤兩條 |

Expected: 全部確認通過；如有遺漏，回頭以 Edit 補齊。

---

## Phase 2: 修改 review-workflow/references/local-branch.md

### Task 2.1: 流程圖更新

**Files:**
- Modify: `~/.claude/skills/review-workflow/references/local-branch.md`

- [ ] **Step 1: 用 Edit 取代流程圖 dot 內容**

`old_string`：

```
digraph branch_review {
    "Parse input" -> "Phase 1: Collect Diff";
    "Phase 1: Collect Diff" -> "Phase 1.5: Pre-Review Lint";
    "Phase 1.5: Pre-Review Lint" -> "Phase 2: Review";
    "Phase 2: Review" -> "Phase 3: Save Findings";
    "Phase 3: Save Findings" -> "BREAKPOINT";
    "BREAKPOINT" -> "Phase 4: Fix" [label="new session"];
    "Phase 4: Fix" -> "Phase 4c: Post-Fix Lint";
    "Phase 4c: Post-Fix Lint" -> "Done";
}
```

`new_string`：

```
digraph branch_review {
    "Parse input" -> "Phase 1: Collect Diff";
    "Phase 1: Collect Diff" -> "Phase 2: Review";
    "Phase 2: Review" -> "Phase 3: Save Findings";
    "Phase 3: Save Findings" -> "BREAKPOINT";
    "BREAKPOINT" -> "Phase 4a: Brainstorming" [label="new session"];
    "Phase 4a: Brainstorming" -> "Phase 4b: Execute Fixes";
    "Phase 4b: Execute Fixes" -> "Done";
}
```

Expected: 流程圖移除 Phase 1.5、Phase 4c 兩節點。

---

### Task 2.2: 移除 Phase 1.5 整段

**Files:**
- Modify: `~/.claude/skills/review-workflow/references/local-branch.md`

- [ ] **Step 1: 用 Edit 刪除 Phase 1.5 整段**

`old_string`：從 line 67 的 `## Phase 1.5: Pre-Review Lint Check` 開始，到 line 89 的 `8. No errors → continue without impact` 與其後的空白行，直到下一個 `## Phase 2: Review` 之前止。

`new_string`：（空字串 — 整段刪除）

Expected: Phase 1.5 整段（含 8 個 numbered step）被移除，文件繼續從 Phase 2 開始。

---

### Task 2.3: 移除 Phase 4c 整段並調整 Phase 4b 結尾

**Files:**
- Modify: `~/.claude/skills/review-workflow/references/local-branch.md`

- [ ] **Step 1: 用 Edit 取代 Phase 4b 結尾「If all findings are out-of-scope」那一句並刪除 Phase 4c 整段**

`old_string`：

```markdown
**If all findings are out-of-scope:** skip Phase 4a and `fix-planning`, only insert TODOs (step 2), then run verification (lint + test).

### Phase 4c: Post-Fix Lint Verification

After Phase 4b completes, run full package lint to ensure no lint errors remain.

1. Detect package: find nearest `package.json`, read `name` field
2. Run: `pnpm --filter <package-name> lint`
3. If errors exist → auto-fix loop (max 3 rounds), same as `shared-verification`:
   - Fix errors, `git add -A && git commit -m "fix: resolve lint errors (round N)"`
   - Re-run lint
   - After 3 failed rounds → block and report remaining errors
4. All pass → proceed
```

`new_string`：

```markdown
**If all findings are out-of-scope:** skip Phase 4a and `fix-planning`, only insert TODOs (step 2). No further verification step is invoked here — CI / commit hooks own lint and test enforcement.
```

Expected: Phase 4c 整段被移除；Phase 4b 結尾保留「If all findings are out-of-scope」說明，但移除「(lint + test)」字樣，改為說明 verification 已交給 CI / commit hooks。

---

### Task 2.4: Common Mistakes 表清理

**Files:**
- Modify: `~/.claude/skills/review-workflow/references/local-branch.md`

- [ ] **Step 1: 用 Edit 移除四條 lint/test 相關項目**

`old_string`：

```markdown
| Claiming eslint/tests pass without running them | fix-planning uses verification-before-completion — evidence before claims |
| Skipping Phase 1.5 pre-review lint | Always run eslint on changed files before code-review — catches lint errors early |
| Skipping Phase 4c post-fix lint | Always run full package lint after fix-planning completes — ensures no lint errors remain |
| Including eslint warnings in findings | Only eslint errors become findings; warnings are ignored |
```

`new_string`：（空字串 — 整段四行移除）

Expected: Common Mistakes 表移除四條，留下其餘條目不變。

---

### Task 2.5: Phase 2 整檔 sanity check

**Files:**
- Read: `~/.claude/skills/review-workflow/references/local-branch.md`

- [ ] **Step 1: 全檔讀取，確認結構完整**

Run: Read 整份檔案，依序確認：

| 確認項 | 預期 |
|---|---|
| 流程圖 | 無 Phase 1.5、Phase 4c 節點 |
| Phase 列表 | 1 → 2 → 3 → 4a → 4b（無 1.5 / 4c） |
| Common Mistakes | 不再含 eslint / lint / pre-review lint / post-fix lint 字眼 |
| 其餘段落 | 維持原樣 |

Expected: 結構乾淨，無遺漏的 lint/test 殘留。

---

## Phase 3: 修改 fix-planning/SKILL.md

### Task 3.1: 流程圖更新 — 移除 Lint & Test 節點

**Files:**
- Modify: `~/.claude/skills/fix-planning/SKILL.md`

- [ ] **Step 1: 用 Edit 取代流程圖 dot 內容**

`old_string`：

```
digraph fix_planning {
    "Receive findings" -> "Load dev principles";
    "Load dev principles" -> "Classify complexity";
    "Classify complexity" -> "Fix simple items";
    "Classify complexity" -> "Plan complex items";
    "Fix simple items" -> "Commit simple fixes";
    "Plan complex items" -> "brainstorming";
    "brainstorming" -> "writing-plans";
    "writing-plans" -> "Execute plan";
    "Execute plan" -> "Lint & Test";
    "Commit simple fixes" -> "Lint & Test";
    "Lint & Test" -> "Finding-level validation";
    "Finding-level validation" -> "Output commit list";
}
```

`new_string`：

```
digraph fix_planning {
    "Receive findings" -> "Load dev principles";
    "Load dev principles" -> "Classify complexity";
    "Classify complexity" -> "Fix simple items";
    "Classify complexity" -> "Plan complex items";
    "Fix simple items" -> "Commit simple fixes";
    "Plan complex items" -> "brainstorming";
    "brainstorming" -> "writing-plans";
    "writing-plans" -> "Execute plan";
    "Execute plan" -> "Finding-level validation";
    "Commit simple fixes" -> "Finding-level validation";
    "Finding-level validation" -> "Output commit list";
}
```

Expected: 流程圖中 `Lint & Test` 節點被移除，`Execute plan` 與 `Commit simple fixes` 直接連到 `Finding-level validation`。

---

### Task 3.2: Step 5 重整 — 移除 5a，5b 升為 5

**Files:**
- Modify: `~/.claude/skills/fix-planning/SKILL.md`

- [ ] **Step 1: 用 Edit 取代「## Step 5: Verify」整段（含 5a 與 5b 子段）**

`old_string`：

```markdown
## Step 5: Verify

### 5a: Lint & Test

**REQUIRED SKILL:** Use `verification-before-completion`.

```bash
pnpm --filter <package> lint
pnpm --filter <package> test
```

If failures → report errors, invoke `systematic-debugging` if needed. Do NOT claim success without evidence.

### 5b: Finding-Level Validation

After lint/test pass, **re-read each original finding** and verify the fix is semantically correct:

- Does the fix match the finding's suggested fix or intent?
- Does the fix comply with the referenced skill's rules (e.g., if finding says "bare `Array<Object>` violates jsdoc rule", is the replacement type actually specific)?
- Did the fix introduce new issues in the same area?

If any finding is not properly addressed → fix it before proceeding. This step catches "modified but not correctly fixed" issues that lint/test cannot detect.
```

`new_string`：

```markdown
## Step 5: Finding-Level Validation

**Re-read each original finding** and verify the fix is semantically correct:

- Does the fix match the finding's suggested fix or intent?
- Does the fix comply with the referenced skill's rules (e.g., if finding says "bare `Array<Object>` violates jsdoc rule", is the replacement type actually specific)?
- Did the fix introduce new issues in the same area?

If any finding is not properly addressed → fix it before proceeding. This step catches "modified but not correctly fixed" issues — the kind of gap that lint and unit tests cannot detect.

Lint and unit tests are intentionally NOT invoked here. CI and commit hooks own that layer; running them again at fix time is redundant cost without quality gain.
```

Expected: Step 5 標題改為「Finding-Level Validation」，5a/5b 子段消失；保留原 5b 內容，並補一段說明 lint/test 不在此步驟執行的理由。

---

### Task 3.3: Step 1 cross-reference 更新（3c → 3d）

**Files:**
- Modify: `~/.claude/skills/fix-planning/SKILL.md`

- [ ] **Step 1: 用 Edit 修正 cross-reference 編號**

`old_string`：

```markdown
Identify file types across all findings. Scan available skills for those applicable to writing/modifying those file types (same discovery logic as `code-review` Step 3c). Read each matched skill's SKILL.md.
```

`new_string`：

```markdown
Identify file types across all findings. Scan available skills for those applicable to writing/modifying those file types (same discovery logic as `code-review` Step 3d Stage 1). Read each matched skill's SKILL.md.
```

Expected: cross-reference 從 `Step 3c` 更新為 `Step 3d Stage 1`，與 code-review 重排後的編號對齊。

---

### Task 3.4: Common Mistakes 表清理與改寫

**Files:**
- Modify: `~/.claude/skills/fix-planning/SKILL.md`

- [ ] **Step 1: 用 Edit 取代 Common Mistakes 表中三條 lint/test 相關項目**

`old_string`：

```markdown
| Skipping verification | Always run lint + test with evidence |
| Claiming success without command output | Use verification-before-completion |
| Only running lint/test without checking fix correctness | After lint/test, re-read each finding and verify the fix matches the intent |
```

`new_string`：

```markdown
| Skipping finding-level validation after fix | Re-read each finding, confirm the change semantically addresses it. This is the only verification gate in fix-planning — skipping it leaves "modified but not correctly fixed" cases through. |
```

Expected: 三條（Skipping verification、Claiming success without command output、Only running lint/test without checking fix correctness）合併為一條「Skipping finding-level validation after fix」。

---

### Task 3.5: Phase 3 整檔 sanity check

**Files:**
- Read: `~/.claude/skills/fix-planning/SKILL.md`

- [ ] **Step 1: 全檔讀取，確認結構完整**

Run: Read 整份檔案，依序確認：

| 確認項 | 預期 |
|---|---|
| 流程圖 | 無 `Lint & Test` 節點；`Finding-level validation` 直接接收兩條入邊 |
| Step 5 標題 | `## Step 5: Finding-Level Validation`（無 5a/5b 子段） |
| Step 5 內容 | 只有 finding-level validation 邏輯，附一段 lint/test 不在此執行的理由 |
| Step 1 cross-ref | 含字串「`code-review` Step 3d Stage 1」 |
| Common Mistakes | 不再含 `verification-before-completion`、`lint/test` 字眼；含「Skipping finding-level validation after fix」一條 |

Expected: 結構乾淨，無遺漏的 lint/test 殘留，cross-reference 對齊新編號。

---

## Phase 4: Manual Verification（無自動化測試）

`~/.claude/skills/` 不含 lint / unit test。驗證以五個 manual scenario 走查為準。每個 scenario 需找到一個實際 branch 跑一次 review，紀錄觀察結果。

### Task 4.1: Scenario 1 — 小 bug-fix branch（預期 light）

**Goal:** 確認 light mode 自動觸發、finding 用 4 欄位、token 用量明顯低於 baseline。

- [ ] **Step 1: 找一個只動 1-2 個葉子 component / utility 的 branch**

  例：typo fix、單檔 prop 預設值修正。

- [ ] **Step 2: 觸發 review-workflow**

  「review current branch」

- [ ] **Step 3: 檢查 Step 6 報告 header**

  Expected: 含 `Mode：light（{reason}）` 一行；候選規則 ≥ 實際套用。

- [ ] **Step 4: 檢查 finding 格式**

  Expected: 每個 finding 為 4 欄位（一句說明 / file:line / 修復參照），不含「規則來源 / 問題原因 / 期望目標 / 建議修復」。

- [ ] **Step 5: 紀錄 token 消耗（可從 session log 估算）**

  Expected: 比同類型 branch 在改動前的 review 明顯下降。

---

### Task 4.2: Scenario 2 — 大 feature branch（預期 heavy）

**Goal:** 確認 heavy mode 自動觸發、finding 用 6 欄位、流程跟現狀一致。

- [ ] **Step 1: 找一個含 router / auth / 新 component / 跨模組變更的 branch**

- [ ] **Step 2: 觸發 review-workflow**

- [ ] **Step 3: 檢查 Step 6 報告 header**

  Expected: 含 `Mode：heavy（{reason}）`；reason 應提及 router / 新 component / 跨模組 之一。

- [ ] **Step 4: 檢查 finding 格式**

  Expected: 每個 finding 為 6 欄位（規則來源 / 修復參照 / 問題原因 / 期望目標 / 建議修復 等齊全）。

- [ ] **Step 5: 比對 review 內容是否與改動前一致**

  Expected: 不該因為 lazy loading 漏掉任何 dimension 檢查；候選規則中除非無檔案觸發，否則應全數 activated。

---

### Task 4.3: Scenario 3 — Explicit override 兩個方向

**Goal:** 確認使用者覆蓋指令生效。

- [ ] **Step 1: 對 Scenario 1 的小 branch 觸發「review current branch，用 heavy 模式」**

  Expected: header 為 `Mode：heavy（user override）`；finding 變回 6 欄位。

- [ ] **Step 2: 對 Scenario 2 的大 branch 觸發「review current branch，用 light 模式」**

  Expected: header 為 `Mode：light（user override）`；finding 變為 4 欄位。

- [ ] **Step 3: 比對 light override 大 branch 的結果**

  Expected: 雖然 finding 變少欄位，但 verdict 邏輯不變（CRITICAL/HIGH 仍正確 BLOCK / WARN）。

---

### Task 4.4: Scenario 4 — 無 finding 場景

**Goal:** 確認 verdict 與 early exit 行為不變。

- [ ] **Step 1: 找一個極小、無問題的 branch（例：純文字註解修正）**

- [ ] **Step 2: 觸發 review-workflow**

  Expected: verdict 為 `PASS — 未發現問題`；review-workflow 詢問是否儲存後停止，不進入 Phase 4。

---

### Task 4.5: Scenario 5 — Lint error 存在的 branch

**Goal:** 確認 review 不再自動修復 lint，也不把 lint error 當 finding。

- [ ] **Step 1: 找或人工製造一個含 eslint error 的 branch（例：故意留一個 unused import）**

- [ ] **Step 2: 觸發 review-workflow**

  Expected:
  - 不出現 Phase 1.5 的 `npx eslint --fix` 自動修正 commit
  - findings 中無「[eslint]」前綴的條目
  - Phase 4 完成後不出現 Phase 4c 的 `pnpm lint` 自動修正迴圈

- [ ] **Step 3: 確認使用者仍可手動 lint**

  Run: `pnpm --filter <package> lint`

  Expected: 命令仍可執行（這部分由 CI / commit hook / 開發者自己負責，不被 review-workflow 觸碰）。

---

### Task 4.6: 完成 manual verification 紀錄

- [ ] **Step 1: 在 plan 末尾或 spec 同層 docs 內紀錄五個 scenario 的執行結果**

  記錄每個 scenario 的：日期、branch 名稱、觀察結果（是否如預期）、token 用量（若可估）。

  失敗的 scenario 必須先回 Phase 1-3 修正後再重跑，才能視為驗證通過。

---

## Rollback Procedure

`~/.claude` 非 git repo，回滾依賴 Phase 0 備份：

```bash
cp ~/.claude/skills/.backup-2026-06-04/code-review/SKILL.md ~/.claude/skills/code-review/SKILL.md
cp ~/.claude/skills/.backup-2026-06-04/review-workflow/references/local-branch.md ~/.claude/skills/review-workflow/references/local-branch.md
cp ~/.claude/skills/.backup-2026-06-04/fix-planning/SKILL.md ~/.claude/skills/fix-planning/SKILL.md
```

備份目錄保留至下一次重大修改前；確認新流程穩定後再人工清理。

---

## Out of Scope

下列項目**不在本次 plan 範圍**，已列入 spec backlog：

- C. 合併讀檔（單檔統一讀一次，full / diff / enclosing scope 從同一份 buffer 切片）
- D. Inline checkpoint（5c 用 dict 累積，省第二輪掃）
- F. Workflow 平行化（per-file sub-agent）
- G. 模型分層（Haiku / Opus 依檢查類型分流）

各項落地需獨立 design doc。

下列**保持不動**：
- `~/.claude/skills/code-review/references/checklist.md`
- `~/.claude/skills/code-review/references/batch-strategy.md`
- `~/.claude/skills/shared-verification/`（其他 workflow 仍在用）
- 外部 plugin `agent-skills:code-review-and-quality`（參考標的，不改造）
- 專案 eslint config / CI pipeline / husky pre-commit hook
