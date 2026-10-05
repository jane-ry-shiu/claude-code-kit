# Finding 證據欄 Design

**Date:** 2026-07-15
**Scope:** `~/.claude/skills/code-review/`、`~/.claude/skills/review-workflow/`、`~/.claude/skills/naming-conventions/`
**Author:** brainstorming session
**Supersedes:** `2026-06-04-code-review-token-optimization-design.md` 的 Section 2（Mode Decision）與 Section 4（Finding Template Tiering）

---

## 背景

2026-07-15 對 PR #8380（ADAT-562）跑了一次 review，產出 8 條 pending comment。事後重新查證，**3 條需要修正**：

| # | 原本寫的 | 實際上 |
|---|---|---|
| #8 | 「emit 改名的話 listener 也要跟著改」 | 錯。`@vue/runtime-core` 的 `camelize` 讓 `@extraOptionToggle` 自動對上 kebab emit。我憑印象斷言，沒讀 source |
| #1 | 「搜尋結果確實被過濾了」 | 過度延伸。手上證據只到「param 有送出」，backend 行為從未查證 |
| #3 | MEDIUM「Tippy wrapper 會破壞 toolbar layout」 | False positive。實際量測後 layout 完好，降為 LOW |

### 診斷：這是同一個 bug

三條的推理過程都沒問題。錯的是**主張的強度超過了證據的強度**：

- #8：確定語氣 vs 記憶
- #1：因果結論 vs 單點觀察
- #3：MEDIUM vs 靜態推論

全部都是校準錯誤，不是推理錯誤。

### 結構性破口

`code-review` 現行 heavy 模板有 `規則來源`、`修復參照`、`問題原因`、`期望目標`、`建議修復`。**沒有任何一欄在問「你怎麼知道這是真的」。**

- `規則來源` 回答「為什麼 X 是壞的」，不是「X 有沒有在發生」
- `{file}:{line}` 指的是**問題被認為在哪**，不是**問題存在的證據**。#3 的 file:line 是 `FilterChipShell.vue:2`，那行只是 `<Tippy>` 本身，證明不了 layout 會壞
- `問題原因：{why this is a problem}` 要的是**機制敘述** —— 而「聽起來合理的機制」正是這類錯誤的載體。#3 照填會寫成「wrapper span 變成 direct child，破壞 `> *` 選擇器」，每個字都對、結論錯，且填完之後看起來**更有說服力**。這一欄實際上在獎勵未經驗證的推論

### 為何不是靠事後 verify 解決

同一場 session 也試過「review 完再 verify 一輪」。結論是 verify 對 #8、#1 有效（主張超出證據、該查沒查是自我檢查抓得到的），但對 #3 **結構性盲目** —— verify 是拿同一個推理引擎跑同樣的輸入，而 #3 的推論是自洽的，自洽正是它的通過條件。再讀一次只會再確認一次。

Browser 驗證確實能翻掉 #3，但實測 ROI 是 1/8（8 條裡只有 3 條與 runtime 相關、只翻動 1 條），且需要 dev server、登入、dark-release flag、可控測試資料。本設計改採**零 runtime 成本**的路徑：#3 的病不是「結論錯」，是「證據等級配不上 severity」，靠 severity 天花板就能處理到位。

---

## 目標

- finding 的主張強度不得超過證據強度
- 成本上限 O(1)：**降級永遠是合法出口**，不存在「你必須去讀」的情況
- 不引入新的 review 步驟 —— 這是**欄位**，不是 phase

---

## 範圍

**包含：**

- **A. 新增 `證據` 欄** — 強制 file:line 指標
- **B. `問題原因` → `導致問題`** — 從「為什麼這是問題」改為「這會造成什麼」
- **C. runtime 天花板硬規則** — runtime 主張無 runtime 證據不得超過 LOW
- **D. 拔除 light mode** — 回退 06-04 spec 的 B + E

**不包含（Backlog）：**

