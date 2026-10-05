# Spec Tasks

Provide field values to `jira` skill for creating a parent task + sub-tasks from an openspec change that has `tasks.md`, with dependency marking.

## Additional Input

| Parameter | Required | Description |
|-----------|----------|-------------|
| Parent issue key | ❌ | If provided → only create sub-tasks. If not → create parent first |

## Flow

### Step 1: Read openspec context

Read files in priority order:

1. `tasks.md` (required — fail if missing)
2. `proposal.md`
3. `specs/**/*.md`
4. `design.md` (if exists)

### Step 2: Create parent task (if no parent key)

Provide field values to `jira` skill's [description-format](../../jira/references/description-format.md):

| Field | Source |
|-------|--------|
| references | High-Level Spec: change path (required); Low-Level Spec: if exists |
| scope | One-sentence change objective + `OpenSpec Change: \`{path}\`` |
| task_list | `T{n} {section-title}` corresponding to tasks.md sections |
| scope_boundary_in | proposal.md scope (frontend/backend/fullstack) |
| scope_boundary_out | proposal.md Impact + tasks.md Out of Scope |
| done_criteria | proposal.md expected outcomes + specs/ high-level scenarios (behavioral, not restating task_list) |
| review_guideline | Fixed: "Review targets in-scope implementation only. Each sub-task has its own specific verification points. 驗證 Done Criteria 中每個條件都被子任務完整涵蓋。" |

Delegate to `jira` skill's full create-ticket flow.

### Step 3: Estimate each section's size

A **section** is the deepest heading that carries its own checklist items, whatever its heading
level. A heading whose items all live under sub-headings is a container, not a section - its
children are the sections. A heading carrying items of its own AND having sub-headings with items
is a section for its own items, and each sub-heading is a section too.

A section whose items are openspec housekeeping - running `openspec archive`, ticking the change's
own checkboxes, self-review checklists - produces no ticket at all.

For every section, estimate two numbers, **production code only**. Test files, story files, and
spec/doc files are tallied separately and do NOT count toward the thresholds: test volume routinely
runs 5-10x the production diff, and counting it makes every section look large.

Both numbers describe **the size of the change, not the size of the files it touches**. A section
adding 20 lines to a 400-line component counts as 20.

**Lines means added lines.** Deleted lines do not count toward the threshold - removing code costs
far less to review than adding it. A section that is `+279 -568` counts as 279.

**Files** - when a checklist item or the spec it points at names a file, symbol, or component,
locate it in the repo to confirm the file exists and to count how many files the section touches.
Estimate only what you cannot locate.

**Lines** - when the change is already implemented, read the diff of the commits that delivered it
(`git log --diff-filter=A -- <path>`, then `git show --numstat`) and use those numbers: a real diff
beats an estimate. Otherwise classify each checklist item by shape and sum:

| Item shape | Rough production lines |
|---|---|
| Add or edit a constant, enum member, or map entry | 5 |
| Add a prop / emit / exposed value to an existing component | 10 |
| Change the logic of an existing function, computed, or handler | 25 |
| New composable, util, or small single-purpose component | 80 |
| New page, dialogue, or multi-part component | 200 |

Band each section:

| Band | Condition | Consequence in Step 4 |
|---|---|---|
| **Small** | <=3 prod files AND <=50 prod lines | Merge candidate |
| **Standard** | <=10 prod files AND <=300 prod lines | Its own ticket |
| **Large** | >10 prod files OR >300 prod lines | Its own ticket; never merged, never split further |

A section that produces no production code at all (documentation only) has no band. It merges by
rule 3 if it has a partner there, and is its own ticket if it does not.

### Step 4: Group sections into tickets

A ticket covers a GROUP of sections, not a section. Build the groups by applying these in order:

1. **A cross-cutting section never stands alone.** A section whose items only add tests, only run
   verification commands, or only declare constants that another section consumes is folded into
   the section it serves. Serving more than one section, it splits along them.
2. **Sections that move files between packages form one group.** The relocation, the import repair
   it forces, and the export wiring that follows are one ticket, however many sections and packages
   that spans - splitting them leaves the repo with broken imports between the two tickets. This
   group is exempt from rules 4 and 6: it stays one ticket at any size.
3. **A Small section merges.** It joins the section it Blocks or is Blocked by. With no such link,
   it joins a Small or Standard section on the same delivery surface (same page, same component,
   same store module). Having neither a link nor a shared surface, it stays its own ticket.
4. **Re-band after each merge.** A group whose summed estimate leaves the Standard band undoes its
   last merge.
5. **Two Standard sections merge only when they change the same files.** Rule 4 then re-bands the
   result as usual. A Standard section sharing no file with another is its own ticket.
6. **A Large section never merges with anything, and is never split further.**

