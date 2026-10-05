# PR 輸出格式 SSOT — pr-review 沿用 code-review finding 區塊

- 日期：2026-07-17
- 主體 skill：`review-workflow`（`references/pr-review.md`、`references/post-review-validation.md`）
- 相關：`code-review`（格式權威來源，不改）、`review-workflow/references/local-branch.md`（已對齊，不改）

## 背景

PR 上的 review comment **格式輸出不穩定**（一下帶完整欄位、一下塌成一行），內容對錯不是問題，飄的是格式。

### 診斷：格式不穩的機制

穩定格式的必要條件是「comment body 只能有一份權威格式規格」。目前 PR 這條路徑違反這點——同時有兩個**豐儉不一**的指令都在描述 comment body，而且誰都不是權威：

| 來源 | 對 comment body 說了什麼 | 豐儉 |
|---|---|---|
| `code-review` Step 6 的 finding 輸出區塊 | 每條 finding 一個自足區塊，含 `規則來源／修復參照／證據／導致問題／期望目標／建議修復` 等欄位 | 很豐富 |
| `pr-review.md:90`（Step 5 唯一的 body 規格） | `Body in zh-TW with severity tag` | 一行，幾乎沒說 |

`code-review` 那份模板其實是**終端報告格式**（local 的 `━━━ Code Review ━━━` 區塊用的），從未有人定義過「finding → PR comment body」該長怎樣。指令留白，格式就由模型每回合臨場補：某回合抓完整區塊 → 穩；某回合照 `:90` 字面辦 → 塌成一行。同一組 findings 兩樣格式，這就是不穩的根因。

第二層：`post-review-validation.md` V4（`:45`）寫「Body does NOT contain file paths or line numbers」，與 07-15 新增的強制欄 `證據：{file}:{line}` 直接互斥。V4 觸發那回合會把 file:line 洗掉、沒觸發就留著——事後又疊一層不確定。

### 不對稱：為何偏偏 PR 不穩

同一個 `code-review` 引擎餵兩條路，但 07-15 改版**只補了 local、沒補 PR**：

- `local-branch.md:154`：`Present the finding (證據、導致問題、期望目標)` ← 有對齊到新欄位
- `pr-review.md:90`：`Body in zh-TW with severity tag` ← 停在 05-15，沒動

local 端至少給了欄位清單，PR 端沒有，所以 PR 的格式才會飄。

## 目標

1. PR comment body 的格式改由 **`code-review` finding 區塊當唯一權威**，`pr-review` 只搬運、不再自訂格式（SSOT-by-deferral）。
2. 收掉 `post-review-validation` V4 與 `證據：{file}:{line}` 欄的衝突。
3. PR 與 local 兩條路徑對同一份 finding 產出**一致**的格式。

## 範圍

**動（皆在 review-workflow 內，2 檔）：**

- `review-workflow/references/pr-review.md` — Step 5 comment body 規格
- `review-workflow/references/post-review-validation.md` — V4 一句、V1 一處壞路徑

**不動：**

- `code-review/SKILL.md` — 它是格式權威來源，本次不改其模板，只被引用
- `review-workflow/references/local-branch.md` — 07-15 已對齊
- `github-pr/references/line-comment.md` — 它是 github-pr 的「選 line」canonical，本質是行號對齊，非 body 格式；review 路徑對 body 的權威是 V4（見 Section 2），此檔不因本問題被改寫（見 Section 3）
- `naming-conventions`、`interface-impact-check`、`backend-code-review` — finding 模板本體的跨 skill SSOT 是另一個題目（見 Backlog），不在本次

**單一邏輯單元**：把 PR 路徑的 comment body 格式對齊到 code-review finding 格式。V1 壞路徑屬同檔低成本附帶 bugfix，隨手收。

## Section 1：comment body 沿用 code-review finding 區塊

### 規格

`pr-review.md` Step 5 對每則 comment 的 body，改為「原樣採用 `code-review` 該條 finding 的區塊」，精確對應如下：

**進 comment body（原樣，前綴 severity tag）：**

```
[{severity}] [{category}] {issue description}
規則來源：{skill name}
修復參照：{skill name} → {section}
證據：{file}:{line} — {實際讀到的內容}
導致問題：{what this causes}
期望目標：{what the correct state should be}
建議修復：{tiered strategy}
```

**進 tool 參數（不進 body）：**

- finding 自身的錨點 `{file}:{line}` → `add_comment_to_pending_review` 的 `path` / `line` / `side`

**不進 body（報告外殼）：**

- `檢查檔案數 / 候選規則 / 實際套用 / Interface impact / 摘要 / 結論`
- `CRITICAL／HIGH／MEDIUM／LOW` 分組標題（severity 改以 body 前綴的 `[{severity}]` tag 表達，逐則呈現）

