# Finding Template SSOT Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers--subagent-driven-development (recommended) or superpowers--executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make `code-review` the sole owner of the finding template; every other review skill forwards it, is a pure rule, or is a declared-independent format — so a template change never has to be synced across copies.

**Architecture:** Edit 7 markdown skill files under `~/.claude/skills/`. Core move: unify code-review's Step 6 finding template (dedup its ×4 severity blocks into one, rename `證據`→`參考依據`, add two optional fields `待確認`/`合併順序`, add author-facing formatting rules + golden sample, add an ownership note). Then strip the redundant copies: `naming-conventions` (drop its format block → pure rule), `interface-impact-check` (drop its format skeleton, keep rule content), `backend-code-review` (declare its format intentionally independent). Finally propagate the `參考依據` rename into the three review-workflow reference files that restate it.

**Tech Stack:** Markdown skill files. **`~/.claude` is NOT a git repo** — no CI, no per-task `git commit`. Rollback is a one-time backup (Task 1). No automated tests — every edit is verified with `grep`/read.

**Spec:** `~/.claude/skills/code-review/docs/specs/2026-07-20-finding-template-ssot-design.md`

---

## File Structure

| File | Responsibility | Tasks |
|---|---|---|
| `code-review/SKILL.md` | canonical template owner | 2 (block), 3 (formatting+ownership), 4 (prose rename) |
| `naming-conventions/SKILL.md` | pure rule skill | 5 |
| `interface-impact-check/SKILL.md` | rule/requirement | 6 |
| `backend-code-review/SKILL.md` | independent format | 7 |
| `review-workflow/references/pr-review.md` | forwarder | 8 |
| `review-workflow/references/local-branch.md` | forwarder | 8 |
| `review-workflow/references/post-review-validation.md` | validator | 8 |

Backup root: `~/.claude/skills/.backup-finding-template-ssot-2026-07-20/` (mirrors relative paths).

Absolute paths below; `~` = user home.

---

### Task 1: Backup all 7 target files

Backup replaces per-task commits (no git repo). Do it once, before any edit.

- [ ] **Step 1: Create backup root and copy all 7 files preserving structure**

```bash
BK=~/.claude/skills/.backup-finding-template-ssot-2026-07-20
S=~/.claude/skills
mkdir -p "$BK/code-review" "$BK/naming-conventions" "$BK/interface-impact-check" \
         "$BK/backend-code-review" "$BK/review-workflow/references"
cp "$S/code-review/SKILL.md"                              "$BK/code-review/SKILL.md"
cp "$S/naming-conventions/SKILL.md"                       "$BK/naming-conventions/SKILL.md"
cp "$S/interface-impact-check/SKILL.md"                   "$BK/interface-impact-check/SKILL.md"
cp "$S/backend-code-review/SKILL.md"                      "$BK/backend-code-review/SKILL.md"
cp "$S/review-workflow/references/pr-review.md"           "$BK/review-workflow/references/pr-review.md"
cp "$S/review-workflow/references/local-branch.md"        "$BK/review-workflow/references/local-branch.md"
cp "$S/review-workflow/references/post-review-validation.md" "$BK/review-workflow/references/post-review-validation.md"
```

- [ ] **Step 2: Verify 7 files backed up**

Run:
```bash
find ~/.claude/skills/.backup-finding-template-ssot-2026-07-20 -name '*.md' | sort
```
Expected: 7 files listed.

---

### Task 2: code-review — restructure Step 6 output block (dedup ×4, rename, optional fields)

**Files:** Modify `~/.claude/skills/code-review/SKILL.md` (Step 6 output block, lines 266–318 inside the ``` fence)

- [ ] **Step 1: Confirm the current block is present**

Run:
```bash
grep -c "證據：{file}:{line} — {實際讀到的內容}" ~/.claude/skills/code-review/SKILL.md
```
Expected: `4` (the four repeated severity blocks). If not 4, STOP and re-read Step 6.

- [ ] **Step 2: Replace the block**

Replace this exact text (the content between the ``` fences, from `━━━━━━━━━━━━ Code Review` through `結論：{verdict}`):

````
━━━━━━━━━━━━ Code Review ━━━━━━━━━━━━

