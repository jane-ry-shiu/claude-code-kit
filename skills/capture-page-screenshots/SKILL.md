---
name: capture-page-screenshots
description: "Use when the user asks to capture screenshots of web pages by route paths, or when invoked internally by generate-feature-doc. Navigates routes via Chrome DevTools MCP, captures screenshots, and returns file paths."
---

# Capture Page Screenshots

## Overview

Navigate a list of route paths via Chrome DevTools MCP, execute UI interactions, capture screenshots, and return file paths. Supports page-level screenshots, dialog/modal captures, search interactions, navigation clicks, revealing hidden UI states, and a fake-data lifecycle (CREATE → capture → DELETE). Designed for documentation workflows — read-only by default; the ONLY permitted mutations are against `doc-temp-` fake entities created and deleted within the same run, per SAFETY RULES.

## Lane

Every Chrome DevTools call below is written `mcp__chrome-devtools-<lane>__<tool>`. `<lane>`
is a template slot: substitute the lane letter your caller assigned you, or `a` if you were
given none. Never use the unsuffixed `mcp__chrome-devtools__*` — it launches a different
Chrome on a different profile, so the captures come from a browser nobody signed into, and
it looks like it worked. See `~/.claude/skills/browser-lanes/SKILL.md`.

## Tabs

Navigate only a tab that belongs to your lane — one you opened yourself, or one your
caller explicitly handed you. If neither applies, call `list_pages`, open your own with
`new_page` (`background: true`), and work there. Every other tab belongs to the user or to
another lane and may hold their filters, dialog or route: never navigate, click or close
it. Close a tab you opened once the plan is done; leave a tab your caller handed you open,
because closing a lane's selected page leaves that entry unusable until someone re-selects
one.

## When to Use

- User asks to capture/screenshot specific routes (e.g., "截圖 /account/profile 和 /account/mfa")
- Called internally by `generate-feature-doc` skill with a screenshot plan

## Input (from ARGUMENTS)

Two input modes are supported:

### Simple Mode (backward compatible)

Comma or newline separated route paths:
```
/account/profile, /account/language
```

### Screenshot Plan Mode

A structured plan with one operation per line. Each line has the format:

```
OPERATION target >> filename-hint
```

**Operation types:**

| Type | Format | Description |
|------|--------|-------------|
| `PAGE` | `PAGE /route >> filename` | Navigate to route and capture full page |
| `CLICK` | `CLICK type:text >> filename` | Click a safe element (tree node, tab, toggle) and capture. Changes page state — no cleanup needed |
| `DIALOG` | `DIALOG btn:text >> filename` (also accepts `selector:` targets, resolved as in CLICK) | Click button to open dialog/modal, capture, then close with Escape |
| `SEARCH` | `SEARCH input:placeholder \| query >> filename` | Type query into a search input, wait, capture, then clear input |
| `REVEAL` | `REVEAL type:text >> filename` | Click element to reveal hidden UI (modal, tooltip, popover), capture, then dismiss |
| `CREATE` | `CREATE btn:text \| field=value; field=value >> filename` | Fake-data lifecycle: open a create dialog, fill fields with `doc-temp-` fake values, click the create commit. Capture point is AFTER the commit (the created state). Requires a paired same-name `DELETE` later in the plan (SAFETY RULES) |
| `DELETE` | `DELETE item:doc-temp-name >> filename` | Fake-data lifecycle: delete an entity a `CREATE` in this plan created — open its delete confirmation, click the final commit. Capture point is AFTER the commit (post-delete state) |

**Target prefixes for CLICK:**
- `selector:` — CSS selector (most precise; use `data-testid`, `data-node-kind`, `role`, `aria-level`, or any DOM attribute). **Preferred when text matching is ambiguous** (e.g., tree nodes at different hierarchy levels that look similar). Examples:
  - `selector:[data-node-kind="site"]` — first site-level tree node
  - `selector:[data-node-kind="floorplan"]` — first floorplan-level tree node
  - `selector:[data-testid="btn-add-floorplan-sidebar"]` — specific button by test ID