- `backend-code-review` 的模板設計 —— 它是三欄制（`{一句說明}` / `{file}:{line}` / `修復參照`）、無 mode 機制，等於永久 light mode。結構不同，不是機械套用而是從無到有設計，屬於另一個邏輯單元。且 Go 的 runtime 議題（concurrency、timing、實際 API 行為）是否適用同一套天花板規則，需要先想清楚
- **模板去重** —— 模板目前散佈 4 份無 single source of truth。依 change-scoping Gate 1，behavior change 與 refactor 必須拆開
- browser / runtime 驗證階段

---

## Section 1：`證據` 欄

### 規格

```
證據：{file}:{line} — {實際讀到的內容}
```

**強制 file:line 指標，不接受敘述。**

| | 範例 | 為何 |
|---|---|---|
| ❌ | 「我查過 vue-tippy 的行為」 | 敘述，憑記憶也寫得出來 |
| ✅ | `vue-tippy.mjs:4253 — tag: { default: 'span' }` | 指標，要嘛存在要嘛不存在 |

這是整個機制的關鍵：**指標無法用記憶偽造。**

### 成本

review Step 5 本來就強制「Read full file」+「Read diff hunks」，指標早在 context 裡。這一欄要求的是**把已經看過的東西寫下來**，不是多看。

PR #8380 回推：8 條裡 **7 條零額外 Read**（指標已在手上），只有 #8 需要 1 次 targeted Read（而它換到一條錯誤 comment 不被送出）。

### 成本上限：降級是合法出口

規則**不是**「讀到能證明為止」，而是「**要嘛引用，要嘛降級並說明**」。永遠不存在「你必須去讀」的情況。

沒有這條出口，規則會退化成「讀到全部可證明為止」，成本無上限、且會誘發防禦性閱讀（對已經確定的事也跑去讀 source，免得欄位開天窗）。這條出口把成本鎖在 O(1)。

---

## Section 2：`問題原因` → `導致問題`

### 規格

```
導致問題：{this causes what}
```

| 舊 | 新 |
|---|---|
| `問題原因：{why this is a problem}` | `導致問題：{what this causes}` |
| 要求**機制敘述** → 讀起來像已確立的事實 | 要求**後果** → 誠實標示為下游推論 |
| 陳述句，不宣告自己是預測 | 預測，且自承是預測 |

#3 對照：

- 舊：「wrapper span 變成 direct child，破壞 `> *` 選擇器」← 像事實
- 新：「（推測，未經 runtime 驗證）分隔線可能錯位、換行行為可能改變」← 像預測

同一個錯誤主張，一個偽裝成事實，一個誠實。

### 為何是 rename 而非刪除

`{why this is a problem}` 的**功能**（告訴作者為什麼該在意）是正當的，有病的只是它的**問法**。刪掉會連功能一起丟。

更關鍵：**刪掉它會拆掉本設計的機制。** 破綻不在「證據欄空白」—— #3 的證據欄填得出東西（`vue-tippy.mjs:4253` 證明 wrapper span 確實存在，那是真證據）。填不出來的是 **consequence 那一段**。破綻在於**證據欄講 wrapper 存在、導致問題欄講 layout 壞掉，中間那一跳沒有支撐，而兩者上下相鄰**。

沒有 consequence 欄，就沒有東西能跟證據對照，那一跳會從「看得見」變成「不存在」。

### 附帶效果：協助 severity 定級

沒有 consequence 的 finding 本來就該是 LOW。PR #8380 的 #6（unused `filterId`）填進去會變成「無實際影響，純可讀性」—— 而它確實是 LOW。欄位與嚴重度自動對齊。

---

## Section 3：欄位順序

```
{severity}（...）[in-scope]：
  N. [{category}] {issue description}
     {file}:{line}
     規則來源：{skill name}
     修復參照：{skill name} → {section}
     證據：{file}:{line} — {實際讀到的內容}      ← 新增
     導致問題：{what this causes}                 ← 由 問題原因 rename
     期望目標：{what the correct state should be}
     建議修復：{tiered strategy}
```

`證據` 緊鄰 `導致問題` 之前。**headline 維持第一欄。**

### 為何不把 證據 提到最前面