檢查檔案數：{N}
候選規則：{full candidate list from Step 3c}
實際套用：{activated subset after Step 5}
Interface impact：{triggered signal} → sibling {N} / consumer {M}
Branch 目標：{objective or "未提供"}

CRITICAL（必須修復）[in-scope]：
  1. [{category}] {issue description}
     {file}:{line}
     規則來源：{skill name}
     修復參照：{skill name} → {specific section/rule name}
     證據：{file}:{line} — {實際讀到的內容}
     導致問題：{what this causes}
     期望目標：{what the correct state should be}
     建議修復：{see tiered strategy below}

HIGH（強烈建議修復）[in-scope]：
  2. [{category}] {issue description}
     {file}:{line range}
     規則來源：{skill name}
     修復參照：{skill name} → {specific section/rule name}
     證據：{file}:{line} — {實際讀到的內容}
     導致問題：{what this causes}
     期望目標：{what the correct state should be}
     建議修復：{see tiered strategy below}

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

LOW（可選改善）[in-scope]：
  4. [{category}] {issue description}
     {file}:{line}
     規則來源：{skill name}
     修復參照：{skill name} → {specific section/rule name}
     證據：{file}:{line} — {實際讀到的內容}
     導致問題：{what this causes}
     期望目標：{what the correct state should be}
     建議修復：{see tiered strategy below}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

摘要：{N} CRITICAL, {N} HIGH, {N} MEDIUM, {N} LOW（in-scope: {N}, out-of-scope: {N}）
結論：{verdict}
````

with this new block (severity groups kept; the per-finding format defined **once**; `證據`→`參考依據`; two optional fields added):

````
━━━━━━━━━━━━ Code Review ━━━━━━━━━━━━

檢查檔案數：{N}
候選規則：{full candidate list from Step 3c}
實際套用：{activated subset after Step 5}
Interface impact：{triggered signal} → sibling {N} / consumer {M}
Branch 目標：{objective or "未提供"}

<依 severity 分組輸出，組別固定如下、每組標 [in-scope]/[out-of-scope]；
 每組下的每條 finding 一律用「唯一 finding 格式」，跨 severity 共用同一份>

  CRITICAL（必須修復）
  HIGH（強烈建議修復）
  MEDIUM（建議修復）
  LOW（可選改善）

唯一 finding 格式（所有 severity 共用；欄位順序固定，不得重排或刪欄）：

  {n}. [{category}] {issue description}
     {file}:{line}
     規則來源：{skill name}
     修復參照：{skill name} → {specific section/rule name}
     參考依據：{file}:{line} — {實際讀到的內容}
     導致問題：{what this causes}
     期望目標：{what the correct state should be}
     建議修復：{see tiered strategy below}
     待確認：{給作者的 runtime 問題}                              ← 選用：finding 含未解 runtime 成分時才寫
     合併順序：{ticket} 已涵蓋但尚未落地，單獨 merge 會開一個窗口   ← 選用：ticket 涵蓋但 merge 時序有風險時才寫

  ※ out-of-scope 的 finding 於該行下方加註「※ 超出 branch 目標，將以 TODO 註解標記」

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

摘要：{N} CRITICAL, {N} HIGH, {N} MEDIUM, {N} LOW（in-scope: {N}, out-of-scope: {N}）
結論：{verdict}
````

- [ ] **Step 3: Verify dedup + rename in the block**

Run:
```bash
grep -c "參考依據：{file}:{line} — {實際讀到的內容}" ~/.claude/skills/code-review/SKILL.md; echo "---"
grep -c "規則來源：{skill name}" ~/.claude/skills/code-review/SKILL.md; echo "---"
grep -n "唯一 finding 格式" ~/.claude/skills/code-review/SKILL.md
```
Expected: first = `1` (one unified block, not 4); second = `1`; third = one match.

---

### Task 3: code-review — add formatting rules, golden sample, ownership note

**Files:** Modify `~/.claude/skills/code-review/SKILL.md` (insert after the transparency paragraph that follows the Step 6 block, before `#### 證據 Field`)

- [ ] **Step 1: Confirm the anchor paragraph is present**

Run:
```bash
grep -n "This mirrors the" ~/.claude/skills/code-review/SKILL.md
```
Expected: one match (the paragraph ending `…the reader can see what was skipped.`).