- `tree:` — tree view node (by visible text)
- `tab:` — tab button (by visible text)
- `btn:` — non-destructive button (by visible text)
- `toggle:` — expand/collapse toggle

**Target prefixes for REVEAL:**
- `sidebar-device:` — device name in sidebar (triggers live view, etc.)
- `tooltip:` — hover target for tooltip
- `btn:` — button that opens a temporary overlay

**Example screenshot plan:**
```
PAGE /floorplans >> 01-floorplans-default
CLICK selector:[data-node-kind="site"] >> 02-folder-overview
CLICK selector:[data-node-kind="floorplan"] >> 03-floorplan-view
REVEAL sidebar-device:CAM_3000 >> 04-live-view-modal
CLICK tab:Edit >> 05-floorplan-edit
DIALOG btn:+ Floorplan >> 06-create-floorplan-dialog
DIALOG btn:Basic settings >> 07-basic-settings-dialog
SEARCH input:Search site, floor plan, device... | demo >> 08-search-site
CREATE btn:+ Floorplan | name=doc-temp-fp01 >> 09-floorplan-created
DIALOG btn:Delete >> 10-delete-confirm
DELETE item:doc-temp-fp01 >> 11-after-delete
```

**Optional parameters (on any line before the plan):**
- `URL: http://localhost:3000` — override dev server URL (default: `http://localhost:8080`)
- `DIR: /tmp/my-screenshots` — override output directory
- `ENV: non-prod` — declares the target environment is not production. Required before any `CREATE`/`DELETE` runs on a non-localhost URL (see Step 3.5: Environment Check)

## SAFETY RULES (HARD CONSTRAINTS)

<CRITICAL>
**Read-only by default.** The ONLY exception is the FAKE-DATA LIFECYCLE defined below; every other interaction follows the NEVER list.

**NEVER do these (outside the fake-data lifecycle) — no exceptions:**
- Click any control that COMMITS or executes an action — the one that actually deletes, saves, sends, submits, changes, generates, applies, or confirms (in any language: Delete, Submit, Confirm, Send, Apply, Generate, Save, Change, Remove, Update, Create, 刪除, 提交, 確認, 儲存, 套用, 移除, 建立, 送出, 變更). **Classify by what the control DOES, not its label alone** — a same-labelled button (e.g. a "Delete" that only opens an "Are you sure?" prompt) is a dialog-opener (see ALLOWED); the commit is the FINAL button inside that prompt.
- Fill form fields inside dialogs or settings panels — this includes typing credentials or passwords; **never enter real credentials anywhere**
- Modify any system settings or data
- Submit any form

**FAKE-DATA LIFECYCLE — the only permitted mutations.** A `CREATE` line may fill a create dialog with fake values and click its create commit; a `DELETE` line may click the final delete commit. ALL of the following must hold:
- The entity name starts with `doc-temp-` — or with the hyphen-free fallback prefix `doctemp` when the target's name validator rejects hyphens (some apps ban `-` in entity names) — and the `CREATE` has a paired same-name `DELETE` later in the same plan (validated at parse time in Step 1; an unpaired or non-prefixed CREATE is refused).
- A `DELETE` only ever targets an entity created by a `CREATE` earlier in this same plan — never pre-existing data, regardless of its name.
- The Environment Check (Step 3.5) passed: localhost, or declared/confirmed non-prod. On prod — or when the environment cannot be confirmed — the lifecycle is disabled entirely.
- The creation has NO external side effects on real people: anything that sends an email or notification to a real person (e.g. adding a user sends an invite) is forbidden. Consuming license/quota is acceptable ONLY when deleting the entity restores it. Judge from the UI and context; if you cannot tell, treat it as having side effects and refuse the CREATE.
- Credential/secret operations are NEVER fake data: generating API keys, tokens, or MFA setup stays forbidden — the screenshot itself would publish a live secret.
- Real-account operations with no fake-data substitute stay forbidden: forgot password, changing the logged-in account's password or settings.

