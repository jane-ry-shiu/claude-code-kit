# Finding 證據欄 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 讓 code-review 的 finding severity 不得超過其證據所能支撐的程度。

**Architecture:** 在 finding 模板新增強制 file:line 指標的 `證據` 欄，把 `問題原因`（機制敘述，獎勵未驗證推論）rename 為 `導致問題`（後果，誠實標示為推論），兩欄上下相鄰使推論落差可見；再加一條 runtime severity 天花板硬規則。並拔除 light mode —— 該修正住在 light mode 沒有的欄位裡，留著等於留後門。

**Tech Stack:** Markdown skill 檔。無 test framework —— 驗收靠 grep 斷言 + PR #8380 的 8 條 finding replay。

**Spec:** `~/.claude/skills/code-review/docs/specs/2026-07-15-finding-evidence-field-design.md`

## Global Constraints

- **語言**：skill 檔內文維持現有中英混用慣例 —— 欄位名與說明用繁體中文，`{placeholder}`、步驟名、Common Mistakes 表格用英文。照抄既有行的風格，不要統一化。
- **降級是合法出口**：任何提到 `證據` 欄的地方，都必須同時寫明「要嘛引用，要嘛降級並說明」。**不得**寫成「必須讀到能證明為止」—— 那會誘發防禦性閱讀、成本無上限。
- **不得新增 review 步驟**：本次是欄位改動，不是 phase。Step 1-5 的流程一律不動。
- **不動**：`code-review/references/checklist.md`、`code-review/references/batch-strategy.md`、`backend-code-review/SKILL.md`、`review-workflow/references/pr-review.md`。
- **`修復參照` 欄一律保留**：`fix-planning` 靠它路由修復複雜度。
- **Verdict 邏輯不動**：仍由 in-scope CRITICAL/HIGH 決定 BLOCK / WARN / PASS。
- **回滾**：`~/.claude` 不是 git repo。Task 1 Step 1 的備份是唯一回滾手段，不得跳過。

---

### Task 1: 備份 + 拔除 light mode

**Files:**
- Create: `~/.claude/skills/.backup-2026-07-15/` （備份 4 個檔）
- Modify: `~/.claude/skills/code-review/SKILL.md:83-129`（刪 3b、合併 3c）
- Modify: `~/.claude/skills/code-review/SKILL.md:264`（刪 Mode header 行）
- Modify: `~/.claude/skills/code-review/SKILL.md:269, 308-349`（刪 light 模板/範例/說明）
- Modify: `~/.claude/skills/code-review/SKILL.md:357-359`（刪 heavy 限定語）
- Modify: `~/.claude/skills/code-review/SKILL.md:434`（刪 Common Mistakes 該列）
- Modify: `~/.claude/skills/code-review/SKILL.md:170, 194, 265, 435`（Step 3c/3d 重編號）
- Modify: `~/.claude/skills/fix-planning/SKILL.md:40`（外部交叉引用同步）

**Interfaces:**
- Produces: 唯一一套 finding 模板（原 heavy 六欄），Task 2 在其上加欄。Step 編號變為 `3a`(分類) / `3b`(page detection) / `3c`(skill discovery)。

- [ ] **Step 1: 備份**

```bash
mkdir -p ~/.claude/skills/.backup-2026-07-15
cp ~/.claude/skills/code-review/SKILL.md ~/.claude/skills/.backup-2026-07-15/code-review-SKILL.md
cp ~/.claude/skills/review-workflow/references/local-branch.md ~/.claude/skills/.backup-2026-07-15/local-branch.md
cp ~/.claude/skills/naming-conventions/SKILL.md ~/.claude/skills/.backup-2026-07-15/naming-conventions-SKILL.md
cp ~/.claude/skills/fix-planning/SKILL.md ~/.claude/skills/.backup-2026-07-15/fix-planning-SKILL.md
ls -la ~/.claude/skills/.backup-2026-07-15/
```

Expected: 4 個檔案列出。**這是唯一回滾手段** —— 沒有 git。

- [ ] **Step 2: 寫斷言，確認現在失敗**