`{issue description}` 排第一意味著先寫結論再寫證據，表面上違反 critical-thinking 規則（goal → 必要條件 → 過濾 → 結論）。**這裡可以不管**，理由是 #1 的教訓：結論先寫、指標也真的存在（`buildSearchParams` 那行是真的）、但指標撐不住結論。**順序防不了它，相鄰性才防得了。** 而 headline 第一欄對人類掃多條 finding 較友善。

---

## Section 4：runtime 天花板（硬規則）

> **HARD RULE：** 主張的對象若為 runtime 屬性，在無 runtime 證據的情況下，**severity 一律不得超過 LOW，無例外**。

### 判準

**「這個主張的真假，能不能只靠讀 code 確立？」**

不能 → runtime 主張。若其真假取決於**執行**（渲染結果、網路回應、時序、環境、使用者互動），讀再多 code 都只是推論。

常見案例（**舉例，非窮舉**）：rendered layout、實際 API 回應內容、時序 / race、瀏覽器或裝置行為、第三方服務回應。

### 混合主張

一條 finding 可能同時含靜態與 runtime 成分。#3 即是：「wrapper span 存在」（靜態，可引用 `vue-tippy.mjs:4253`，確立）+「layout 因此壞掉」（runtime，推論）。

**天花板取決於 finding 實際主張的那一個。** #3 主張的是 layout 壞掉 —— 靜態成分再確鑿也不能拉高它。判斷方式：把 `導致問題` 欄的內容拿去套上面的判準。

### 為何是硬規則而非指引

`#3` 當時的推論**感覺很強，所以才給了 MEDIUM**。「感覺夠強所以破例」正是產生那個錯誤的那條路徑。留逃生門等於留病灶。而且執行成本為零 —— 降級不花任何 token。

### False negative 的處理

被壓到 LOW 的 finding **不會消失**，它照樣以 pending comment 送到作者眼前，且會明白寫著「（推測，未經 runtime 驗證）」+「請你確認」。而**作者是驗證成本最低的人**（branch 在他手上、dev server 開著、他知道該長什麼樣）。降級是**移交**，不是遺漏。

真正該擔心的方向相反：**severity 是共用貨幣。** 在不可驗證的主張上灌水會讓所有 MEDIUM 一起貶值，連帶讓真的該修的 finding 被打折看待。硬規則保護的是整份 review 的可信度。

---

## Section 5：拔除 light mode

### 為何拔除

不是「精確度優先所以犧牲 token」。是 **light mode 沒通過它自己訂的驗收條件**。

06-04 spec line 26 的目標第一條：「在**不犧牲 review 品質**的前提下，將 token 用量降低 50% 以上」。其安全性論證（同 spec line 231）是：「在 light 場景（小 PR、安全變更）這四欄通常是同義反覆」。

**本次發現推翻該前提：false positive 不管 PR 大小。** 小 PR 一樣會產生「推論自洽但結論錯」的 finding，而 light mode 沒有 `證據` 欄能擋。

### 因果澄清（重要）

**#3 是在 heavy mode 下產生的。** PR #8380 觸及多個 package、改到 composable，依 06-04 spec line 96-103 的 signal 判定為 heavy，而六欄俱全仍寫錯。

所以：**拔掉 light mode 並沒有修好 #3，修好 #3 的是 `證據` 欄 + runtime 天花板。** 拔除 light mode 的作用是讓修正**沒有例外適用** —— 否則修正住在 light mode 沒有的欄位裡，等於留後門。

### 主要 token 節省不受影響

06-04 spec 的預估表（line 53-58）：

| 改動 | 預期影響 | 本次是否動到 |
|---|---|---|
| A. Lazy skill loading | **-40~60%** | **否** —— 兩個 mode 都是 two-stage lazy（同 spec line 114），與 mode 無關 |
| B. 模式判斷 | light 顯著降；heavy ±0 | 移除 |
| E. Finding 模板分層 | finding 字數 -50~70% | 移除 |
| Lint/test 移除 | 移除整段執行成本 | 否 |

真正的大頭 A 原封不動保留。

### mode 決策自身的成本