A group may span packages. This monorepo links its packages with `workspace:*` and ships
cross-package changes in one pull request under one ticket key, so the package a section lands in
never forces a split.

Dependency links are computed between GROUPS, after grouping. A Blocks relation between two
sections in the same group disappears - it is internal to one ticket now.

### Step 5: Static analysis

Produce:

1. Task list: one entry per group - task-id, summary (apply summary-title-format), predicted issue type
2. Dependency graph: using Blocks criteria from `jira` skill's create-ticket static analysis

Display format:

```
━━━━━━━━━━ 分組 + 任務清單 + 依賴分析 ━━━━━━━━━━

分組（產品碼估算，測試另計）：
  G1 = §1 + §2 + §6.1      3 檔 /  90 行  Standard  [lib-example + app-example]
  G2 = §3 + §4 + §6.2-6.4  7 檔 / 180 行  Standard  [app-example]
  G3 = §5 + §6.5          14 檔 / 520 行  Large     [app-example]

  §6 Tests、§7 Verification 已折入各組（橫切章節不獨立成票）

任務：
1. T1 [Web][feat] <G1 的一句話目的>
2. T2 [Web][feat] <G2 的一句話目的>
3. T3 [Web][feat] <G3 的一句話目的>

依賴關係：
- T2 → T1 (Blocks)：T2 引用 T1 本次新建的符號

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

確認？(A) 開始逐張建立  (B) 調整分組  (C) 取消
```

The estimate is shown so the user can correct it. Do not proceed until the user replies (A).

### Step 6: Per-ticket sub-task creation

For each sub-task, provide field values to `jira` skill's [description-format](../../jira/references/description-format.md):

| Field | Source |
|-------|--------|
| references | Same as parent (High-Level Spec: change path; Low-Level Spec: if exists), PLUS a precise pointer to the specs/ scenario/section that holds this task's concrete values (e.g. `specs/floor-plan/spec.md §Requirement 1`) so the implementer reads the values there. If no specs/ scenario exists, fall back per the Reference-precision source priority (design.md → proposal.md) |
| scope | the group's section titles + section numbers + change path + background context (proposal.md Why + specs/ requirement) + task positioning (dependency analysis) |
| task_list | the checklist items of every section in the group, kept at behavior level; do NOT inline concrete values — they stay in specs/ and are accessed via the precise pointer in References |
| scope_boundary_in | the combined boundary of the group's sections |
| scope_boundary_out | Section numbers outside this group + already-created ticket keys |
| done_criteria | specs/ corresponding scenario acceptance criteria at behavior level; concrete values point to the specs/ source, not inlined. Must cover related entities if applicable |
| review_guideline | Extract 3+ concrete verification points from specs/ scenarios |

### Reference-Precision Rules

Do NOT inline concrete values from the spec into task_list / done_criteria (they have a
canonical source — see jira description-format「無細節複寫」). Instead keep each item at
behavior level and make References point precisely to where the values live.

| tasks.md item | Index-ticket handling |
|-------------------|-----------------------|
| `Add FLOOR_PLAN to BLOCK_FEATURE_TYPES` | task_list stays behavioral, echoing the tasks.md text: `Add FLOOR_PLAN to BLOCK_FEATURE_TYPES`. The concrete value (route-name constant) stays in the spec — add a precise reference `specs/floor-plan/spec.md §Requirement 1` so the implementer reads it there. |
| `Add floor plan entry to overlayMap` | task_list stays behavioral, echoing the tasks.md text: `Add floor plan entry to overlayMap`. The overlay's title / description / background / link values stay in the spec — add a precise reference `specs/floor-plan/spec.md §Requirement 2`. |

Reference-precision source priority (where to point): specs/ requirements/scenarios → design.md → proposal.md

Delegate each ticket to `jira` skill's full create-ticket flow (draft → Quality Gate → user confirm → create → dependency links → continuation prompt).

## Edge Cases

| Situation | Handling |
|-----------|----------|
| tasks.md missing | Fail with error, suggest using spec-conversion instead |
| Spec has no corresponding scenario for a task section | Scope background from proposal.md, mark ⚠️ insufficient context, ask user |
| Already-created ticket deleted during multi-ticket flow | Skip dependency link, mark in continuation prompt |
| tasks.md has only one section | Create one sub-task, flow unchanged |
| Every section is Small and lands in one package | One ticket for the whole change is a valid result |
| A Large section carries its own tests | Tests fold in; it stays one ticket |
| A section's size cannot be estimated (no file or symbol named anywhere) | Band it Standard, mark ⚠️ estimate unavailable in the Step 5 display |
| The change is already implemented and its sections carry Jira keys | Report the existing keys in the Step 5 display and ask before creating anything - the flow would otherwise duplicate them |
| Parent key provided but doesn't exist | Display error, ask for correct key |
