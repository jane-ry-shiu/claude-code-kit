# Finding 模板 SSOT — code-review 單一擁有，其餘 forward / 規則 / 獨立

- 日期：2026-07-20
- 主體 skill：`code-review`（模板唯一擁有者）
- 連動：`naming-conventions`、`interface-impact-check`、`backend-code-review`、`review-workflow/references/{pr-review,local-branch,post-review-validation}.md`

## 背景

finding 模板目前散佈在 4 個 skill，改一個欄位會漂。實測：把 `證據` 欄改名為 `參考依據`，現況要動 **18 處、6 個檔**（`code-review` 12、`interface-impact-check` 2、`naming-conventions` 1、`pr-review` 1、`local-branch` 1、`post-review-validation` 1；`backend-code-review` 0）。2026-07-15 的欄位改版就是因此漂掉（`pr-review` 沒跟上，已於 07-17 另案修復）。

### 重新框定：不是「4 份相同副本」

逐一看每個 skill **在什麼情境產生 finding**，會發現只有一份是真副本：

| Skill | 產 finding 的情境 | 本質 |
|---|---|---|
| **code-review** | 前端引擎，自產 | **canonical**（欄位目錄 + 語意的唯一家） |
| **naming-conventions** | 被 code-review 載入時由 code-review 排版；只有 standalone 才自排 | **純規則**（副本是多餘的） |
| **interface-impact-check** | 被 code-review Step 3d gate 觸發，findings merge 進 Step 6 | **規則/要求**（排版該歸 code-review；只多 2 欄） |
| **backend-code-review** | 獨立 Go 引擎，從不經過 code-review | **刻意獨立格式**（不同引擎，構不到 forward） |

**核心洞見（forwarding，非 syncing）**：凡是「收到 code-review 輸出」的 consumer，拿到什麼就吐什麼（此即 07-17 pr-review 的修法）。副本能 forward 就不該存在，沒有東西要同步 → 不需要 generator，也不需要 manifest。

## 目標

1. finding 模板**只有一個家：code-review**。
2. 其餘 skill 各歸其位：forwarder（原樣吐）／純規則（code-review 代排）／刻意獨立（backend）。
3. 順帶完成使用者確認的模板優化：`證據`→`參考依據` 改名、新增 `待確認`/`合併順序` 兩個選用欄、加上 author-facing 排版規則。
4. drift 從結構上變不可能（沒有「同一份模板的多份拷貝」需要同步）。

## 範圍

**動：**

- `code-review/SKILL.md` — 統一模板（改名 + 2 選用欄 + 排版規則）、加「模板所有權」註記
- `naming-conventions/SKILL.md` — 刪格式副本、降純規則、standalone 走 code-review
- `interface-impact-check/SKILL.md` — 刪格式骨架、保留規則內容
- `backend-code-review/SKILL.md` — 加一行「刻意獨立」宣告
- `review-workflow/references/{pr-review,local-branch,post-review-validation}.md` — `參考依據` 改名傳播

**不動：**

- backend 的 3 欄格式本身（刻意獨立，只加宣告，不對齊）

**單一邏輯單元**：把 finding 模板收斂成 code-review 單一擁有的統一 canonical，其餘 forward/規則/獨立。改名與排版屬「定義這份 canonical」的一部分，同一單元。

## Section 1：code-review = 唯一 canonical（統一模板）

### 規格

code-review Step 6 每條 finding 的欄位（severity 沿用現制：終端輸出放分組標題、forward 成 PR comment 時前綴 `[{severity}]`）：

```
[{severity}] [{category}] {issue description}
{file}:{line}
規則來源：{skill name}
修復參照：{skill name} → {section}
參考依據：{file}:{line} — {實際讀到的內容}
導致問題：{what this causes}
期望目標：{what the correct state should be}
建議修復：{tiered strategy}
待確認：{給作者的 runtime 問題}          ← 選用
合併順序：{ticket} 已涵蓋但尚未落地，單獨 merge 會開一個窗口   ← 選用
```

- 前 8 欄＝現況（`證據`→`參考依據` 改名見 Section 5）。
- 新增 `待確認`、`合併順序` 為**選用欄**：只在相關情境出現，一般 finding 不會有。
  - `待確認`：finding 含未解 runtime 成分時才寫。這是現有「runtime 主張 → 標『(推測，未驗證) 請作者確認』」規則的**結構化版本**（承接 runtime severity 天花板）。
  - `合併順序`：有已知 ticket 涵蓋、但 merge 時序造成風險時才寫。