**ALLOWED — safe read-only interactions:**
- Type into search/filter inputs (identified by `type="search"` or placeholder containing "search", "搜尋", "篩選", "filter")
- Click tree nodes, tabs, toggles, breadcrumbs, expand/collapse buttons
- Click buttons that open a dialog — INCLUDING a confirmation prompt for a destructive action ("Are you sure?") — for VIEWING ONLY: screenshot the opened dialog, then dismiss it (Cancel/Keep/Close/Escape) WITHOUT clicking its committing control. Reaching and capturing the confirmation prompt is safe because it is reversible; only the final commit inside it is forbidden (outside the fake-data lifecycle). For multi-step flows, you may advance step by step as long as every step only opens/reveals dismissable UI and none commits — stop and screenshot at the last reversible step.
- Click sidebar items for navigation
- Hover over elements to reveal tooltips

**CLEANUP RULES:**
- Dialogs/modals opened for screenshots MUST be closed afterward (Escape key or click Cancel/Keep/Close/取消/保留/關閉) — never leave a destructive dialog open
- Search inputs MUST be cleared after capture (triple-click to select all, then Delete key, or clear button)
- REVEAL operations MUST be dismissed after capture (Escape, click outside, or close button)
- Every entity a `CREATE` made MUST be removed by its paired `DELETE` in the same run. If the delete fails, emit `CLEANUP-FAILED: <entity name> on <route>` in the results (Step 5) — never silently leave fake data behind (the `doc-temp-`/`doctemp` prefix keeps leftovers recognizable)

**When unsure whether an action is safe → SKIP IT and log as FAILED.** In particular: when you cannot tell whether a control opens a reversible confirmation or commits immediately, treat it as a commit and SKIP; when you cannot tell whether a create has external side effects, refuse it.
</CRITICAL>

## Workflow

### Step 1: Parse Input and Create Output Directory

Detect input mode:
- If lines start with `PAGE`, `CLICK`, `DIALOG`, `SEARCH`, `REVEAL`, `CREATE`, or `DELETE` → **Screenshot Plan Mode**
- Otherwise → **Simple Mode** (parse as comma/newline separated routes)

For Simple Mode, convert each route to a `PAGE` operation.

Create output directory:
```bash
mkdir -p /tmp/page-screenshots/$(date +%Y%m%d_%H%M%S)
```

Store the created path for later use.

**Fake-data pairing validation (parse time, before anything runs):**
- Every `CREATE` line's entity name (its `name=` field value, or the first field value when no `name=` field exists) MUST start with `doc-temp-` — or with the fallback prefix `doctemp` (hyphen-free, for targets whose name validator rejects hyphens) — AND have a `DELETE item:<same name>` line later in the same plan. If either check fails, refuse the ENTIRE `CREATE` and every capture depending on it — log `FAILED: <line> (unpaired or non-doc-temp CREATE)`.
- Every `DELETE` line MUST target a name introduced by an earlier `CREATE` in this same plan. A `DELETE` naming anything else is refused — this skill never deletes pre-existing data. Log `FAILED: <line> (DELETE target not created by this plan)`.

### Step 2: Set Viewport Size

Use `mcp__chrome-devtools-<lane>__resize_page` to set a consistent viewport before capturing:
- Width: 1440
- Height: 900

### Step 3: Login Check

1. Use `mcp__chrome-devtools-<lane>__navigate_page` to navigate to the first PAGE route
2. Use `mcp__chrome-devtools-<lane>__take_snapshot` to get the accessibility tree text
3. Search the snapshot text for login indicators: "登入", "Sign in", "Log in", "login", "password"
4. Also check if the current URL contains `/login`

**If logged in** → proceed to Step 4.

**If NOT logged in:**
1. Tell the user: "Chrome DevTools 的瀏覽器尚未登入，請在該瀏覽器中登入後告訴我"
2. Wait for user confirmation (use AskUserQuestion)
3. Retry: navigate again + take_snapshot
4. If still not logged in → output `FAILED: login_required` and stop