```bash
cd ~/.claude/skills
echo "light/heavy 殘留（期望 0）: $(grep -ci 'light mode\|heavy mode\|light | heavy' code-review/SKILL.md)"
echo "Step 3d 殘留（期望 0）: $(grep -c 'Step 3d\|3d (Skill' code-review/SKILL.md)"
echo "fix-planning 引用 3d（期望 0）: $(grep -c 'code-review. Step 3d' fix-planning/SKILL.md)"
```

Expected（改動前，全部應為非 0，證明斷言有效）:
```
light/heavy 殘留（期望 0）: 10
Step 3d 殘留（期望 0）: 4
fix-planning 引用 3d（期望 0）: 1
```

- [ ] **Step 3: 刪除 Step 3b Mode Decision 整節**

刪除 `code-review/SKILL.md` 第 83-114 行（自 `#### 3b. Mode Decision` 起，至 `Record the resolved mode and the one-line reason for output in Step 6.` 止，含其後空行）。

刪除後，第 81 行的檔案分類表之後應直接接 Step 4 之前的 page detection 節。

- [ ] **Step 4: 把 3c Page Detection 改為 3b，並移除模式分歧**

把原 116-129 行整段替換為：

```markdown
#### 3b. Page Detection

To distinguish page-level `.vue` from component `.vue`:

1. Read router config files (search for `routes` directory or `router/` directory)
2. Extract file paths referenced in route definitions
3. Also check common conventions: `src/pages/`, `src/views/`
4. `.vue` files matching these paths = page-level
```

（原 `**Heavy mode:**` / `**Light mode:**` 兩個小標題與 light 的三步都刪除，只留原 heavy 的四步。）

- [ ] **Step 5: 把 3d Skill Discovery 改為 3c**

第 131 行：

```markdown
#### 3d. Skill Discovery (Stage 1 — Candidate Identification)
```

改為：

```markdown
#### 3c. Skill Discovery (Stage 1 — Candidate Identification)
```

- [ ] **Step 6: 同步 code-review 內部的 Step 3x 交叉引用**

第 170 行：
```markdown
- When `.vue` files are changed, check if they are page-level (Step 3c). Page-level `.vue` files should not trigger component-specific candidate skills
```
改為（`Step 3c` → `Step 3b`）:
```markdown
- When `.vue` files are changed, check if they are page-level (Step 3b). Page-level `.vue` files should not trigger component-specific candidate skills
```

第 194 行：
```markdown
4. **Stage 2 activation (per-file)** — for each candidate from Step 3d not yet in `activated`:
```
改為:
```markdown
4. **Stage 2 activation (per-file)** — for each candidate from Step 3c not yet in `activated`:
```

第 435 行（Common Mistakes 最後一列）：
```markdown
| Reading SKILL.md for all candidates upfront in Step 3d | Step 3d only collects candidates by description match; SKILL.md bodies are read in Step 5 Stage 2 activation, per-file. |
```
改為:
```markdown
| Reading SKILL.md for all candidates upfront in Step 3c | Step 3c only collects candidates by description match; SKILL.md bodies are read in Step 5 Stage 2 activation, per-file. |
```

- [ ] **Step 7: 同步外部交叉引用 `fix-planning/SKILL.md:40`**

```markdown
Identify file types across all findings. Scan available skills for those applicable to writing/modifying those file types (same discovery logic as `code-review` Step 3d Stage 1). Read each matched skill's SKILL.md.
```
改為（`Step 3d` → `Step 3c`）:
```markdown
Identify file types across all findings. Scan available skills for those applicable to writing/modifying those file types (same discovery logic as `code-review` Step 3c Stage 1). Read each matched skill's SKILL.md.
```

- [ ] **Step 8: 驗證 `component-general-principles` 的既有壞引用被順帶修好**

```bash
grep -n "code-review Step 3" ~/.claude/skills/component-general-principles/SKILL.md
```

Expected:
```
60:When loaded by `code-review`, these dimensions must be checked for every applicable component file (`.vue`, `.jsx`, `.tsx`; excluding page-level `.vue` per code-review Step 3b):
```

它說 `Step 3b` 指 page detection。改動前 3b 是 Mode Decision（**該引用是壞的** —— 06-04 把 Mode 插進 3b 時撞歪，沒人回頭修）；重編號後 page detection 回到 3b，**此引用自動變正確**。