規格明文加一句約束：**不得重排欄位、不得刪欄、不得改寫欄位標籤**。有欄位空缺時保留欄名並照 code-review 的降級寫法（如 `修復參照：N/A`）。

### 為何是 deferral 而非再定義一份

若在 `pr-review` 另寫一份完整格式，等於製造**第 N+1 份**模板複本，未來 code-review 改欄它又漂走——正是現在痛點的來源。改成「指向 code-review 的輸出」後，PR body 的格式權威只剩一處，code-review 改欄，PR 自動跟上，零額外維護。

此舉不新增跨 skill 耦合：`pr-review` Step 3 本來就「delegate analysis entirely to code-review」，它早已依賴 code-review 的輸出；本 Section 只是把「輸出契約」講明（原樣搬、不重寫），不是新增依賴。

### 報告外殼不進 body 的理由

報告外殼是**整份 review 的層級**資訊（統計、候選規則、verdict），不屬於任何單一行的 comment。強行塞進每則 body 會重複污染。統計/verdict 已由 Step 6 的通知訊息承載，body 只放單則 finding。

## Section 2：收掉 V4 的 file:line 禁令（縮小，非刪除）

### 規格

`post-review-validation.md` V4（`:45`）現況：

```
- Body does NOT contain file paths or line numbers (these belong in tool parameters)
```

改為區分「錨點」與「證據指標」：

```
- Body 不重複 finding 自身的錨點 file:line（那放 tool 參數 path/line/side）
- 但 `證據：{file}:{line}` 的跨檔指標保留在 body（它是問題成立的依據，常指向另一個檔）
```

V4 其餘子項（繁中、技術詞與 code 保留英文、一則不得包多個問題）**原封不動保留**。

### 為何是縮小而非整條刪

V4 的原意「錨點 file:line 該放 tool 參數、不放 body」其實**是對的**——那份行號 GitHub 會用 line-level annotation 顯示，body 再寫一次確實冗餘。它錯在把這條**擴大成對所有 file:line 的禁令**，連 `證據` 那個常在別檔、無法用 annotation 表達的跨檔指標一起誤殺。縮小 V4 同時保住它的正當意圖，又解開 `證據` 欄——比整條刪乾淨。

### 為何不動 `line-comment.md` 的同名規則

`github-pr/references/line-comment.md:30-54`（Rule: Line Annotation via Tool Parameters）是 V4 這條規則的 canonical 源頭，V4 是它的複本。但**本設計不改 line-comment.md**，理由：

1. **review 路徑對 body 的權威是 V4，不是 line-comment.md**。`pr-review.md` Step 5 貼 comment 走 GitHub MCP 工具**直接呼叫**，不經 github-pr skill、不載入 line-comment.md；review 路徑對 body 格式的明文檢查點就是 V4。line-comment.md 只在 V1 為取行號演算法時**間接曝光**。
2. **line-comment.md 本質是「選 line」**（檔名 `Line-Level Comment Rules`，主體是 `:56-97` 行號演算法 + `:99-110` 行內容對齊），不該為一個 body-format 問題被改寫。
3. 為避免 V1 打開它取演算法時，順帶把 `:30-54` 的絕對「NEVER」拖進 body 判斷，Section 3 明文**限定 V1 只引用其行號演算法那一節**。

殘留（已知、刻意排除）：若未來 review 改走 github-pr skill 貼 comment，或 github-pr 自身要支援 `證據`-style 跨檔指標，才需要在 canonical（line-comment.md:30-54）加同款例外。目前 review 走 MCP 直呼 + V4 權威，不受影響。詳見 Backlog。

## Section 3：（附帶）修 V1 壞路徑

**更正先前判斷**：`line-comment.md` 並非不存在——它在 `github-pr/references/line-comment.md`，是一份被 3 個 github-pr 檔（`pending-review.md`、`pr-comments.md`）共用的 canonical。問題是 V1（`post-review-validation.md:15`）用**裸檔名** `line-comment.md`，在 `review-workflow/references/` 這個目錄下解析不到（真正的檔在 github-pr 那邊）→ 引用實質失效，V1 的「刪掉重建」時機因此不確定。

**做法：改引用（repoint），並限定範圍**：

1. 把 V1 的裸檔名改成指向實際位置 `github-pr/references/line-comment.md`（相對路徑 `../../github-pr/references/line-comment.md`，或描述式引用皆可）。
2. **明文限定「只取其行號演算法那一節」**（`Rule: Line Number Must Be Within Diff Hunk`, `:56-97`），使 V1 只拿它「選 line」的部分，不把 `:30-54` 的 body 定位規則一起拖進 body 判斷。

**為何 repoint 而非內嵌**：line-comment.md 是已在維護、被 3 檔共用的 ~40 行 canonical；內嵌等於複製一份、立刻埋 drift（正是本專案在打的 SSOT 問題翻版）。且 V1 本來就是引用式，這只是**修好一個既有壞引用**，不是新增依賴——review 的 PR 路徑本來就建在 github-pr 上。