**Fallback:** If take_snapshot is inconclusive, take a screenshot with `mcp__chrome-devtools-<lane>__take_screenshot` and read it with the Read tool to visually check for a login page.

### Step 3.5: Environment Check (only when the plan contains CREATE/DELETE)

Skip this step entirely when the plan has no `CREATE`/`DELETE` lines.

1. If the target base URL host is `localhost` or `127.0.0.1` → non-prod; proceed.
2. Otherwise, if the plan declares `ENV: non-prod` → proceed.
3. Otherwise ask the user ONCE via AskUserQuestion: "目標環境 <URL> 是 production 嗎?(是 → 假資料建立/刪除將全部停用)"
   - Confirmed non-prod → proceed.
   - Prod, or the user cannot confirm → do NOT execute any `CREATE`/`DELETE` line: log each as `FAILED: <line> (prod environment — fake-data lifecycle disabled)`, skip captures that depend on them, and run the remaining read-only operations under the normal rules.

### Step 4: Execute Screenshot Plan

Execute operations **in order** (order matters — later operations may depend on page state from earlier ones).

Index is zero-padded two digits: 01, 02, 03... Use the filename from the plan, or auto-generate from the operation.

#### Snapshot Reuse Rule

`take_snapshot` is expensive. **Reuse the most recent snapshot** whenever the DOM has not changed since it was taken. Only take a new snapshot when:
- You just navigated to a new page/route
- A dialog was opened or closed
- A tab/tree node was clicked (page content changed)
- A search query was typed or cleared
- Any interaction mutated the visible DOM

In practice: if the previous operation ended by closing a dialog, clearing a search, or clicking a tab, the DOM changed — take a fresh snapshot.

**A PAGE line never takes one.** It only navigates and captures, so it has no element to find; and since navigation always invalidates the DOM, there would be nothing for a later line to reuse anyway. The first interaction operation after a PAGE takes its own snapshot. A plan made entirely of PAGE lines should produce **zero** snapshots.

**Never take a snapshot to answer a yes/no question** (is this entity present? did the dialog close? are we logged in?). Use `mcp__chrome-devtools-<lane>__evaluate_script` with a boolean probe — it costs a few dozen tokens against a snapshot's ~1,500 — and fall back to a full snapshot only when the probe contradicts expectation.

#### PAGE operation

1. `mcp__chrome-devtools-<lane>__navigate_page` to `{dev_server_url}{route}`
2. Wait for page load: `sleep 3` via Bash
3. `mcp__chrome-devtools-<lane>__take_screenshot` with `filePath: {output_dir}/{filename}.png`, `fullPage: true`

**Do NOT take a snapshot here.** A PAGE line only navigates and captures — it
never needs to locate an element, and the screenshot goes straight to a file
without entering context. Taking a snapshot "in case the next line needs it" is
the single most expensive habit in this skill: a real portal page measured
5,850 characters (~1,500 tokens), and a plan of mostly-PAGE lines pays that for
every route while using almost none of them.

The next operation resolves this correctly on its own: every interaction
operation (CLICK / DIALOG / SEARCH / REVEAL / CREATE / DELETE) begins by taking
a snapshot when the DOM has changed, and a navigation always changes it. So the
snapshot still happens exactly when an element actually has to be found — just
not before.

Net effect on a 20-route documentation run: roughly 55% fewer accumulated input
tokens, and 20 fewer model round-trips.

#### CLICK operation

1. **Reuse the last snapshot** if the DOM hasn't changed; otherwise `mcp__chrome-devtools-<lane>__take_snapshot` to find the target element
2. **Resolve target:**
   - `selector:` prefix → use `mcp__chrome-devtools-<lane>__evaluate_script` to find the element via `document.querySelector(...)`, then locate its uid in the snapshot. If the selector matches multiple elements, use the first visible one.
   - `tree:` / `tab:` / `btn:` / `toggle:` prefix → find the target element by text in the snapshot