**不要改這個檔。** 只確認上面 grep 輸出含 `Step 3b`。若不含，停下來回報 —— 代表假設有誤。

- [ ] **Step 9: 刪除 Step 6 輸出 header 的 Mode 行**

第 264 行整行刪除：
```
Mode：{light | heavy}（{one-line reason}）
```

同時第 265 行的 `Step 3d` 改為 `Step 3c`：
```
候選規則：{full candidate list from Step 3c}
```

- [ ] **Step 10: 刪除 heavy 分隔標記與整個 light 模板區塊**

刪除第 269 行：
```
─── Heavy mode（6 fields per finding） ───
```
（含其後空行。四個 severity 區塊直接接在 header 之後。）

刪除第 308-349 行 —— 自 `─── Light mode（4 fields per finding） ───` 起，至 `**為何 light mode 刪除「規則來源 / 問題原因 / 期望目標 / 建議修復」：**` 該段結束為止。含中間的 light 四個 severity 模板、`**Light mode 範例：**` 及其 code block、以及兩段「為何 light mode 保留/刪除 XXX」說明。

刪除後，LOW 區塊（原 299-306）之後應直接接：
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

摘要：{N} CRITICAL, {N} HIGH, {N} MEDIUM, {N} LOW（in-scope: {N}, out-of-scope: {N}）
結論：{verdict}
```

- [ ] **Step 11: 移除 `建議修復` Tiered Strategy 的 heavy 限定語**

第 357-361 行：
```markdown
#### `建議修復` Tiered Strategy（heavy mode 限定）

Light mode 不使用 `建議修復` 欄位（已被「一句說明 + 修復參照」取代）。下列 tiered strategy 僅適用於 heavy mode 的 `建議修復` 欄位寫法：

「建議修復」依修正複雜度分層撰寫：
```
改為:
```markdown
#### `建議修復` Tiered Strategy

「建議修復」依修正複雜度分層撰寫：
```

- [ ] **Step 12: 刪除 Common Mistakes 的 mode 列**

刪除第 434 行整列：
```markdown
| Using wrong field count for the resolved mode (e.g., 6 fields in light mode, or 4 fields in heavy mode) | Light mode = 4 fields per finding（一句說明 / file:line / 修復參照）；Heavy mode = 6 fields（規則來源、修復參照、問題原因、期望目標、建議修復 等）。Match the template to the mode resolved in Step 3b. |
```

- [ ] **Step 13: 跑斷言，確認通過**

```bash
cd ~/.claude/skills
echo "light/heavy 殘留（期望 0）: $(grep -ci 'light mode\|heavy mode\|light | heavy' code-review/SKILL.md)"
echo "Step 3d 殘留（期望 0）: $(grep -c 'Step 3d\|3d (Skill' code-review/SKILL.md)"
echo "fix-planning 引用 3d（期望 0）: $(grep -c 'code-review. Step 3d' fix-planning/SKILL.md)"
echo "--- 以下為完整性檢查 ---"
echo "Step 3 小節（期望 3a/3b/3c 各 1）: $(grep -c '^#### 3[abc]\.' code-review/SKILL.md)"
echo "修復參照 仍在（期望 >0）: $(grep -c '修復參照' code-review/SKILL.md)"
echo "verdict 表仍在（期望 1）: $(grep -c 'BLOCK — 請先修復 CRITICAL 問題' code-review/SKILL.md)"
```

Expected:
```
light/heavy 殘留（期望 0）: 0
Step 3d 殘留（期望 0）: 0
fix-planning 引用 3d（期望 0）: 0
--- 以下為完整性檢查 ---
Step 3 小節（期望 3a/3b/3c 各 1）: 3
修復參照 仍在（期望 >0）: 8
verdict 表仍在（期望 1）: 1
```

- [ ] **Step 14: 人工讀一次 Step 3 與 Step 6**

```bash
sed -n '70,130p' ~/.claude/skills/code-review/SKILL.md
sed -n '225,290p' ~/.claude/skills/code-review/SKILL.md
```

確認：Step 3 只剩 3a/3b/3c 三個小節、無空號、無 mode 殘句；Step 6 header 無 `Mode：` 行、只有一套四個 severity 模板。

---

### Task 2: 新增 `證據` 欄 + `問題原因` → `導致問題`

**Files:**
- Modify: `~/.claude/skills/code-review/SKILL.md` — Step 6 的 4 個 severity 模板（Task 1 後行號約 265-295）
- Modify: `~/.claude/skills/code-review/SKILL.md` — `建議修復` Tiered Strategy 表格內文

**Interfaces:**
- Consumes: Task 1 產出的單一模板。
- Produces: 八行模板，欄位順序為 `{issue description}` / `{file}:{line}` / `規則來源` / `修復參照` / `證據` / `導致問題` / `期望目標` / `建議修復`。Task 4 依此同步兩份複本。

- [ ] **Step 1: 寫斷言，確認現在失敗**

```bash
cd ~/.claude/skills
echo "問題原因 殘留（期望 0）: $(grep -c '問題原因' code-review/SKILL.md)"
echo "證據欄（期望 4）: $(grep -c '     證據：' code-review/SKILL.md)"
echo "導致問題欄（期望 4）: $(grep -c '     導致問題：' code-review/SKILL.md)"
```

Expected（改動前）:
```
問題原因 殘留（期望 0）: 5
證據欄（期望 4）: 0
導致問題欄（期望 4）: 0
```

推算依據：原始 7 處為 4 個 severity 模板 + light mode 說明 + tiered 表格內文 + Common Mistakes 列。Task 1 已刪掉其中 2 處（light 說明、Common Mistakes 列），故此時應剩 **5**（4 模板 + 1 表格內文）。**若不是 5，停下來查** —— 代表 Task 1 刪錯或漏刪。

- [ ] **Step 2: 改 CRITICAL 模板**

```
CRITICAL（必須修復）[in-scope]：
  1. [{category}] {issue description}
     {file}:{line}
     規則來源：{skill name}
     修復參照：{skill name} → {specific section/rule name}
     問題原因：{why this is a problem}
     期望目標：{what the correct state should be}
     建議修復：{see tiered strategy below}