- [ ] **Step 2: Insert the new subsections after that paragraph**

Replace this exact text:

````
When the Step 3d gate does not fire or Stage 2 clears it, the line reads `Interface impact：未觸發`.
This mirrors the `候選規則 / 實際套用` transparency lines — the reader can see what was skipped.
````

with (same paragraph, then three new subsections appended):

`````
When the Step 3d gate does not fire or Stage 2 clears it, the line reads `Interface impact：未觸發`.
This mirrors the `候選規則 / 實際套用` transparency lines — the reader can see what was skipped.

#### 排版（author-facing）

finding 會貼給 PR 作者看，排版需符合：

- 每欄自成一行，格式 `欄名：值`。
- 值過長 → 斷行，續行縮排對齊到值的起點（不要單行拉太長）。
- 一條 finding 的各欄，縮排在標頭行之下。
- 核心欄與選用欄（`待確認`/`合併順序`）之間空一行。
- 可讀性優先於精簡。

Golden sample：

```
[HIGH] [interface-impact] getAddOnLicenseTypes 換 byDeviceType 後，2 sibling / 3 consumer 未同步
  src/utils/activationHelper.js:57
  規則來源：interface-impact-check
  修復參照：interface-impact-check → "Step 7: Emit"
  參考依據：src/composables/features/useScheduleActivationHelper.js:103
           — 只在 deviceType===CAMERA 時建 ADD_ON，MA2/MA4 落空
  導致問題：producer 對 MA2/MA4 產出 CLOUD_BACKUP_MA2；
           consumer 讀 CLOUD_BACKUP → 取得 undefined
  期望目標：producer 與 consumer 對同一份資料的 key 契約一致
  建議修復：（範例方案，實際做法依討論決定）
           依 deviceType 補 MA2/MA4 的 ADD_ON 分支

  待確認：MA4 通道數在此環境是否會走到未定義分支？
```

#### 模板所有權

本 skill 是 finding 模板的**唯一擁有者**。其他 skill 一律不得保留本模板的副本：

- **consumer（pr-review、local-branch）**：forward 本模板輸出、不自訂格式。
- **naming-conventions**：純規則，由本 skill 代排。
- **interface-impact-check**：規則/要求，其 findings merge 進本 Step 6、由本模板排版（會填 `待確認`/`合併順序` 選用欄）。
- **backend-code-review**：刻意獨立的另一格式，不對齊本模板。

若改本模板的**欄位標籤**，需同步更新仍 restate 標籤的少數 forwarder 引用：`review-workflow/references/{pr-review,local-branch,post-review-validation}.md`。
`````

- [ ] **Step 3: Verify the three subsections exist**

Run:
```bash
grep -nE "#### 排版（author-facing）|#### 模板所有權|Golden sample" ~/.claude/skills/code-review/SKILL.md
```
Expected: three matches.

---

### Task 4: code-review — rename `證據`→`參考依據` in prose (NOT the common noun at the runtime rule)

**Files:** Modify `~/.claude/skills/code-review/SKILL.md` (the `#### 證據 Field` section heading + body, and the four Common Mistakes rows). Leave `無 runtime 證據` untouched.

- [ ] **Step 1: Rename the section heading**

Replace `#### `證據` Field` with `#### `參考依據` Field`.

- [ ] **Step 2: Rename the body sentence (line ~326)**

Replace:
```
Each finding MUST include a `證據` line stating **where you actually read the fact that makes this finding true**.
```
with:
```
Each finding MUST include a `參考依據` line stating **where you actually read the fact that makes this finding true**.
```

- [ ] **Step 3: Rename the "不是同一件事" sentence (line ~337)**

Replace:
```
**`證據` 與 `{file}:{line}` 不是同一件事：** `{file}:{line}` 指的是**問題被認為在哪**；`證據` 指的是**問題存在的依據**。兩者常常不同檔。
```
with:
```
**`參考依據` 與 `{file}:{line}` 不是同一件事：** `{file}:{line}` 指的是**問題被認為在哪**；`參考依據` 指的是**問題存在的依據**。兩者常常不同檔。
```

- [ ] **Step 4: Rename the four Common Mistakes rows (lines ~437–440)**