3. **Verify safety** — check element text against the forbidden button list
4. `mcp__chrome-devtools-<lane>__click` on the target element (by uid)
5. Wait for UI update: `sleep 2`
6. `mcp__chrome-devtools-<lane>__take_screenshot` with `filePath: {output_dir}/{filename}.png`, `fullPage: true`
7. No cleanup needed — CLICK changes are navigational (but note: the DOM has now changed, so the next operation needs a fresh snapshot)

#### DIALOG operation

1. **Reuse the last snapshot** if the DOM hasn't changed; otherwise `mcp__chrome-devtools-<lane>__take_snapshot` to find the trigger button (`btn:` text match, or a `selector:` target resolved as in CLICK)
2. **Verify safety** — classify by what the button DOES (per SAFETY RULES), not its label alone: the button must OPEN a dialog, not commit anything. A button whose label matches the forbidden list (e.g. `Delete`) is acceptable here ONLY when it merely opens a confirmation dialog — the committing control inside that dialog stays forbidden.
3. `mcp__chrome-devtools-<lane>__click` on the button (by uid)
4. Wait for dialog to appear: `sleep 1`
5. `mcp__chrome-devtools-<lane>__take_screenshot` with `filePath: {output_dir}/{filename}.png`, `fullPage: true`
6. **Close the dialog**: `mcp__chrome-devtools-<lane>__press_key` with `Escape`. If Escape doesn't work, take a new snapshot and click Cancel/Close/取消/關閉. (DOM changes after close — next operation needs a fresh snapshot)

#### SEARCH operation

1. **Reuse the last snapshot** if the DOM hasn't changed; otherwise `mcp__chrome-devtools-<lane>__take_snapshot` to find the search input (match by placeholder text after `input:`)
2. `mcp__chrome-devtools-<lane>__click` on the search input to focus it
3. `mcp__chrome-devtools-<lane>__type_text` with the query text (after `|`)
4. Wait for results to update: `sleep 2`
5. `mcp__chrome-devtools-<lane>__take_screenshot` with `filePath: {output_dir}/{filename}.png`, `fullPage: true`
6. **Clear the search**: Triple-click the input to select all text, then `mcp__chrome-devtools-<lane>__press_key` with `Backspace`. Alternatively, click the clear button if visible (✕ icon). Wait `sleep 1` for the UI to reset. (DOM changes after clear — next operation needs a fresh snapshot)

#### REVEAL operation

1. **Reuse the last snapshot** if the DOM hasn't changed; otherwise `mcp__chrome-devtools-<lane>__take_snapshot` to find the target element
2. **Verify safety** — element must not be a destructive action
3. `mcp__chrome-devtools-<lane>__click` on the target element (by uid)
4. Wait for hidden UI to appear: `sleep 2`
5. `mcp__chrome-devtools-<lane>__take_screenshot` with `filePath: {output_dir}/{filename}.png`, `fullPage: true`
6. **Dismiss the revealed UI**: `mcp__chrome-devtools-<lane>__press_key` with `Escape`. If that doesn't work, click outside the overlay or use a close button.
7. Wait for cleanup: `sleep 1` (DOM changes after dismiss — next operation needs a fresh snapshot)

#### CREATE operation (fake-data lifecycle — see SAFETY RULES)

Format: `CREATE btn:<opener text> | <field>=<value>; <field>=<value> >> filename`

Preconditions — all already validated before this line runs: pairing validation (Step 1), Environment Check (Step 3.5), and the SAFETY RULES side-effect / secret checks for this entity type. If any fails, log `FAILED:` with the reason and also skip the paired `DELETE` and every capture depending on this CREATE.