```
改為:
```
CRITICAL（必須修復）[in-scope]：
  1. [{category}] {issue description}
     {file}:{line}
     規則來源：{skill name}
     修復參照：{skill name} → {specific section/rule name}
     證據：{file}:{line} — {實際讀到的內容}
     導致問題：{what this causes}
     期望目標：{what the correct state should be}
     建議修復：{see tiered strategy below}
```

- [ ] **Step 3: 改 HIGH 模板**

```
HIGH（強烈建議修復）[in-scope]：
  2. [{category}] {issue description}
     {file}:{line range}
     規則來源：{skill name}
     修復參照：{skill name} → {specific section/rule name}
     問題原因：{why this is a problem}
     期望目標：{what the correct state should be}
     建議修復：{see tiered strategy below}
```
改為:
```
HIGH（強烈建議修復）[in-scope]：
  2. [{category}] {issue description}
     {file}:{line range}
     規則來源：{skill name}
     修復參照：{skill name} → {specific section/rule name}
     證據：{file}:{line} — {實際讀到的內容}
     導致問題：{what this causes}
     期望目標：{what the correct state should be}
     建議修復：{see tiered strategy below}
```

- [ ] **Step 4: 改 MEDIUM 模板**

```
MEDIUM（建議修復）[out-of-scope]：
  3. [{category}] {issue description}
     {file}
     規則來源：{skill name}
     修復參照：{skill name} → {specific section/rule name}
     問題原因：{why this is a problem}
     期望目標：{what the correct state should be}
     建議修復：{see tiered strategy below}
     ※ 超出 branch 目標，將以 TODO 註解標記
```
改為:
```
MEDIUM（建議修復）[out-of-scope]：
  3. [{category}] {issue description}
     {file}
     規則來源：{skill name}
     修復參照：{skill name} → {specific section/rule name}
     證據：{file}:{line} — {實際讀到的內容}
     導致問題：{what this causes}
     期望目標：{what the correct state should be}
     建議修復：{see tiered strategy below}
     ※ 超出 branch 目標，將以 TODO 註解標記