Replace:
```
| `證據` 欄寫敘述而非 file:line 指標（如「我查過 X 的行為」） | 必須寫 `{file}:{line} — {實際讀到的內容}`。敘述可由記憶偽造，指標不行 —— 這是本欄唯一的作用機制 |
| 把 `{file}:{line}`（問題在哪）當成 `證據`（依據在哪） | 兩者常不同檔。被懷疑的那一行往往證明不了問題存在 —— 例如「這個 wrapper 會破壞 layout」的 `{file}:{line}` 指向 wrapper 本身，但那行只證明 wrapper 存在 |
| runtime 主張（layout / API 回應 / 時序 / 瀏覽器行為）未經降級即給 MEDIUM 以上 | 套判準：「真假能不能只靠讀 code 確立？」不能 → 天花板 LOW，無例外。把 `導致問題` 欄的內容拿去套，不是把 `證據` 欄拿去套 |
| 因為填不出 `證據` 就去讀 source 直到能證明 | 降級是合法出口 —— 要嘛引用，要嘛降級並說明。不存在「必須去讀」 |
```
with:
```
| `參考依據` 欄寫敘述而非 file:line 指標（如「我查過 X 的行為」） | 必須寫 `{file}:{line} — {實際讀到的內容}`。敘述可由記憶偽造，指標不行 —— 這是本欄唯一的作用機制 |
| 把 `{file}:{line}`（問題在哪）當成 `參考依據`（依據在哪） | 兩者常不同檔。被懷疑的那一行往往證明不了問題存在 —— 例如「這個 wrapper 會破壞 layout」的 `{file}:{line}` 指向 wrapper 本身，但那行只證明 wrapper 存在 |
| runtime 主張（layout / API 回應 / 時序 / 瀏覽器行為）未經降級即給 MEDIUM 以上 | 套判準：「真假能不能只靠讀 code 確立？」不能 → 天花板 LOW，無例外。把 `導致問題` 欄的內容拿去套，不是把 `參考依據` 欄拿去套 |
| 因為填不出 `參考依據` 就去讀 source 直到能證明 | 降級是合法出口 —— 要嘛引用，要嘛降級並說明。不存在「必須去讀」 |
```

- [ ] **Step 5: Verify prose renamed, common noun preserved**

Run:
```bash
grep -n "無 runtime 證據" ~/.claude/skills/code-review/SKILL.md; echo "-- expect: still present (common noun) --"
grep -c "證據" ~/.claude/skills/code-review/SKILL.md; echo "-- expect: 1 (only 無 runtime 證據) --"
grep -c "參考依據" ~/.claude/skills/code-review/SKILL.md; echo "-- expect: >=10 --"
```
Expected: `無 runtime 證據` still present; total `證據` count = `1`; `參考依據` count ≥ 10.

---

### Task 5: naming-conventions — drop format block, become pure rule

**Files:** Modify `~/.claude/skills/naming-conventions/SKILL.md` (Standalone Mode step 3, lines 21–32)

- [ ] **Step 1: Confirm the format block is present**

Run:
```bash
grep -n "Output report.*in code-review finding format" ~/.claude/skills/naming-conventions/SKILL.md
```
Expected: one match (line ~21).

- [ ] **Step 2: Replace step 3 + its format block**

Replace this exact text:

````
3. **Output report** in code-review finding format:

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
````

with:

````
3. **Emit findings via `code-review`.** 本 skill 是規則 skill，不自排 finding 格式。要格式化的 naming review，經 `code-review`（或 `review-workflow`）執行、只載本規則；finding 由 code-review 的統一模板排版（與其他 rule skill 一致）。
````

- [ ] **Step 3: Verify block gone**

Run:
```bash
grep -c "Output report.*in code-review finding format" ~/.claude/skills/naming-conventions/SKILL.md; echo "-- expect 0 --"
grep -c "證據" ~/.claude/skills/naming-conventions/SKILL.md; echo "-- expect 0 --"
grep -n "Emit findings via" ~/.claude/skills/naming-conventions/SKILL.md; echo "-- expect 1 --"
```
Expected: first `0`, second `0`, third one match.

---

### Task 6: interface-impact-check — drop format skeleton, keep rule content, rename ref

