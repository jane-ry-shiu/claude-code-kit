# Code Review Skill Token 優化 Design

**Date:** 2026-06-04
**Scope:** `~/.claude/skills/code-review/` 與 `~/.claude/skills/review-workflow/`、`~/.claude/skills/fix-planning/`
**Author:** brainstorming session

---

## 背景

`review-workflow` 系列（orchestrator + `code-review` 分析引擎 + checklist + batch-strategy）跟外部 `agent-skills:code-review-and-quality` 比較，同樣是 review 任務，token 用量至少差 2-3 倍，且這個差距在跳過 lint / unit test 步驟後依然存在。

差距的主要來源（按貢獻排序）：

1. **Skill 動態載入** — 一次 review 命中 7-8 個 skill，每個 5-20KB SKILL.md 全文讀進來，光指令 context 就 ~70-100KB。`agent-skills:code-review-and-quality` 是固定 14KB 自包含。
2. **Finding 模板冗長** — 6 欄位 × N 筆 finding。base checklist 命中率高的話一個小 PR 就能寫出 10+ 筆。
3. **Lint / unit test 多層執行** — Phase 1.5 (Pre-Review Lint)、Phase 4c (Post-Fix Lint)、`fix-planning` 內部 verification，三層疊加。
4. 多次讀檔（full / diff / enclosing scope）、Per-Skill Completeness Checkpoint 第二輪掃。

本次優化處理 1、2、3 三項。其餘列入 backlog。

---

## 目標

- 在不犧牲 review 品質的前提下，將典型 branch review 的 token 用量降低 50% 以上
- 對小型變更（typo fix、單檔 utility 修改）token 降幅最大化
- 對大型結構性變更（router / 權限 / 跨模組）保留現狀完整 review 能力
- 與 `agent-skills:code-review-and-quality` 的「lint/test 由作者/CI 負責」哲學對齊

---

## 範圍

本次包含：

- **A. Lazy skill loading** — 兩階段載入（discovery 只讀 description，activation 才讀 SKILL.md 全文）
- **B. 模式判斷** — reviewer 模型在 Step 3 入口決定 light / heavy 一次，全程適用
- **E. Finding 模板分層** — light = 4 欄位，heavy = 6 欄位
- **Lint / Unit Test 移除** — 移除 review-workflow Phase 1.5、Phase 4c、`fix-planning` Step 5a（Lint & Test）；保留 5b（Finding-level validation）

不包含（列入 Backlog）：

- C. 合併讀檔
- D. Inline checkpoint
- F. Workflow 平行化
- G. 模型分層（Haiku / Opus）

---

## 改動概覽

| 改動 | 動到的檔案 | 影響 step | 預期 token 影響 |
|---|---|---|---|
| A. Lazy skill loading | `code-review/SKILL.md` | Step 3c, Step 5 | -40~60% |
| B. 模式判斷 | `code-review/SKILL.md` | Step 3 入口 | light 路線顯著降；heavy ±0 |
| E. Finding 模板分層 | `code-review/SKILL.md` | Step 6 | finding 字數 -50~70% |
| Lint/test 移除 | `review-workflow/references/local-branch.md`, `fix-planning/SKILL.md` | Phase 1.5, 4c, fix-planning Step 5a | 移除整段執行成本（5b finding-level validation 保留）|

---

## Section 1：Architecture

優化發生在三個 skill：

```
code-review/SKILL.md            ← 主要改動（A + B + E）
review-workflow/local-branch.md ← 移除 Phase 1.5 / 4c
fix-planning/SKILL.md           ← 移除 verification 呼叫
```

`agent-skills:code-review-and-quality`（外部 plugin 版本）不動 ── 它是參考標的，不是改造對象。

`review-workflow` orchestrator 不需傳入 mode hint。模式判斷完全發生在 `code-review` 內部，對外部呼叫透明。

`references/checklist.md` 與 `references/batch-strategy.md` 不動。

---

## Section 2：Mode Decision Mechanism

### 判斷時機