```

- [ ] **Step 5: 改 LOW 模板**

```
LOW（可選改善）[in-scope]：
  4. [{category}] {issue description}
     {file}:{line}
     規則來源：{skill name}
     修復參照：{skill name} → {specific section/rule name}
     問題原因：{why this is a problem}
     期望目標：{what the correct state should be}
     建議修復：{see tiered strategy below}
```
改為:
```
LOW（可選改善）[in-scope]：
  4. [{category}] {issue description}
     {file}:{line}
     規則來源：{skill name}
     修復參照：{skill name} → {specific section/rule name}
     證據：{file}:{line} — {實際讀到的內容}
     導致問題：{what this causes}
     期望目標：{what the correct state should be}
     建議修復：{see tiered strategy below}
```

- [ ] **Step 6: 改 `建議修復` Tiered Strategy 表格內文**

該表「結構性調整」列：
```markdown
| 結構性調整（檔案拆分、模組重組、架構變更） | 寫清楚問題原因與期望目標即可；可附範例方案但須標明為範例 | `（範例方案，實際做法請依討論結果決定）可考慮提取至共用模組` |
```
改為（`問題原因` → `導致問題`）:
```markdown
| 結構性調整（檔案拆分、模組重組、架構變更） | 寫清楚導致問題與期望目標即可；可附範例方案但須標明為範例 | `（範例方案，實際做法請依討論結果決定）可考慮提取至共用模組` |
```

同節末行：
```markdown
**核心原則：不要寫出可能不正確的具體解法。** 簡單確定的事直接寫，不確定的只描述問題與目標。
```
不動（「問題與目標」是泛稱，非欄位名）。

- [ ] **Step 7: 跑斷言，確認通過**

```bash
cd ~/.claude/skills
echo "問題原因 殘留（期望 0）: $(grep -c '問題原因' code-review/SKILL.md)"
echo "證據欄（期望 4）: $(grep -c '     證據：' code-review/SKILL.md)"
echo "導致問題欄（期望 4）: $(grep -c '     導致問題：' code-review/SKILL.md)"
echo "欄位順序檢查（證據 應緊鄰 導致問題 之前，期望 4）: $(grep -A1 '     證據：' code-review/SKILL.md | grep -c '     導致問題：')"
```

Expected:
```
問題原因 殘留（期望 0）: 0
證據欄（期望 4）: 4
導致問題欄（期望 4）: 4
欄位順序檢查（證據 應緊鄰 導致問題 之前，期望 4）: 4
```

最後一項是本設計的核心機制 —— 兩欄必須相鄰，推論落差才看得見。若非 4，停下來修。

---

### Task 3: 新增 `證據` 欄規格 + runtime severity 天花板硬規則

**Files:**
- Modify: `~/.claude/skills/code-review/SKILL.md` — 在 `#### 建議修復 Tiered Strategy` 之前插入兩個新小節
- Modify: `~/.claude/skills/code-review/SKILL.md` — Common Mistakes 表新增 3 列

**Interfaces:**
- Consumes: Task 2 的模板欄位名。
- Produces: `證據` 欄與天花板規則的完整規格，Task 5 replay 據此驗收。

- [ ] **Step 1: 寫斷言，確認現在失敗**

```bash
cd ~/.claude/skills
echo "證據欄規格節（期望 1）: $(grep -c '^#### .證據. Field' code-review/SKILL.md)"
echo "天花板硬規則節（期望 1）: $(grep -c 'HARD RULE' code-review/SKILL.md)"
```

Expected（改動前）:
```
證據欄規格節（期望 1）: 0
天花板硬規則節（期望 1）: 0
```

- [ ] **Step 2: 插入 `證據` Field 規格節**

在 `#### 建議修復 Tiered Strategy` 標題**之前**插入：

````markdown
#### `證據` Field

Each finding MUST include a `證據` line stating **where you actually read the fact that makes this finding true**.

**強制 file:line 指標，不接受敘述。**

| | 範例 | 為何 |
|---|---|---|
| ❌ | 「我查過 vue-tippy 的行為」 | 敘述，憑記憶也寫得出來 |
| ✅ | `vue-tippy.mjs:4253 — tag: { default: 'span' }` | 指標，要嘛存在要嘛不存在 |