**Files:** Modify `~/.claude/skills/interface-impact-check/SKILL.md` (finding-body skeleton lines 188–202; prose ref line ~170)

- [ ] **Step 1: Confirm the skeleton is present**

Run:
```bash
grep -n "Finding body (zh-TW, per" ~/.claude/skills/interface-impact-check/SKILL.md
```
Expected: one match (line ~188).

- [ ] **Step 2: Replace the skeleton with a deferral note (rule content stays elsewhere in the file)**

Replace this exact text:

````
Finding body (zh-TW, per `code-review` Report Language):

```
HIGH：{contract} 變更後，{N} 個 sibling producer / {M} 個 consumer 未同步
  {producerFile}:{line}
  規則來源：interface-impact-check
  修復參照：interface-impact-check → "Step 7: Emit"
  證據：{consumerFile}:{line} — {讀到的事實}
  導致問題：producer 產出 {newShape}；{consumerFile}:{line} 讀 {oldKey} → 取得 undefined
  期望目標：producer 與 consumer 對同一份資料的 key 契約一致
  建議修復：（範例方案，實際做法請依討論結果決定）{...}

  合併順序：{ticket} 涵蓋此範圍但尚未落地。本 PR 單獨 merge 會開一個窗口。
  待確認：{the runtime question for the author}
```
````

with:

````
Finding：本 skill 為規則/要求，findings merge 進 `code-review` Step 6，由其統一模板排版（本 skill 不自排）。本 skill 負責偵測、填入各欄內容，並在契約情境填入 `合併順序`/`待確認` 兩個選用欄（其定義見 code-review Step 6）。填欄的領域規則：一條 finding 錨在 producer、以 evidence list 承載受影響檔（不拆成多條）；`導致問題` 停在最後可靜態證明的一步，UI 後果是 runtime 主張 → 移到 `待確認`（見上方 severity 規則與下方 Common Mistakes）。
````

- [ ] **Step 3: Rename the prose reference (line ~170)**

Replace:
```
the `證據` field already forces citation — a refuter round buys the same guarantee twice.
```
with:
```
the `參考依據` field already forces citation — a refuter round buys the same guarantee twice.
```

- [ ] **Step 4: Verify skeleton gone, rename done, rule content intact**

Run:
```bash
grep -c "HIGH：{contract} 變更後" ~/.claude/skills/interface-impact-check/SKILL.md; echo "-- expect 0 (skeleton gone) --"
grep -c "證據" ~/.claude/skills/interface-impact-check/SKILL.md; echo "-- expect 0 --"
grep -c "參考依據" ~/.claude/skills/interface-impact-check/SKILL.md; echo "-- expect 1 --"
grep -c "Writing the UI consequence in" ~/.claude/skills/interface-impact-check/SKILL.md; echo "-- expect 1 (rule content preserved) --"
```
Expected: `0`, `0`, `1`, `1`.

---

### Task 7: backend-code-review — declare format intentionally independent

**Files:** Modify `~/.claude/skills/backend-code-review/SKILL.md` (after line 89, before `## Output Format`)

- [ ] **Step 1: Confirm the anchor line is present**

Run:
```bash
grep -n "Use the format and severity mapping below." ~/.claude/skills/backend-code-review/SKILL.md
```
Expected: one match (line ~89).

- [ ] **Step 2: Insert the declaration after that line**

Replace:
```
Use the format and severity mapping below.
```
with:
```
Use the format and severity mapping below.

> **格式獨立宣告**：本 3 欄格式（`{一句說明}` / `{file}:{line}` / `修復參照`）**刻意獨立**於 `code-review` 的 finding 模板。backend 是不同語言的獨立引擎、從不經過 code-review，無法 forward。只與 code-review 共用穩定慣例（severity 分級名、`修復參照` 語意、verdict 表），**不需也不應**對齊 code-review 模板。
```

- [ ] **Step 3: Verify declaration present**

Run:
```bash
grep -c "格式獨立宣告" ~/.claude/skills/backend-code-review/SKILL.md
```
Expected: `1`.

---

### Task 8: review-workflow references — propagate `參考依據` rename

**Files:** Modify three files under `~/.claude/skills/review-workflow/references/`

- [ ] **Step 1: pr-review.md — rename the body-layout field (line ~98)**