- code-review 內部 CRITICAL/HIGH/MEDIUM/LOW 四段目前各複製一份區塊（×4）——**本次一併參數化併為一份**（severity 當變數），降低內部 drift，使「唯一 canonical」名副其實。（已定案納入本次。）

### author-facing 排版規則

finding 是給 PR 作者看的，模板規格需明列：

- 每欄自成一行，格式 `欄名：值`。
- 值過長 → **斷行**，續行**縮排對齊**到值的起點（不要一行拉很長）。
- 一條 finding 的各欄，縮排在標頭行之下。
- 核心欄與選用欄（`待確認`/`合併順序`）之間**空一行**。
- 可讀性優先於精簡。

渲染範例（納入規格作為 golden sample）：

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

### 模板所有權註記

code-review 加一段短註記，錨定 SSOT 意圖：

> 本 skill 是 finding 模板的**唯一擁有者**。consumer（pr-review、local-branch）一律 forward 本模板輸出、不自訂格式；`naming-conventions` 是純規則、由本 skill 代排；`interface-impact-check` 是規則/要求、其 findings 由本模板排版（會填 `待確認`/`合併順序` 選用欄）；`backend-code-review` 是刻意獨立的另一格式。**不得再新增本模板的副本。** 若改欄位**標籤**，需同步更新仍restate標籤的少數 forwarder 引用（見 Section 5 清單）。

## Section 2：naming-conventions → 純規則

### 規格

- 刪掉 `## Process (Standalone Mode)` step 3 的格式 block（`:23-32`）。
- standalone 模式改述：「本 skill 為規則 skill；要格式化的 naming review 經 `code-review`（或 `review-workflow`）執行、只載本規則」——與其 8 個同儕 rule skill（vue-best-practices、software-design-principles…）一致，它們本就無模板。
- 保留 Rules 1-7、Core Principle、Quick Reference 等**規則內容**。

### 為何

naming 的模板副本只在 standalone 用；被 code-review 載入時（最常見）由 code-review 排版、該 block 是死的。刪除只影響 standalone，而 standalone 改走 code-review 後既不留副本、也不指涉外部檔——正好守住「skill 別互指」。

## Section 3：interface-impact-check → 規則/要求

### 規格

- 刪掉 finding body 的格式骨架（`:190-202` 的 ``` block）。
- **保留所有規則內容**：7 步流程、Step 3 discriminator、Common Mistakes、各欄怎麼填的領域指引（如「`導致問題` 停在 statically provable step，不寫 UI 後果」）、HIGH severity 天花板、evidence-list 形狀說明。
- 其 findings 由 code-review 統一模板排版；它多出的 `合併順序`/`待確認` 已納入 Section 1 的選用欄，由它填。

### 為何

它被 code-review 觸發、merge 進 Step 6，格式擁有權本就該在 code-review（與 naming 同理）。它跟 naming 的唯一差異是多 2 欄——已在 Section 1 統一吸收，故它不必留任何格式骨架。領域指引是**規則**不是格式，留著。

## Section 4：backend-code-review → 刻意獨立

### 規格

在 Output Format 段加一行宣告：

> 本 3 欄格式（`{一句說明}` / `{file}:{line}` / `修復參照`）**刻意獨立**於 code-review finding 模板——backend 是不同語言的獨立引擎、從不經過 code-review，無法 forward。只與 code-review 共用穩定慣例（severity 分級名、`修復參照` 語意、verdict 表）。**不需、也不應**對齊 code-review 模板。

格式本身不動。

## Section 5：`證據` → `參考依據` 改名傳播

### 傳播清單（grounded，18 處）

改的是**欄位名/欄位參照**；`證據` 作為**普通名詞「evidence」**之處**不改**。

| 檔案 | 行 | 處理 |
|---|---|---|
| `code-review` | 279,289,299,310（模板 ×4） | 改（併為一份後 ×1） |
| `code-review` | 324,326,337（`#### 證據 Field` 散文） | 改（連同小節標題 `參考依據 Field`） |
| `code-review` | 437,438,439,440（Common Mistakes 引欄名） | 改 |
| `code-review` | **345**「無 runtime 證據」 | **不改**（普通名詞 evidence） |
| `interface-impact-check` | 170（散文引欄名） | 改 |
| `interface-impact-check` | 195（格式骨架內） | 隨 Section 3 刪除，不需單獨改 |
| `naming-conventions` | 28 | 隨 Section 2 刪除 |
| `pr-review.md` | 98（body layout） | 改 |
| `local-branch.md` | 154 | 改 |
| `post-review-validation.md` | 46（V4 例示） | 改 |