指標無法用記憶偽造 —— 這是本欄的全部作用。

**`證據` 與 `{file}:{line}` 不是同一件事：** `{file}:{line}` 指的是**問題被認為在哪**；`證據` 指的是**問題存在的依據**。兩者常常不同檔。

**成本：** Step 5 本來就強制「Read full file」+「Read diff hunks」，指標通常已在 context 裡。本欄要求的是把已經看過的東西寫下來，不是多看。

**降級是合法出口（重要）：** 規則**不是**「讀到能證明為止」，而是「**要嘛引用，要嘛降級並說明**」。永遠不存在「你必須去讀」的情況。沒有這條出口，本欄會誘發防禦性閱讀（對已確定的事也去讀 source，免得欄位開天窗），成本無上限。

#### Runtime 主張的 Severity 天花板

> **HARD RULE：** 主張的對象若為 runtime 屬性，在無 runtime 證據的情況下，**severity 一律不得超過 LOW，無例外**。

**判準：**「這個主張的真假，能不能只靠讀 code 確立？」

不能 → runtime 主張。若其真假取決於**執行**（渲染結果、網路回應、時序、環境、使用者互動），讀再多 code 都只是推論。

常見案例（**舉例，非窮舉**）：rendered layout、實際 API 回應內容、時序 / race、瀏覽器或裝置行為、第三方服務回應。

**混合主張：** 一條 finding 可能同時含靜態與 runtime 成分。判斷方式是**把 `導致問題` 欄的內容拿去套上述判準** —— 天花板取決於 finding 實際主張的那一個，靜態成分再確鑿也不能拉高它。

範例：「Tippy wrapper span 存在」（靜態，可引用 source，確立）+「因此 layout 壞掉」（runtime，推論）。該 finding 主張的是 layout 壞掉 → 天花板 LOW。

**為何無例外：** 「這次推論夠強所以破例」正是產生 false positive 的那條路徑 —— 寫錯的人當下都覺得自己推論夠強。且降級不花任何 token。

**False negative 是可接受的：** 被壓到 LOW 的 finding 不會消失，仍以 comment 送達作者，且明白標示「（推測，未經 runtime 驗證）」+ 請其確認。作者是驗證成本最低的人（branch 在他手上、環境開著）。降級是**移交**，不是遺漏。反向的傷害更大：severity 是共用貨幣，在不可驗證的主張上灌水會讓所有 MEDIUM 一起貶值。
````

- [ ] **Step 3: Common Mistakes 表新增 3 列**

在表格末尾（原 435 行之後）追加：

```markdown
| `證據` 欄寫敘述而非 file:line 指標（如「我查過 X 的行為」） | 必須寫 `{file}:{line} — {實際讀到的內容}`。敘述可由記憶偽造，指標不行 —— 這是本欄唯一的作用機制 |
| 把 `{file}:{line}`（問題在哪）當成 `證據`（依據在哪） | 兩者常不同檔。#3 型錯誤的 `{file}:{line}` 指向被懷疑的那行，但那行證明不了問題存在 |
| runtime 主張（layout / API 回應 / 時序 / 瀏覽器行為）未經降級即給 MEDIUM 以上 | 套判準：「真假能不能只靠讀 code 確立？」不能 → 天花板 LOW，無例外。把 `導致問題` 欄的內容拿去套，不是把 `證據` 欄拿去套 |
| 因為填不出 `證據` 就去讀 source 直到能證明 | 降級是合法出口 —— 要嘛引用，要嘛降級並說明。不存在「必須去讀」 |
```

- [ ] **Step 4: 跑斷言，確認通過**