Replace:
```
     證據：{file}:{line} — {實際讀到的內容}
```
with:
```
     參考依據：{file}:{line} — {實際讀到的內容}
```

- [ ] **Step 2: local-branch.md — rename the present-finding line (line ~154)**

Replace:
```
   - Present the finding (證據、導致問題、期望目標)
```
with:
```
   - Present the finding (參考依據、導致問題、期望目標)
```

- [ ] **Step 3: post-review-validation.md — rename the V4 example (line ~46)**

Replace:
```
- The `證據：{file}:{line}` cross-file evidence pointer IS allowed in the body — it is the basis for the finding and usually points to a different file than the anchor
```
with:
```
- The `參考依據：{file}:{line}` cross-file evidence pointer IS allowed in the body — it is the basis for the finding and usually points to a different file than the anchor
```

- [ ] **Step 4: Verify all three renamed**

Run:
```bash
grep -rc "證據" ~/.claude/skills/review-workflow/references/; echo "-- each expect 0 --"
grep -rn "參考依據" ~/.claude/skills/review-workflow/references/
```
Expected: `證據` count = 0 in all three files; `參考依據` appears once in each.

---

### Task 9: Final verification

- [ ] **Step 1: Global `證據` sweep — only the common noun survives**

Run:
```bash
grep -rn "證據" \
  ~/.claude/skills/code-review/SKILL.md \
  ~/.claude/skills/naming-conventions/SKILL.md \
  ~/.claude/skills/interface-impact-check/SKILL.md \
  ~/.claude/skills/backend-code-review/SKILL.md \
  ~/.claude/skills/review-workflow/references/
```
Expected: exactly **one** line — `code-review/SKILL.md:… 無 runtime 證據 …`. Any other hit is a missed rename → fix it.

- [ ] **Step 2: Template dedup holds**

Run:
```bash
grep -c "規則來源：{skill name}" ~/.claude/skills/code-review/SKILL.md
```
Expected: `1` (single unified finding format, not 4).

- [ ] **Step 3: Copies removed / declarations present**

Run:
```bash
grep -c "Output report.*in code-review finding format" ~/.claude/skills/naming-conventions/SKILL.md; echo "-- expect 0 --"
grep -c "HIGH：{contract} 變更後" ~/.claude/skills/interface-impact-check/SKILL.md; echo "-- expect 0 --"
grep -c "格式獨立宣告" ~/.claude/skills/backend-code-review/SKILL.md; echo "-- expect 1 --"
grep -c "模板所有權" ~/.claude/skills/code-review/SKILL.md; echo "-- expect 1 --"
```
Expected: `0`, `0`, `1`, `1`.

- [ ] **Step 4 (MANUAL — user runs): behavior spot-checks**

Cannot be done by editing files. Hand back to the user (from spec 驗證方式):

1. `use skill - naming-conventions` standalone → confirm it no longer self-formats and defers to code-review's unified format.
2. Trigger a review on a contract-change PR → confirm interface-impact's finding is rendered by the unified template, includes `待確認`/`合併順序` when relevant, and its domain rule (導致問題 stops at the statically-provable step) still holds.
3. Check a long-value finding renders with wrapped/indented continuation lines and a blank line before the optional block.
4. Spot-check a PR comment body vs code-review terminal output — fields match line-for-line, using `參考依據`.

Report results; if any fails, roll back via the backup and reopen the spec.

---

## Rollback

```bash
BK=~/.claude/skills/.backup-finding-template-ssot-2026-07-20
S=~/.claude/skills
cp "$BK/code-review/SKILL.md"                               "$S/code-review/SKILL.md"
cp "$BK/naming-conventions/SKILL.md"                        "$S/naming-conventions/SKILL.md"
cp "$BK/interface-impact-check/SKILL.md"                    "$S/interface-impact-check/SKILL.md"
cp "$BK/backend-code-review/SKILL.md"                       "$S/backend-code-review/SKILL.md"
cp "$BK/review-workflow/references/pr-review.md"            "$S/review-workflow/references/pr-review.md"
cp "$BK/review-workflow/references/local-branch.md"         "$S/review-workflow/references/local-branch.md"
cp "$BK/review-workflow/references/post-review-validation.md" "$S/review-workflow/references/post-review-validation.md"
```