### 注意

逐處判斷欄名 vs 普通名詞；`code-review:345` 是唯一已知的普通名詞用法。改名時同步把 `#### 證據 Field` 小節標題與內文一致改為 `參考依據`。

## 改動清單

- **`code-review/SKILL.md`**：統一模板（Section 1）＝ `參考依據` 改名 + `待確認`/`合併順序` 選用欄 + 排版規則 + golden sample；模板所有權註記；**×4 區塊參數化併一份**；改名散文（Section 5）。
- **`naming-conventions/SKILL.md`**：刪 `:23-32` 格式 block、standalone 改述（Section 2）。
- **`interface-impact-check/SKILL.md`**：刪 `:190-202` 格式骨架、保留規則內容（Section 3）；`:170` 改名。
- **`backend-code-review/SKILL.md`**：加「刻意獨立」宣告（Section 4）。
- **`review-workflow/references/pr-review.md`**：`:98` 改名。
- **`review-workflow/references/local-branch.md`**：`:154` 改名。
- **`review-workflow/references/post-review-validation.md`**：`:46` 改名。

### 不動

- backend 3 欄格式本體、code-review 的 severity/verdict/runtime 規則語意（除改名外）。

## 風險與承擔

### 本設計擋不住什麼

- 擋不住 code-review 模板**本身**寫壞——它是唯一權威，權威錯下游全錯（SSOT 的固有性質，換來的是不漂移）。
- 殘留：`pr-review`/`local-branch`/`post-review-validation` 仍**restate 少數欄名**（forward 說明用）。它們不是完整副本，但欄名改動仍需碰到——已由 Section 1 所有權註記的「rename 提示」＋ Section 5 清單涵蓋。要完全消除需讓 forwarder 不 restate 任何欄名，屬更激進的後續，暫不做。

### backend 共用慣例的殘留

backend 與 code-review 共用 severity 分級名、`修復參照`、verdict 表。若這些慣例（非模板）日後要改，backend 需一起評估。已於 Section 4 宣告點出共用面。

## Backlog

- **forwarder 不 restate 欄名**（已定案留此）：pr-review/local-branch/post-review-validation 改為完全不列欄名（純「forward code-review 區塊」），讓改名連這幾處都不必碰。需權衡「自足清晰 vs 零 restate」。本次不做——先消副本，restate 說明留著較清楚。

## Testing & Rollout

### 回滾

`~/.claude` 非 git repo、無 CI。落地前把所有被動檔備份到各自 skill 下的 `.backup-2026-07-20/`；回滾即覆蓋。

### 驗證方式（manual，無 unit test）

1. **改名完整性**：`grep -rn "證據"` 於 7 個檔，剩餘命中應只有 `code-review:345`（普通名詞）；`grep -rn "參考依據"` 應覆蓋所有原欄位參照。
2. **naming standalone**：`use skill - naming-conventions` 跑一次，確認它不再自排、而是經 code-review 產出統一格式。
3. **interface 經 code-review**：觸發一個契約改動的 review，確認 interface 的 finding 由統一模板排版、含 `待確認`/`合併順序` 選用欄、且領域規則（導致問題停在 provable step）仍生效。
4. **排版**：檢查一則長值 finding，續行有縮排對齊、選用欄前有空行、無超長單行。
5. **forward 一致**：PR comment 的 body 與 code-review 終端輸出逐欄一致（含 `參考依據` 新欄名）。

## 開放問題

（皆已定案，無待決項）

- ~~code-review 內部 ×4 去重是否納入本次~~ → **已定**：納入本次（Section 1、改動清單）。
- ~~forwarder 是否改為完全不 restate 欄名~~ → **已定**：留 Backlog，本次不做。