```bash
cd ~/.claude/skills
echo "證據欄規格節（期望 1）: $(grep -c '^#### .證據. Field' code-review/SKILL.md)"
echo "天花板硬規則節（期望 1）: $(grep -c 'HARD RULE' code-review/SKILL.md)"
echo "降級出口有寫明（期望 >=2）: $(grep -c '降級是合法出口\|要嘛引用，要嘛降級' code-review/SKILL.md)"
echo "--- Common Mistakes 新增的 4 列（每列期望 1）---"
CM=$(sed -n '/^## Common Mistakes/,$p' code-review/SKILL.md)
echo "證據填敘述: $(echo "$CM" | grep -c '欄寫敘述而非 file:line 指標')"
echo "混淆兩種 file:line: $(echo "$CM" | grep -c '當成 .證據')"
echo "runtime 未降級: $(echo "$CM" | grep -c 'runtime 主張.*未經降級')"
echo "防禦性閱讀: $(echo "$CM" | grep -c '就去讀 source 直到能證明')"
```

Expected:
```
證據欄規格節（期望 1）: 1
天花板硬規則節（期望 1）: 1
降級出口有寫明（期望 >=2）: 4
--- Common Mistakes 新增的 4 列（每列期望 1）---
證據填敘述: 1
混淆兩種 file:line: 1
runtime 未降級: 1
防禦性閱讀: 1
```

逐列檢查內容，不用列數 —— `grep -c '^| '` 會掃到檔案內所有表格（檔案分類表、verdict 表、tiered strategy 表、證據欄自己的表），數字無意義。

---

### Task 4: 同步兩份內嵌模板複本

**Files:**
- Modify: `~/.claude/skills/naming-conventions/SKILL.md:25-29`
- Modify: `~/.claude/skills/review-workflow/references/local-branch.md:154`

**Interfaces:**
- Consumes: Task 2 的最終欄位名與順序。
- Produces: 三份模板一致。

**背景：** finding 模板無 single source of truth，散佈多份。本 Task 手動同步 —— 這確實強化了重複，但依 change-scoping Gate 1，去重是獨立的 refactor change，不與本次綁定（已列入 spec Backlog）。

- [ ] **Step 1: 寫斷言，確認現在失敗**

```bash
cd ~/.claude/skills
echo "問題原因 全域殘留（期望 0）: $(grep -rc '問題原因' --include='*.md' . 2>/dev/null | grep -v ':0$' | grep -v '/docs/')"
```

Expected（改動前）:
```
./review-workflow/references/local-branch.md:1
./naming-conventions/SKILL.md:1
```

- [ ] **Step 2: 同步 `naming-conventions/SKILL.md`**

第 25-29 行的內嵌模板：
```
[{severity}] [{category}] {issue description}
{file}:{line}
規則來源：naming-conventions
修復參照：naming-conventions → {specific rule name}
問題原因：{why this is a problem}
期望目標：{what the correct state should be}
建議修復：{suggestion}
```
改為:
```
[{severity}] [{category}] {issue description}
{file}:{line}
規則來源：naming-conventions
修復參照：naming-conventions → {specific rule name}
證據：{file}:{line} — {實際讀到的內容}
導致問題：{what this causes}
期望目標：{what the correct state should be}
建議修復：{suggestion}
```

- [ ] **Step 3: 同步 `review-workflow/references/local-branch.md`**

第 154 行（Phase 4a，向使用者陳述 finding 時點名的欄位）：
```markdown
   - Present the finding (問題原因、期望目標)
```
改為:
```markdown
   - Present the finding (證據、導致問題、期望目標)
```

- [ ] **Step 4: 跑斷言，確認通過**

```bash
cd ~/.claude/skills
echo "--- 問題原因 全域殘留（期望：只剩 docs/ 內的歷史文件）---"
grep -rln '問題原因' --include='*.md' . 2>/dev/null
echo "--- 三份模板都有 證據 欄（期望 3 個檔）---"
grep -rln '證據：' --include='*.md' . 2>/dev/null | grep -v '/docs/'
```

Expected:
```
--- 問題原因 全域殘留（期望：只剩 docs/ 內的歷史文件）---
./code-review/docs/specs/2026-07-15-finding-evidence-field-design.md
./code-review/docs/specs/2026-06-04-code-review-token-optimization-design.md
./code-review/docs/plans/2026-07-15-finding-evidence-field.md
--- 三份模板都有 證據 欄（期望 3 個檔）---
./code-review/SKILL.md
./naming-conventions/SKILL.md
```

`docs/` 底下的是歷史設計文件與本計畫，**不得修改** —— 它們記錄的是當時的決策。