Step 3b 有十餘條判斷條件，**每次 review 都要讀進來、拿 changeset 逐條比對、寫一行理由**。為了省下第二階的 token，先付一筆固定判斷成本 —— 且那個判斷會出錯：判錯一次，本該嚴格看的 PR 就得到一份系統性偏弱的 review。

---

## Section 6：改動清單

### `~/.claude/skills/code-review/SKILL.md`

| 行 | 動作 |
|---|---|
| 87, 94, 102 | 刪除 Step 3b 模式判斷啟發式 + user override |
| 106-118 | 刪除 light/heavy 行為差異表 |
| 120-130 | Step 3c page detection 只留 heavy 路徑（一律讀 router config） |
| 264 | 刪除輸出 header 的 `Mode：{light｜heavy}` |
| 269 | 刪除 `─── Heavy mode（6 fields per finding） ───` 分隔標記 |
| 276, 285, 294, 304 | **每個 severity 各一份模板**：`問題原因` → `導致問題`，並在其前新增 `證據` 欄 |
| 308-345 | 刪除 light mode 模板與範例 |
| 347, 349 | 刪除兩段「為何 light mode 保留/刪除 XXX」說明 |
| 357, 359 | `建議修復` Tiered Strategy 移除「heavy mode 限定」限定語 |
| 367 | 分層表內文「寫清楚問題原因與期望目標即可」→ 改為 `導致問題` |
| 434 | 刪除 Common Mistakes 的「Using wrong field count for the resolved mode」 |
| Step 6 | 新增 runtime 天花板硬規則段落 |
| Common Mistakes | 新增：「證據欄填敘述而非 file:line 指標」、「runtime 主張未經降級即給 MEDIUM 以上」 |

### `~/.claude/skills/review-workflow/references/local-branch.md`

| 行 | 動作 |
|---|---|
| 154 | `Present the finding (問題原因、期望目標)` → `(證據、導致問題、期望目標)` |

### `~/.claude/skills/naming-conventions/SKILL.md`

| 行 | 動作 |
|---|---|
| 25-29 | 內嵌模板同步：`問題原因` → `導致問題`，新增 `證據` 欄 |

### 不動

- `code-review/references/checklist.md`、`references/batch-strategy.md`
- `fix-planning/SKILL.md` —— 靠 `修復參照` 路由，該欄全走 heavy 後恆存在（已 grep 驗證）
- `backend-code-review/SKILL.md` —— 見 Backlog
- `review-workflow/references/pr-review.md` —— grep 確認未內嵌模板、未讀 mode

---

## 風險與承擔

| 風險 | 影響 | 承擔 |
|---|---|---|
| 小 PR 的 output token 回升 | 06-04 spec line 16 稱「小 PR 可寫出 10+ 筆 finding」。10 筆 × 由 3 欄回到 8 欄，粗估 +1~1.5k output token | 接受。主要節省（A. lazy loading，-40~60%）不受影響，這是第二階的量 |
| runtime 硬規則造成 false negative | 真的該 MEDIUM 的 runtime 問題被壓到 LOW，作者可能忽略 | 接受（使用者明示）。finding 未消失、已移交給驗證成本最低的人；且 severity 灌水的傳染性傷害更大 |
| 手動同步 3 份模板複本 | 本次改動強化了既有的重複 | 已知。去重列為 Backlog，依 Gate 1 不與本次綁定 |
| `證據` 欄誘發防禦性閱讀 | 對已確定的事也去讀 source | 由「降級是合法出口」擋住 —— 永遠可以選擇不讀 |

### 本設計擋不住什麼

`證據` 欄把問題從**判斷題**（「我確定嗎？」—— 不確定的人不會覺得自己不確定）換成**事實題**（「哪個檔案第幾行？」—— 沒讀過就填不出來）。事實題防呆，判斷題不防。

但它**只擋得住「沒讀」，擋不住「讀錯了」**。這仍是自評。

---

## Backlog