1. **Reuse the last snapshot** if the DOM hasn't changed; otherwise `take_snapshot`. Find the opener button — it must be a dialog-opener (same classification rule as DIALOG). Also confirm from this snapshot that the target `doc-temp-` name is NOT already present on the page — if it is, refuse the line: log `FAILED: <line> (name already exists — not created by this line)` and skip the paired `DELETE` and every capture depending on it
2. `mcp__chrome-devtools-<lane>__click` the opener; wait `sleep 1` for the dialog
3. `take_snapshot` again. If the opened dialog arrives PRE-FILLED with an existing entity's data (an edit/rename dialog, not a create dialog), close it (Escape/Cancel) and refuse the line: log `FAILED: <line> (opener leads to an edit dialog, not a create dialog)` and skip the paired `DELETE` and every capture depending on it. Otherwise: For each `<field>=<value>` pair: click the matching input (match by label or placeholder text) and `type_text` the value. Name-like values carry the `doc-temp-` prefix (guaranteed by Step 1 validation)
4. Find the dialog's commit button (Create/建立/Save/儲存/…) and click it — this is the permitted commit
5. Wait `sleep 2` for the UI to update
6. If a `>> filename` hint is present: `take_screenshot` with `filePath: {output_dir}/{filename}.png`, `fullPage: true` — the capture point is AFTER the commit (the created state, e.g. the list showing the new `doc-temp-` row). To capture the create dialog itself, use a separate read-only `DIALOG` line before this one
7. **Verify creation:** `take_snapshot` and confirm the `doc-temp-` name is now present. If it is not, log `FAILED: CREATE <line> (entity not found after commit)` and skip the paired `DELETE` and every capture depending on this CREATE. (DOM changed — next operation needs a fresh snapshot)

Single-dialog creates only. Multi-step wizards are NOT supported — do not attempt them; log `FAILED: <line> (multi-step wizard create unsupported)`.

#### DELETE operation (fake-data lifecycle — see SAFETY RULES)

Format: `DELETE item:doc-temp-<name> >> filename`

Preconditions: the target name was created by a successful `CREATE` earlier in this plan (Step 1 validation + runtime check — a failed CREATE skips this line). Never runs on prod (Step 3.5).

1. **Reuse the last snapshot** if the DOM hasn't changed; otherwise `take_snapshot`. Locate the list item whose name EXACTLY equals the target — substring or fuzzy matches are refused
2. Click that row's delete button / menu action (a dialog-opener — allowed)
3. Wait `sleep 1` for the confirmation prompt. (Want a confirm-dialog screenshot? Use a preceding `DIALOG` line — target the `doc-temp-` row's own delete button, via `DIALOG selector:…` when text alone is ambiguous; this line's hint captures the post-delete state)
4. `take_snapshot`; find the confirmation's FINAL commit button (Delete/刪除/移除/…) and click it — this is the permitted commit. If the confirmation is a type-to-confirm prompt (the commit button stays disabled until a literal token like `DELETE` is typed), typing that token is part of this permitted commit — allowed ONLY when the prompt explicitly names the fake entity being deleted
5. Wait `sleep 2`
6. If a `>> filename` hint is present: `take_screenshot` with `filePath: {output_dir}/{filename}.png`, `fullPage: true` (post-delete state)
7. **Verify deletion:** `take_snapshot` and confirm the `doc-temp-` name is GONE. If still present, retry once from step 2; if it still fails, record `CLEANUP-FAILED: <entity name> on <route>` for Step 5 and continue with the rest of the plan

### Step 5: Return Results

Output structured results that the orchestrator can parse:

```
SCREENSHOTS: /tmp/page-screenshots/20260318_143000/01-default.png, /tmp/page-screenshots/20260318_143000/02-view.png
```

If any operations failed:
```
FAILED: DIALOG btn:+ Floorplan (could not find button in snapshot)
FAILED: SEARCH input:Search... | query (search input not found)
```

If any fake entity could not be deleted (DELETE verify failed after one retry):

```
CLEANUP-FAILED: doc-temp-fp01 on /floorplans
```

List ALL successful screenshots on a single `SCREENSHOTS:` line (comma-separated).
List each failure on its own `FAILED:` line with the original operation and reason.
Each cleanup failure goes on its own `CLEANUP-FAILED:` line, in addition to any `FAILED:` lines. Callers MUST surface `CLEANUP-FAILED:` lines to the user verbatim — the `doc-temp-` (or fallback `doctemp`) prefix lets a human find and remove the leftover entity manually.