此項不影響格式，只影響行號準度，屬同檔低成本附帶 bugfix。

## 改動清單

### `review-workflow/references/pr-review.md`

- Step 5（`:84-92`）：`- Body in zh-TW with severity tag` → 依 Section 1 展開為「原樣採用 code-review finding 區塊 + severity tag 前綴 + 錨點進參數 + 報告外殼不進 body + 不得重排/刪欄」的規格。

### `review-workflow/references/post-review-validation.md`

- V4（`:45`）：依 Section 2 縮小 file:line 禁令。
- V1（`:15`）：依 Section 3 把裸檔名 `line-comment.md` 改引用到 `github-pr/references/line-comment.md`，並限定「只取行號演算法那一節」。

### 不動

- `code-review/SKILL.md`（格式權威，只被引用）
- `review-workflow/references/local-branch.md`（已對齊）
- `github-pr/references/line-comment.md`（「選 line」canonical；review 路徑 body 權威在 V4，此檔不因本問題改寫，見 Section 2/3）
- `naming-conventions` / `interface-impact-check` / `backend-code-review`（finding 模板 SSOT 屬 Backlog）

## 風險與承擔

### Trade-off：PR body 會變完整（刻意翻轉舊意圖）

舊設計刻意讓 PR body 精簡（V4 那條就是這意圖的產物）。本設計把 PR body 拉到與 local 一致的完整度——換來一致性與零漂移，代價是 comment 較長。此為刻意取捨，已與使用者確認以一致性為先。頂端不再重複錨點行號（進參數），冗餘已最小化。

### 本設計擋不住什麼

- 擋不住 `code-review` 模板**本身**寫壞——它是權威，權威錯下游全錯。這是 SSOT 的固有性質（換來的是不漂移）。
- 擋不住 finding 模板在 `naming-conventions / interface-impact-check / backend-code-review` 之間的跨 skill 漂移——那是另一個題目（Backlog）。本設計只解「PR 交付端 vs code-review」這一段。

## Backlog

- **Finding 模板跨 skill SSOT**：模板現散佈於 `code-review`（Step 6，且 CRITICAL/HIGH/MEDIUM/LOW 內部又複製 ×4）、`naming-conventions`、`interface-impact-check`、`backend-code-review`。本設計讓「PR 交付端」對齊 code-review，但這四份彼此的 SSOT 仍未解。後續處理方向（產生器 vs manifest 驅動）另案討論。
- **code-review Step 6 內部 ×4 去重**：CRITICAL/HIGH/MEDIUM/LOW 四份 finding 區塊除 severity 標籤外完全相同，可參數化併為一份。
- **V3 severity 對齊**：V3 的 severity 對照表未收 07-15 的「runtime 主張 severity 天花板 LOW」HARD RULE，屬 severity 對齊，非本次格式範圍。
- **line-comment.md body 規則的例外（殘留）**：`github-pr/references/line-comment.md:30-54` 仍是絕對「NEVER file:line in body」，而 V4 是它的複本。本設計只在 V4（review 路徑權威）加 `證據` 例外，未動 canonical。若未來 review 改走 github-pr skill 貼 comment，或 github-pr 自身要支援 `證據`-style 跨檔指標，需在 canonical 加同款例外，並讓 V4 deferral 以消除這份複本。目前走 MCP 直呼 + V4 權威，不受影響。

## Testing & Rollout

### 回滾

`~/.claude` 非 git repo、無 CI。落地前把 `pr-review.md`、`post-review-validation.md` 備份到 `~/.claude/skills/review-workflow/.backup-2026-07-17/`；回滾即覆蓋回去。

### 驗證方式（manual，無 unit test）

1. 對同一個 PR 連跑兩次 review，比對兩次 pending comment 的**格式**是否一致（欄位、順序、severity tag 位置）——不穩問題應消失。
2. 檢查某則含 `證據：{file}:{line}`（且 evidence 檔 ≠ 錨點檔）的 comment：body 應保留該指標，且未被 V4 洗掉。
3. 檢查 comment 的 GitHub 行號 annotation（path/line/side）正確落在錨點位置，body 未重複錨點行號。
4. 抽一則 finding 對照 code-review 終端輸出，確認 body 欄位與其**逐欄一致**（deferral 成立）。

## 開放問題

（皆已定案，無待決項）

- ~~落地順序~~ → **已定**：獨立收掉本案（PR 格式不穩），Backlog 的「finding 模板跨 skill SSOT」另案。
- ~~V1 修法：內嵌 vs 改引用~~ → **已定**：改引用（repoint）到 `github-pr/references/line-comment.md` 並限定演算法節（見 Section 3）。