Step 3 結束後（已分類檔案、看過 changeset 全貌），緊接 Step 4 之前。一次決定，不中途切換。

### 判斷依據（給模型的提示）

判定為 **light** 的 signal（多項符合即可走 light）：

- 變更集中在少數葉子組件、utility、bug fix
- 沒有觸及 router / auth / permission / 跨模組 dispatch
- 沒有新增條件分支到既有 if/switch 鏈
- 沒有新增或大幅改動 model / store / API client
- 變更行數小且檔案範圍窄

判定為 **heavy** 的 signal（任一符合即走 heavy）：

- 觸及 router config / 權限 meta / navigation guard
- 變更觸及多個不同 feature 模組
- 新增條件分支到既有結構（OCP 風險）
- 新增/改動 model、store、composable、service 層
- 含新 component（需檢查 loading/error/empty state）
- changeset 包含多個 `.md` spec 檔（可能要跑 cross-file consistency）

### Override

使用者可在觸發 review 時明確指定（如「review current branch，用 heavy 模式」），覆蓋模型判斷。

### 判斷後行為差異

| 步驟 | Light | Heavy |
|---|---|---|
| Step 3b（page detection） | 跳過 router config 讀取，只用 `src/pages/` `src/views/` 路徑慣例 | 現狀（讀 router config） |
| Step 3c（skill discovery） | 兩階段 lazy loading | 兩階段 lazy loading |
| Step 5a（Enclosing-Scope Checkpoint） | 保留 | 保留 |
| Step 5c（Per-Skill Completeness Checkpoint） | 保留 | 保留 |
| Step 6（Finding 模板） | 4 欄位 | 6 欄位 |

### 輸出標示

Step 6 報告 header 加一行 `Mode: light/heavy（{reason}）`，讓使用者看到模型的判斷依據，方便事後檢討。

---

## Section 3：Lazy Skill Loading

把現在 Step 3c 的「description 命中 → 立刻讀整份 SKILL.md」拆成兩階段。

### Stage 1 — Discovery（Step 3c 結尾）

只讀每個 skill 的 description（前置 metadata，~200 chars），建立 candidate 清單：

```
Candidates:
  - naming-conventions (mandatory)
  - vue-best-practices [.vue files]
  - testing-principles [src/ files]
  - jsdoc-documentation [.js with exports]
  - parallel-path-consistency [conditional changes]
```

這階段**不讀** SKILL.md 本體。輸出僅是 skill 名單 + 描述 + applicability hint。

### Stage 2 — Activation（Step 5 內部，per-file）

審每個檔案時的 micro-flow：

```
1. List candidate skills whose applicability matches THIS file
2. For each matched candidate not yet activated:
     → 讀取 full SKILL.md（once）
     → cache 至 review session 結束
3. Apply all activated skills' rules to this file
```

關鍵：activation 是 **per-file trigger，per-session cache**。第一個 .vue 檔觸發 vue-best-practices 載入；後續 .vue 檔直接用 cached 規則，不再讀。

### Mandatory skill 例外

`naming-conventions` 在 Step 5 起點直接 activate（因為對所有檔案都適用，省掉每檔判斷）。

### 典型節省場景

| 情境 | Discovery 候選 | 實際 activated |
|---|---|---|
| 小 typo fix（1 個 .vue） | 5 個 | 2 個（naming + vue-best-practices）|
| 純 utility 改動（2 個 .js） | 5 個 | 2-3 個 |
| 大 feature（10+ 跨層檔案） | 5 個 | 5 個（接近現狀） |

### 與 Step 5c 的銜接

5c 的「every loaded skill」改為「every **activated** skill」。

候選但未 activate 的 skill 表示沒有任何檔案觸發其 applicability，因此沒有覆蓋率缺口。這一點要在 SKILL.md 明確寫出，避免歧義。

### 輸出標示

Step 6 報告 header 從目前的「載入規則：{list}」改為兩行：

```
候選規則：{full candidate list}
實際套用：{activated subset}
```