注意 `local-branch.md` 不會出現在第二個清單（它只點名欄位、不含模板），這是正確的。

---

### Task 5: 以 PR #8380 的 8 條 finding 做 regression replay

**Files:**
- 無修改。純驗收。

**Interfaces:**
- Consumes: Task 1-4 的全部改動。

**背景：** PR #8380（ADAT-562）是本設計的來源案例。當時 8 條 finding 有 3 條需要修正，且 **#3 是在 heavy mode 下產生的** —— 完整六欄仍寫錯。這是最直接的驗收 fixture。

- [ ] **Step 1: 讀改動後的 SKILL.md 全文**

```bash
cat ~/.claude/skills/code-review/SKILL.md
```

確認無自相矛盾、無空號、無 mode 殘句。

- [ ] **Step 2: 對照四條驗收案例**

拿改動後的模板與規則，逐條檢查它會不會擋下當初的錯誤：

| 案例 | 當初寫的 | 新規則下應發生 |
|---|---|---|
| **#8** emit 命名 | 「emit 改名 listener 也要跟著改」（憑印象，錯） | `證據` 欄要求 Vue emit 解析的 file:line。要嘛去讀 `@vue/runtime-core`（讀了就會發現 `camelize`，錯誤不產生），要嘛填不出來 → 降級。**兩條路都不會產出原本那條錯的斷言** |
| **#1** includeUnassociated | 「搜尋結果確實被過濾了」（過度延伸） | `證據` 只到 `buildSearchParams` 那行（param 有送出）。`導致問題` 不得寫「結果被過濾」—— 那需要 backend 行為的指標，補不出來 → 主張退回「param 帶 false 送出」 |
| **#3** Tippy layout | MEDIUM「wrapper 破壞 layout」（false positive） | `導致問題` = 「分隔線可能錯位」→ 套判準「能不能只靠讀 code 確立？」→ 不能（rendered layout）→ **天花板 LOW**，且須標「（推測，未經 runtime 驗證）」 |
| **#6** unused `filterId` | LOW | `導致問題` = 「無實際影響，純可讀性」→ 無 consequence → 維持 LOW。**驗證欄位與 severity 自動對齊** |

四條都符合 → Task 5 通過。任一條不符 → 回報並停下，不要硬改規則去遷就。

- [ ] **Step 3: 驗證 `fix-planning` 路由未壞**

```bash
grep -n "修復參照" ~/.claude/skills/fix-planning/SKILL.md | head -5
grep -c "修復參照" ~/.claude/skills/code-review/SKILL.md
```

Expected: `fix-planning` 仍讀 `修復參照`，`code-review` 仍產出該欄（count > 0）。全走完整模板後該欄恆存在，路由不受影響。

- [ ] **Step 4: 驗證 verdict 邏輯與 early exit 未動**

```bash
sed -n '/Verdict logic/,/PASS — 未發現問題/p' ~/.claude/skills/code-review/SKILL.md
grep -n "沒有偵測到變更檔案" ~/.claude/skills/code-review/SKILL.md
```

Expected: verdict 四列表格原封不動（BLOCK / WARN / PASS / PASS — 未發現問題）；early exit（Step 2 的「沒有偵測到變更檔案」）仍在且未被改動。

天花板規則只影響 severity 的**指派**，不影響 severity 到 verdict 的**映射**；本次也未觸及 Step 2，early exit 結構上不受影響 —— 此步是確認沒有誤刪。

- [ ] **Step 5: 記錄完成**

`~/.claude` 不是 git repo，無 commit 步驟。改為在 spec 末尾追加一行：

```markdown
---

**Implemented:** 2026-07-15。備份於 `~/.claude/skills/.backup-2026-07-15/`。
```

---

## 完成後的下一步（不在本計畫內）

依 spec Backlog，緊接的兩個獨立 change：

1. **`backend-code-review` 模板設計** —— 它是三欄制、無 mode，等於永久 light mode，防護最弱。需先釐清 Go 的 runtime 議題（concurrency / timing / 實際 API 行為）是否適用同一套天花板。
2. **Finding 模板去重** —— 本次手動同步 3 份複本，強化了重複。抽共用 reference 是獨立 refactor change。