| 項目 | 理由 | 前置 |
|---|---|---|
| `backend-code-review` 模板設計 | 三欄制、無 mode，防護最弱；但結構不同，需從無到有設計。且 Go 的 runtime 議題（concurrency / timing / 實際 API 行為）是否適用同一套天花板，需先釐清 | 本 change |
| Finding 模板去重（single source of truth） | 模板現散佈 4 份（code-review ×4 severity、local-branch、naming-conventions、backend-code-review），改一份其他漂走 | 依 Gate 1 為獨立 refactor change |
| 06-04 spec 的 C / D / F / G | 見該文件 Backlog | — |

---

## Testing & Rollout

### 回滾

`~/.claude` 不是 git repo。沿用 06-04 spec 的慣例：改動前備份到 `~/.claude/skills/.backup-2026-07-15/`，需回滾時覆寫回去。

### 驗證方式（manual，無 unit test）

**以 PR #8380 的 8 條 finding 作為 regression fixture** —— 這是本設計的來源案例，三個修正各對應一條驗收：

1. **#8（emit 命名）** → `證據` 欄填不出 Vue emit 解析的 file:line，應強制去讀 source（1 次 Read），錯誤不應產生
2. **#1（includeUnassociated）** → `證據` 只到 `buildSearchParams` 那行，`導致問題` 不得出現「搜尋結果被過濾」，主張應退回至證據能撐住的位置
3. **#3（Tippy layout）** → 「分隔線是否錯位」屬 runtime 屬性、無靜態指標，severity 必須為 LOW，且 `導致問題` 須標示「推測，未經 runtime 驗證」
4. **#6（unused `filterId`）** → `導致問題` 應為「無實際影響，純可讀性」，維持 LOW（驗證欄位與 severity 的自動對齊）

另需驗證：

5. 跑一個原本會判 light 的小 PR，確認一律走完整模板、輸出無 `Mode：` 行
6. 跑一次「無 finding」場景，確認 verdict / early exit 不變
7. 確認 `fix-planning` 仍能靠 `修復參照` 正確路由

---

## 開放問題

無。所有設計決策已在 brainstorming 過程確認。

---

**Implemented:** 2026-07-15。備份於 `~/.claude/skills/.backup-2026-07-15/`（`~/.claude` 非 git repo，此為唯一回滾手段）。

### Regression replay 結果（由無關 context 的 subagent 執行）

| Draft | 規則是否改變結果 | 做工的是哪條規則 |
|---|---|---|
| A（emit 命名） | **是** | `證據` 欄。「codebase kebab-case 慣例」給不出指標，反而找到反證（`FilterMenuRow.vue:135/137`、`MultiSelectTreeChipNode.vue:79` 皆為 camelCase）→ library 本來就混用。主張須收窄為「同一 emit array 內局部不一致」 |
| B（isFilterActive） | **是，但不是天花板做的** | `證據` 欄。強制指標逼使 replay 去讀 `hasAnyValue` 實作，順帶讀到 extraBeforeListOptions 掛載位置 |
| C（Tippy layout） | 是，但**此條不構成有效驗證** | 天花板。**然而本文件的示範案例逐字就是此 case** —— replay 等於照答案對。規則有效，但 C 不能作為證據 |
| D（unused param） | 否（對照組，本來就合規） | — |

### 兩項超出預期的發現

1. **Draft B 的 HIGH 是灌水的。** 原主張「使用者無法把它打開回來」**為假** —— 該 checkbox 就在 associatedSite chip 的 popover 內，`NotificationFilterCombo.vue:149-153` 的 `onExtraOptionToggle` 是 toggle（`!includeUnassociated`），可原地切回。Reset 按鈕不出現是真的，但「使用者被困住」不是。應為 MEDIUM。
   **此錯誤同時逃過了原始 review 與後續的 browser 驗證輪** —— browser 證明了 Reset 不出現，卻沒人去問「那使用者還有別的路嗎」。這是 `證據` 欄相對於 runtime 驗證的獨立價值。

2. **示範案例的自我指涉問題。** Section 4 的 Tippy 範例使規則對其來源案例失去驗證力。作為教學範例是正當的（混合主張概念確實需要示範），但未來若要再驗證此規則，須改用範例未涵蓋的 runtime 主張。