讓使用者看出哪些是被剪掉的。

### Edge case

Stage 2 觸發時若 SKILL.md 讀取失敗（檔案不存在、解析錯），降級為「該檔案這次跳過此 skill 並紀錄 warning」，不阻擋整個 review。

---

## Section 4：Finding Template Tiering

### Heavy mode（不變）

6 欄位：severity / file:line / 規則來源 / 修復參照 / 問題原因 / 期望目標 / 建議修復。沿用現狀「建議修復」分層策略（簡單明確 / 需查閱 / 結構性）。

### Light mode（新）

4 欄位：

```
{severity}：{一句說明}
  {file}:{line}
  修復參照：{skill → section} 或 N/A
```

範例：

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

### 為何保留 `修復參照`

`fix-planning` 用它判斷修復複雜度（rule-dependent → 載入該 skill 走複雜路線；N/A → 走簡單路線）。刪掉會把所有 light-mode finding 當成簡單修復處理，可能讓有規則牽涉的修復跳過 dev principle 載入。

### 為何刪掉「規則來源 / 問題原因 / 期望目標 / 建議修復」

在 light 場景（小 PR、安全變更）這四欄通常是同義反覆 —— 一句說明 + 修復參照足以讓人定位、讓 `fix-planning` 路由。而這四欄正是現狀 token 灌水主因。

### Verdict 邏輯

不變。仍由 in-scope CRITICAL/HIGH 決定 BLOCK / WARN / PASS，與模板無關。

### 與 review-workflow 銜接

Phase 3（Save Findings）寫入 `docs/context/branch-review-{branch}.md` 時保留實際使用的模板格式（不擴寫、不補欄位）。

Phase 4a `brainstorming` 對 4 欄位 finding 的處理方式：把「一句說明」當作問題描述、`修復參照` 當作 fix 路徑，兩者就足以走 brainstorming 流程。

### Common Mistakes 新增

`code-review/SKILL.md` 的 Common Mistakes 表新增一條：「heavy mode 用 4 欄位 / light mode 用 6 欄位」。

---

## Section 5：移除 Lint / Unit Test 步驟

### 移除範圍（三處）

1. **`review-workflow/references/local-branch.md` Phase 1.5（Pre-Review Lint）** — 整段移除。包括 `npx eslint --fix`、自動 commit、把 eslint error 包裝成 finding 等流程。
2. **`review-workflow/references/local-branch.md` Phase 4c（Post-Fix Lint Verification）** — 整段移除。包括 `pnpm --filter <pkg> lint` 與 3 round auto-fix 迴圈。
3. **`fix-planning` skill 的 Step 5a（Lint & Test）** — 移除呼叫 `verification-before-completion` 跑 `pnpm lint` / `pnpm test` 的環節。Step 5b（Finding-level validation：重讀每個 finding 確認語意上有修對）**保留** —— 它不跑任何工具、純粹是讀檔比對，token 成本低且能擋下「改了但沒改對」這類無法靠 lint/test 偵測的問題。

### 連帶改動

- `local-branch.md` 流程圖更新為：

  ```
  Phase 1: Collect Diff
    → Phase 2: Review
    → Phase 3: Save Findings
    → BREAKPOINT
    → Phase 4a: Brainstorming
    → Phase 4b: Execute Fixes
    → Done
  ```

- `local-branch.md` 的 Common Mistakes 表移除：
  - 「Skipping Phase 1.5 pre-review lint」
  - 「Skipping Phase 4c post-fix lint」
  - 「Including eslint warnings in findings」
  - 「Claiming eslint/tests pass without running them」（依據不再存在）

- `fix-planning/SKILL.md` 流程圖移除 `Lint & Test` 節點，保留 `Finding-level validation`：

  ```
  Execute plan → Commit → Finding-level validation → Done
  ```

- `fix-planning` 的 Common Mistakes 表移除：
  - 「Skipping verification」（依據不再存在）
  - 「Claiming success without command output」（已不執行 lint/test）
  - 保留：「Only running lint/test without checking fix correctness」改寫為「Skipping finding-level validation after fix」

### 保留的對應機制

- `shared-verification` skill 本身**不刪除**。其他 workflow（如 harness deploy）可能仍在用。
- eslint config、CI pipeline、husky pre-commit hook 不動 —— 一切交給 CI 與 commit hook 把關。
- 使用者仍可手動觸發 lint：`pnpm --filter <pkg> lint`。

### 風險與承擔

| 風險 | 影響 | 緩解 |
|---|---|---|
| review-workflow 提交的 commit 可能含 lint error | CI 會擋下 push 後的 PR | 仰賴 CI；本地由 husky pre-commit hook（若有設定）攔截 |
| fix 後 test 可能斷裂 | 同上，CI 擋下 | 使用者可在 fix 完手動跑 `pnpm test:unit` |
| 無自動修復 lint error 的 commit（原 Phase 1.5 會自動修並 commit） | 微小便利損失 | 使用者改為手動跑 `pnpm lint --fix` |

### 決策依據

- 與 `agent-skills:code-review-and-quality` 的「Verify the verification — author 負責跑、reviewer 只 cross-check」哲學一致
- review/fix 階段的 lint/test 與 review 本質（讀程式碼、判斷品質）無關，是另一層保險
- CI + commit hook 已經是這層保險，重複執行只是疊加 token 成本
- 使用者已多次手動跳過，行為層面其實已經接受此哲學

---

## Backlog（不在本次範圍）

| 代號 | 項目 | 預期收益 | 主要改動點 | 風險 |
|---|---|---|---|---|
| C | 合併讀檔：單檔統一讀一次，full / diff / enclosing scope 從同一份 buffer 切片 | 中 | Step 5 讀檔流程 | 大檔（>2000 行）context 浪費，需要排除規則 |
| D | inline checkpoint：5c 覆蓋率在 Step 5 主迴圈用 dict 累積，不走第二輪 | 中 | Step 5c 結構 | 需要驗證覆蓋率追蹤的可靠性，避免漏項 |
| F | Workflow 平行化：per-file sub-agent，主 context 只看彙總 | 高 | Step 4-5 整體重構為 Workflow script | 改動最大，sub-agent 之間 dedup / cross-file rule（如 #18）需重新設計 |
| G | 模型分層：Haiku 跑機械性檢查（行數、硬編碼字串）、Opus 跑 design principles / cross-file 規則 | 中 | 引入 model 參數 | 需先量化哪些檢查機械化程度足以給 Haiku |

各項落地時都需要獨立的 design doc。

---

## Testing & Rollout

### 改動範圍（檔案層級）

- `~/.claude/skills/code-review/SKILL.md`
- `~/.claude/skills/review-workflow/references/local-branch.md`
- `~/.claude/skills/fix-planning/SKILL.md`

`references/checklist.md`、`references/batch-strategy.md`、`agent-skills:code-review-and-quality` 不動。

### 驗證方式（manual，無 unit test）

1. 跑一個小 bug-fix branch（預期 light 觸發），檢查 finding 用 4 欄位、token 用量明顯下降
2. 跑一個含 router/權限/新 component 的 feature branch（預期 heavy 觸發），檢查 finding 用 6 欄位、流程跟現狀一致
3. 同一個 branch 用 explicit override 強制 heavy / light，比對結果差異
4. 跑一次「無 finding」場景，確認 verdict / early exit 行為不變
5. 跑一次「lint error 存在」的 branch，確認 review 不再自動修復、finding 也不包含 eslint 錯誤

### 回滾

`~/.claude` 目前不是 git repo。回滾方式：

- 改動前手動備份三個檔案到 `~/.claude/skills/.backup-2026-06-04/`
- 若需要回滾，從備份覆寫回去即可

未來如要長期管理，可考慮把 `~/.claude/skills/` 初始化為獨立 git repo（不在本次範圍）。

---

## 開放問題

無。所有設計決策已在 brainstorming 過程確認。
