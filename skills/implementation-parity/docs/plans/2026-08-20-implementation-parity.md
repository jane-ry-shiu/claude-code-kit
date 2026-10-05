# Implementation Parity Skill Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the `implementation-parity` skill — compare an implementation against a baseline (runnable prototype, Figma frame, or written spec) by driving a real browser, then reconcile the resulting differences against whatever review conclusions already exist.

**Architecture:** One `SKILL.md` carrying the main flow plus seven `references/*.md` loaded on demand, one per phase. Four references are ported from the skill being replaced; two are new; one is a merge of four old files. A `docs/check.sh` integrity script backed by `docs/manifest.txt` gives every task a real red-green cycle: the task adds its manifest line first (check fails), then writes the file (check passes).

**Tech Stack:** Markdown skill files; `gh` CLI 2.76.0 and GitHub MCP for review reconciliation; `chrome-devtools-{a,b,c}` MCP entries for browser work; bash for the integrity check.

**Spec:** `~/.claude/skills/implementation-parity/docs/specs/2026-08-20-implementation-parity-design.md`

## Global Constraints

- **No git.** `~/.claude` is not a git repository. There are no commits. Every task ends by running `docs/check.sh` instead. The only rollback mechanism is the established `.backup-<topic>-<date>/` convention.
- **Skill file language is English.** All skill and reference content is written in English. User-facing output *templates* quoted inside those files stay in zh-TW, because that is what the skill will print.
- **Browser entries are lettered.** Every tool reference in every file uses `mcp__chrome-devtools-<lane>__*` where `<lane>` is `a` or `b`. The bare `mcp__chrome-devtools__` prefix is forbidden — per `browser-lanes`, it launches a separate browser with an exclusive profile lock. Ported content must be rewritten, not copied.
- **The plan file is the report.** One file at `docs/verification-plans/YYYY-MM-DD-HH-mm-<topic>.md`. The old skill's separate `docs/verification-reports/` location is not carried over.
- **Never submit a review.** No `event` parameter on review creation, no `submit_pending`, no offering to submit.
- **Two confirmation gates are non-skippable:** the comparison-item list before any browser opens, and the candidate list before anything on a PR is touched.
- Skill directory: `~/.claude/skills/implementation-parity/`. All paths below are relative to it unless absolute.

---

### Task 1: Verify REST behavior for pending review comments

This is a spike. Its outcome selects which path Task 9 writes. Do it first — Task 9 cannot be written honestly without it.

**Files:**
- Create: `docs/specs/2026-08-20-pending-comment-api-findings.md`

**Interfaces:**
- Produces: a decision recorded as `PER_COMMENT_SUPPORTED = true | false`, consumed by Task 9.

**Prerequisite — ask the user first.** This task creates a pending review on a real PR. A pending review is visible only to its author and is removed by `delete_pending`, so it is reversible and not outward-facing, but it still touches a live PR. Ask which PR to use and wait for an answer. Do not pick one unilaterally.

- [ ] **Step 1: Record the expected answers before testing**

Write the three open questions into the findings file with `EXPECTED: unknown` so the results cannot be rationalized afterwards:

```markdown
# Pending Review Comment API — Findings

**Date:** 2026-08-20
**PR used:** <owner/repo#N, supplied by user>

| Question | Expected | Actual |
|---|---|---|
| Does `GET /repos/{o}/{r}/pulls/{n}/reviews` list a PENDING review for its author? | unknown | |
| Does `GET /repos/{o}/{r}/pulls/{n}/reviews/{id}/comments` return its unsubmitted comments? | unknown | |
| Does `PATCH /repos/{o}/{r}/pulls/comments/{id}` edit an unsubmitted comment? | unknown | |
| Does `DELETE /repos/{o}/{r}/pulls/comments/{id}` remove an unsubmitted comment? | unknown | |
```

- [ ] **Step 2: Create a pending review with one comment**

Use the MCP tools, not raw REST, so the setup matches what the skill will actually do:

```
mcp__github__pull_request_review_write   method=create, owner, repo, pullNumber   (NO event parameter)
mcp__github__add_comment_to_pending_review   path=<a file in the diff>, line=<a line inside a hunk>,
                                             side=RIGHT, subjectType=LINE,
                                             body="parity-api-probe — 這是 API 測試留言，稍後刪除"
```

- [ ] **Step 3: Probe listing**

```bash
gh api /repos/{owner}/{repo}/pulls/{n}/reviews --jq '.[] | {id, state}'
```
Expected if supported: a row with `"state":"PENDING"`. Record the id as `REVIEW_ID`.

```bash
gh api /repos/{owner}/{repo}/pulls/{n}/reviews/{REVIEW_ID}/comments --jq '.[] | {id, path, line, body}'
```
Record the comment id as `COMMENT_ID`. If either call returns empty or 404, record `false` and skip to Step 6.

- [ ] **Step 4: Probe edit**

```bash
gh api -X PATCH /repos/{owner}/{repo}/pulls/comments/{COMMENT_ID} -f body='parity-api-probe edited' --jq '{id, body}'
```
Expected if supported: the returned `body` is the edited text. A 404 or 422 means unsupported.

- [ ] **Step 5: Probe delete**

```bash
gh api -X DELETE /repos/{owner}/{repo}/pulls/comments/{COMMENT_ID} -i 2>&1 | head -1
```
Expected if supported: `HTTP/2 204`.

- [ ] **Step 6: Clean up unconditionally**

```
mcp__github__pull_request_review_write   method=delete_pending, owner, repo, pullNumber
```

Then confirm nothing is left:

```bash
gh api /repos/{owner}/{repo}/pulls/{n}/reviews --jq '.[] | select(.state=="PENDING") | .id'
```
Expected: empty output. If not empty, stop and tell the user — a stray pending review on their PR is not acceptable to leave behind.

- [ ] **Step 7: Fill in the Actual column and state the decision**

Append to the findings file:

```markdown
## Decision

`PER_COMMENT_SUPPORTED = <true|false>`

- true  → Task 9 writes per-comment edit/delete as the primary path, whole-review rebuild as the fallback.
- false → Task 9 writes whole-review rebuild as the ONLY path, and it always asks the user before running.
```

- [ ] **Step 8: Report to the user**

State the four answers and which path Task 9 will take. This is a decision point they should see.

---

### Task 2: Skill skeleton, SKILL.md, and the integrity check

**Files:**
- Create: `SKILL.md`
- Create: `docs/manifest.txt`
- Create: `docs/check.sh`

**Interfaces:**
- Produces: the reference dispatch table that Tasks 3–9 each fill one row of; `docs/check.sh` and `docs/manifest.txt`, which every later task extends and runs.

- [ ] **Step 1: Write the integrity check**

Create `docs/check.sh`:

```bash
#!/usr/bin/env bash
# Integrity check for the implementation-parity skill.
set -uo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
fail=0
err() { echo "FAIL: $*"; fail=1; }

[ -f "$ROOT/SKILL.md" ] || err "SKILL.md missing"
if [ -f "$ROOT/SKILL.md" ]; then
  head -1 "$ROOT/SKILL.md" | grep -qx -- '---' || err "SKILL.md: no frontmatter opener"
  grep -qE '^name: implementation-parity$' "$ROOT/SKILL.md" || err "SKILL.md: name must be implementation-parity"
  grep -qE '^description: .+' "$ROOT/SKILL.md" || err "SKILL.md: description missing"
fi

while IFS= read -r line || [ -n "$line" ]; do
  [ -z "$line" ] && continue
  case "$line" in \#*) continue ;; esac
  file="${line%% ::*}"
  if [ ! -f "$ROOT/$file" ]; then err "$file: listed in manifest but missing"; continue; fi
  grep -qF "$(basename "$file")" "$ROOT/SKILL.md" 2>/dev/null || err "$file: not linked from SKILL.md"
  headings="${line#"$file"}"
  while [ -n "$headings" ]; do
    headings="${headings# :: }"
    case "$headings" in *" :: "*) h="${headings%% :: *}"; headings="${headings#*" :: "}" ;; *) h="$headings"; headings="" ;; esac
    [ -z "$h" ] && continue
    grep -qF "$h" "$ROOT/$file" || err "$file: required heading missing -- $h"
  done
done < "$ROOT/docs/manifest.txt"

if [ -d "$ROOT/references" ]; then
  for f in "$ROOT"/references/*.md; do
    [ -e "$f" ] || continue
    grep -qF "references/$(basename "$f")" "$ROOT/docs/manifest.txt" || err "references/$(basename "$f"): not in manifest"
  done
fi

if grep -rn 'mcp__chrome-devtools__' "$ROOT" --include='*.md' 2>/dev/null | grep -v '/docs/'; then
  err "bare mcp__chrome-devtools__ entry found (must be mcp__chrome-devtools-<lane>__)"
fi
if grep -rnE '\b(TBD|TODO|FIXME|XXX)\b' "$ROOT" --include='*.md' 2>/dev/null | grep -v '/docs/'; then
  err "placeholder markers found"
fi
if grep -rn 'implementation-verification' "$ROOT" --include='*.md' 2>/dev/null | grep -v '/docs/'; then
  err "SKILL.md/references still reference the replaced skill"
fi

[ "$fail" -eq 0 ] && echo "OK: all checks passed"
exit "$fail"
```

Make it executable: `chmod +x ~/.claude/skills/implementation-parity/docs/check.sh`

This script was exercised against a scaffold on 2026-08-20 before this plan was finalized: it
goes red on a missing file, red on a present file with a missing required heading, green when
every manifest row is satisfied, and red on each of an orphan reference file, a bare
`mcp__chrome-devtools__` entry, and a placeholder marker. Do not rewrite it; extend it only by
adding manifest rows.

- [ ] **Step 2: Write the manifest with all seven rows**

Create `docs/manifest.txt`. Every row is present from the start, so the check fails until each task lands its file — that is the red state each later task turns green.

```
# file :: required heading :: required heading ...
references/baseline-discovery.md :: ## Locating the Jira key :: ## Where to look inside Jira :: ## Stop condition
references/plan-and-report.md :: ## Plan file location :: ## Per-item lifecycle :: ## Pending comment backup :: ## Final counts
references/browser-operation.md :: ## Lane assignment :: ## Approach hierarchy :: ## Snapshot usage :: ## State inspection :: ## Side-effect verification :: ## Retry policy
references/dev-server.md :: ## Protocol :: ## Cleanup :: ## Error cases
references/visual-comparison.md :: ## Prerequisites :: ## Process :: ## Limitations
references/prototype-comparison.md :: ## When this applies :: ## Login conflict check :: ## Paired action execution :: ## What counts as a difference
references/reconcile-findings.md :: ## Confirmation gate :: ## Backup first :: ## Four dispositions :: ## Landing sites :: ## Situations without a pending review :: ## Never submit
```

- [ ] **Step 3: Run the check and watch it fail**

Run: `~/.claude/skills/implementation-parity/docs/check.sh`
Expected: `FAIL: SKILL.md missing` plus seven `listed in manifest but missing` lines. Exit code 1.

- [ ] **Step 4: Write SKILL.md**

Create `SKILL.md` with this frontmatter verbatim:

```markdown
---
name: implementation-parity
description: Use when checking whether an implementation matches its baseline — a runnable prototype, a Figma frame, or a written spec — by driving the real application in a browser, and when review conclusions need checking against what the application actually does. Triggers - after implementing a feature, verify/validate implementation, compare against prototype or design, confirm a review finding is right.
---
```

Body sections, in order:

1. `## Overview` — one paragraph: baseline × implementation parity, then reconcile against existing review conclusions.
2. `## When to Use` / `## When NOT to Use` — NOT for writing tests (test-driven-development), NOT for debugging failures (systematic-debugging), NOT for pixel-perfect visual regression.
3. `## Baseline tiers` — the three-row table from the spec's "Baseline tiers" section, copied.
4. `## Flow` — the nine-step flow from the spec, as a `dot` digraph, with the two confirmation gates drawn as diamond nodes.
5. `## Execution` — one short subsection per step, each ending with which reference to load:

   | Step | Loads |
   |---|---|
   | 1 Resolve inputs | — |
   | 2 Discover baseline | `references/baseline-discovery.md` |
   | 3 Derive comparison items + confirm | — |
   | 4 Write comparison plan | `references/plan-and-report.md` |
   | 5 Start dev server | `references/dev-server.md` |
   | 6 Execute items | `references/browser-operation.md`, plus `references/prototype-comparison.md` (tier 1) or `references/visual-comparison.md` (tier 2) |
   | 7 Classify differences | — |
   | 8 Reconcile | `references/reconcile-findings.md` |
   | 9 Report counts | `references/plan-and-report.md` |

6. `## Comparison item derivation` — the three-class table from the spec verbatim (Must compare / Also compare / Skip), including the sentence explaining why an intersection is wrong.
7. `## HARD-GATE` block containing exactly these four rules:

```
1. The comparison-item list is presented and confirmed by the user BEFORE any browser opens.
2. The candidate list is presented and confirmed by the user BEFORE anything on a PR is touched.
3. An item whose result cannot be determined is recorded SKIP. Never guessed PASS or FAIL.
4. Never submit a review. No `event` parameter, no `submit_pending`, no offering to submit.
```

8. `## Reference Loading Rule` — load only the reference for the current step.
9. `## Required MCP Tools` — table naming `chrome-devtools-a` / `chrome-devtools-b`, `figma-remote-mcp`, `mcp-atlassian` (Jira), `github`, and `gh` CLI.

- [ ] **Step 5: Run the check**

Run: `~/.claude/skills/implementation-parity/docs/check.sh`
Expected: the `SKILL.md missing` / frontmatter errors are gone; the seven `listed in manifest but missing` lines remain. Exit code 1.

- [ ] **Step 6: Snapshot before touching anything outside this directory**

```bash
cp -R ~/.claude/skills/implementation-verification ~/.claude/.backup-implementation-parity-2026-08-20/
```

This is the rollback point for Task 10's deletion. Nothing else in `~/.claude` is modified by this plan.

---

### Task 3: baseline-discovery.md

**Files:**
- Create: `references/baseline-discovery.md`

**Interfaces:**
- Consumes: nothing.
- Produces: for each baseline found, a record of `tier` (1/2/3), `source` (which ticket level and which comment), and `location` (URL or quoted text). Task 8 and Task 4 both read `tier`.

- [ ] **Step 1: Run the check to confirm this file is red**

Run: `~/.claude/skills/implementation-parity/docs/check.sh 2>&1 | grep baseline-discovery`
Expected: `FAIL: references/baseline-discovery.md: listed in manifest but missing`

- [ ] **Step 2: Write the file**

Required headings (from the manifest): `## Locating the Jira key`, `## Where to look inside Jira`, `## Stop condition`.

`## Locating the Jira key` — resolution order, stated as a table: user-supplied → PR title → branch name → commit messages. Include the actual monorepo format so the pattern is recognizable: `feat(reseller): [VOR-32711] pin incident table status`. Note that both `VOR-` and `NVRDEV-` prefixes occur. None found → go to the stop condition.

`## Where to look inside Jira` — the search order, and it is exhaustive, not first-match:

```
this ticket   description
this ticket   comments
parent/epic   description
parent/epic   comments
              linked Confluence pages
              attachments
```

Include this paragraph in substance — it is the reason the section exists:

> The parent levels are not optional. In ADAT-822 the prototype link lived in the parent
> ticket's description and the decision that settled the disputed behavior lived in a parent
> comment; the ticket itself carried neither. Reading only the ticket's own description would
> have produced a false "no baseline found".

Then classification rules: a URL to a running demo or a `figma.com/proto/` link is tier 1; a `figma.com/design/` or `figma.com/file/` link with a node id is tier 2; acceptance criteria, Confluence spec pages, and free-text behavior descriptions are tier 3. When several are found, keep them all — a run can compare against a tier-1 prototype for behavior and a tier-2 frame for appearance.

Record for every baseline: which level it came from, and which comment id if it came from a comment. Every difference must be traceable back to a specific source.

Tools: `mcp__mcp-atlassian__jira_get_issue` for the ticket, and again for the parent key from its `parent` field; `mcp__mcp-atlassian__confluence_get_page` for linked pages; `mcp__mcp-atlassian__jira_download_attachments` for attachments.

`## Stop condition` — stop, do not degrade to guessing. Output template, in zh-TW because it is printed to the user:

```
找不到可比對的基準。已查過：{KEY} 的描述與 {N} 則留言、parent {PARENT_KEY} 的描述與留言、
{N} 個 Confluence 連結、{N} 個附件。
請提供其中一種：可操作的原型網址、Figma frame 連結、或直接把預期行為寫給我。
```

The counts are real counts from the search, not placeholders. A message that says "已查過" without numbers is not acceptable — the numbers are what let the user tell whether the search was shallow.

- [ ] **Step 3: Run the check**

Run: `~/.claude/skills/implementation-parity/docs/check.sh 2>&1 | grep baseline-discovery || echo "baseline-discovery clean"`
Expected: `baseline-discovery clean`

---

### Task 4: plan-and-report.md

**Files:**
- Create: `references/plan-and-report.md`

**Interfaces:**
- Consumes: `tier` and `source` from Task 3.
- Produces: the plan file skeleton that Task 8's execution writes into, and the `## Final counts` output format that SKILL.md step 9 prints.

- [ ] **Step 1: Run the check to confirm this file is red**

Run: `~/.claude/skills/implementation-parity/docs/check.sh 2>&1 | grep plan-and-report`
Expected: `FAIL: references/plan-and-report.md: listed in manifest but missing`

- [ ] **Step 2: Write the file**

Required headings: `## Plan file location`, `## Per-item lifecycle`, `## Pending comment backup`, `## Final counts`.

`## Plan file location` — `docs/verification-plans/YYYY-MM-DD-HH-mm-<topic>.md`, created with `mkdir -p`. State plainly that **this one file is also the report**; a separate report file would recreate the two-ledger problem that disqualified todo mirroring. Note that it lives in the repo and will show up in `git status`; that is accepted, not accidental.

Plan skeleton to write out in full:

```markdown
# Parity Run: <topic>

**Date:** YYYY-MM-DD HH:mm
**Jira:** <KEY> (+ parent <KEY> if used)
**Baselines:** tier <n> — <source level / comment id> — <url or quoted text>
**Target:** <dev server url or deployed env>
**Lanes:** prototype=chrome-devtools-<a>, implementation=chrome-devtools-<b>

## Prerequisites

- [ ] Account/credentials confirmed: <user / login URL>
- [ ] Login conflict resolved: <shared browser OK | must run sequentially>
- [ ] Required test data: <devices, sites, fixtures>
- [ ] Baseline reachable: <prototype URL responds | Figma authenticated>

## Comparison Items

### Item 1: <description>
**Class:** Must compare | Also compare
**Tier:** 1 | 2 | 3
**Route:** /path
**Status:** Pending

#### Plan
- Baseline action: <what is done on the prototype, or which frame / which clause>
- Implementation action: <what is done on the implementation>
- Compare on: <state | timing | request dispatch | appearance | description>

#### Execution log
- Started: <HH:mm>
- Actions: <chronological, with the concrete ids and names used>
- Ended: <HH:mm>
- Baseline observed: <...>
- Implementation observed: <...>
- Verdict: SAME | DIFFERENT | SKIP
- Evidence: <the JS query and its output, or a screenshot path>

### Item 2: <description>
*(duplicate the entire Item 1 block, including Class / Tier / Route / Status / Plan /
Execution log, and increment the number)*

## Existing review conclusions (verbatim backup)

## Differences

## Cleanup

- [ ] Test data created: <list>
- [ ] Dev server: <stop if started by skill / leave running>
```

`## Per-item lifecycle` — carried over from the replaced skill, with the todo mirroring removed:

- An item opens only after the previous item has a terminal `Verdict` of SAME, DIFFERENT, or SKIP.
- Opening writes `Status: In Progress` and `Started:` before any browser action for that item.
- `Started` and `Ended` are written in separate edits, so the file's history reflects the real execution span.
- Closing writes `Ended`, both `observed` fields, `Verdict`, and `Evidence`.
- Batch-closing several items in one turn is forbidden.
- An item whose result cannot be determined is `SKIP`, with `Baseline observed:` recording *why* it could not be determined. Never guessed SAME or DIFFERENT.

`## Pending comment backup` — before any mutation of a PR, every existing pending comment is read and stored verbatim under `## Existing review conclusions (verbatim backup)`, one fenced block per comment with its comment id, path, line, and body. Whichever reconciliation path runs, this is the only safety net.

`## Final counts` — the closing message always states three numbers:

```
比對完成。
  上了 PR：{N} 條
  只在報告裡：{N} 條（錨不到程式行）
  建議你手動處理：{N} 條
報告：<plan file path>
```

State why the second number matters: "specified but never implemented" lands there by construction, and it is the category most easily lost.

- [ ] **Step 3: Run the check**

Run: `~/.claude/skills/implementation-parity/docs/check.sh 2>&1 | grep plan-and-report || echo "plan-and-report clean"`
Expected: `plan-and-report clean`

---

### Task 5: browser-operation.md

Merges the replaced skill's `ui-interaction-verification.md`, `state-inspection.md`, `snapshot-usage.md`, and `interaction-retry.md` into one file. Source: `~/.claude/.backup-implementation-parity-2026-08-20/references/`.

**Files:**
- Create: `references/browser-operation.md`

**Interfaces:**
- Consumes: lane assignment from SKILL.md step 6.
- Produces: the approach hierarchy and the side-effect verification rule that `prototype-comparison.md` (Task 8) builds on.

- [ ] **Step 1: Run the check to confirm this file is red**

Run: `~/.claude/skills/implementation-parity/docs/check.sh 2>&1 | grep browser-operation`
Expected: `FAIL: references/browser-operation.md: listed in manifest but missing`

- [ ] **Step 2: Write `## Lane assignment` (new content, not ported)**

Prototype on `chrome-devtools-a`, implementation on `chrome-devtools-b`, both on the shared Chrome started by `~/.claude/scripts/shared-chrome.sh`. Include this justification, because a reader who knows `browser-lanes` will otherwise think it is being violated:

> The reason for two lanes is state retention, not parallelism. Tool calls within one session
> serialize regardless. What each entry keeps is its own selected page, so both sides stay where
> they were between comparison items without tab-switching, and neither closes the other's page.
> This is a deliberate reading of `browser-lanes`, not a violation of it: that skill's "when NOT
> to use lanes" covers fanning work out to parallel subagents, and a per-item comparison is
> indeed linear. Here both entries are driven by the one session, with no subagent involved.

Each lane opens its own tab with `new_page` and closes it at the end. The user's own tabs are read-only.

Screenshots are inline by default. `take_screenshot` with `filePath` writes only inside a workspace root, which dirties `git status`; persist an image only when a specific difference needs it as evidence.

- [ ] **Step 3: Port `## Approach hierarchy`**

From the replaced skill's `ui-interaction-verification.md` "Verification Approach" section: state inspection → narrow DOM query → `take_snapshot` → `take_screenshot`, with the rule that the *interaction* may be snapshot-driven while the *outcome* is verified via state whenever the store reflects what is being compared.

Also port its two tables — the action→tool mapping and the expected-result→verification-method mapping — **rewriting every `mcp__chrome-devtools__x` to `mcp__chrome-devtools-<lane>__x`**.

- [ ] **Step 4: Port `## State inspection`**

From `state-inspection.md`, keep in full: the why-state-first rationale, the decision table, the framework/store detection snippet, the Vuex / Pinia / Redux / Zustand access snippets, the act-via-UI-verify-via-state pattern, the fall-back conditions, and the evidence-recording format. The JS snippets contain no MCP tool names and port unchanged.

- [ ] **Step 5: Port `## Snapshot usage`**

From `snapshot-usage.md`, keep: the "don't re-snapshot when uids are still valid" table, the one-snapshot-per-dialog rule, the narrow-query table, the avoid-`verbose` rule, and the decision tree. Rewrite tool prefixes as in Step 3.

- [ ] **Step 6: Port `## Side-effect verification` and `## Retry policy`**

From `interaction-retry.md`, keep: the core rule that a "Successfully" return proves the gesture completed and not that the application accepted it; the `from_uid` / `to_uid` selection rules; the verification fallback ladder; the 3-attempt retry policy with its escalation format; the synthetic `DragEvent` escape hatch with its limitations; and the table of other silently-failing interactions.

Add one line that is specific to this skill: **when comparing timing, a side-effect check that is merely "eventually true" is not enough — the check must distinguish "changed now" from "changed on close", which usually means reading state immediately after the action and again after the closing action.**

- [ ] **Step 7: Verify no bare entries survived the port**

Run: `grep -rn 'mcp__chrome-devtools__' ~/.claude/skills/implementation-parity/references/`
Expected: no output.

- [ ] **Step 8: Run the check**

Run: `~/.claude/skills/implementation-parity/docs/check.sh 2>&1 | grep browser-operation || echo "browser-operation clean"`
Expected: `browser-operation clean`

---

### Task 6: dev-server.md

Ported from `~/.claude/.backup-implementation-parity-2026-08-20/references/dev-server-management.md`.

**Files:**
- Create: `references/dev-server.md`

**Interfaces:**
- Produces: `STARTED_BY_SKILL` (boolean), read by the cleanup step of the plan file.

- [ ] **Step 1: Run the check to confirm this file is red**

Run: `~/.claude/skills/implementation-parity/docs/check.sh 2>&1 | grep dev-server`
Expected: `FAIL: references/dev-server.md: listed in manifest but missing`

- [ ] **Step 2: Port the file under headings `## Protocol`, `## Cleanup`, `## Error cases`**

Keep verbatim: the `curl -s -o /dev/null -w "%{http_code}" http://localhost:8080` existing-server probe; the `STARTED_BY_SKILL` flag; background start via `run_in_background: true`; the 60-second readiness poll loop; and the error-case table.

Two required changes:

1. The MCP availability check becomes lane-aware: call `mcp__chrome-devtools-a__list_pages` and `mcp__chrome-devtools-b__list_pages`, and before either, run `~/.claude/scripts/shared-chrome.sh status` — ask `status`, never diagnose by triggering a tool error.
2. Add a line noting that the default `pnpm serve:dev` and port 8080 are read from the target package's `package.json`, and that in this monorepo two apps both claim 8080, so the port must be confirmed rather than assumed.

- [ ] **Step 3: Run the check**

Run: `~/.claude/skills/implementation-parity/docs/check.sh 2>&1 | grep dev-server || echo "dev-server clean"`
Expected: `dev-server clean`

---

### Task 7: visual-comparison.md

Ported from `~/.claude/.backup-implementation-parity-2026-08-20/references/figma-visual-comparison.md`.

**Files:**
- Create: `references/visual-comparison.md`

**Interfaces:**
- Consumes: a tier-2 baseline from Task 3 (a `figma.com/design/` or `/file/` URL plus node id).
- Produces: differences tagged `[LAYOUT] | [SPACING] | [COLOR] | [TYPOGRAPHY] | [ICON] | [ALIGNMENT] | [MISSING] | [EXTRA]`, consumed by the classification step.

- [ ] **Step 1: Run the check to confirm this file is red**

Run: `~/.claude/skills/implementation-parity/docs/check.sh 2>&1 | grep visual-comparison`
Expected: `FAIL: references/visual-comparison.md: listed in manifest but missing`

- [ ] **Step 2: Port under headings `## Prerequisites`, `## Process`, `## Limitations`**

Keep: the Figma MCP authentication check, the eight comparison dimensions table, the difference-recording format, and the non-pixel-perfect disclaimer that must appear in every visual comparison result.

Two required changes:

1. Screenshot capture uses `mcp__chrome-devtools-b__take_screenshot` (implementation lane) and is inline by default — drop the old `/tmp/verification/<route-slug>.png` file path, which conflicts with the workspace-root-only rule.
2. Drop the old "ask the user whether to enable Figma comparison" HARD-GATE. In this skill the baseline tier is already decided in Task 3's discovery step; asking again would be a second gate for a question already answered.

- [ ] **Step 3: Run the check**

Run: `~/.claude/skills/implementation-parity/docs/check.sh 2>&1 | grep visual-comparison || echo "visual-comparison clean"`
Expected: `visual-comparison clean`

---

### Task 8: prototype-comparison.md

New content. This is the capability the replaced skill did not have.

**Files:**
- Create: `references/prototype-comparison.md`

**Interfaces:**
- Consumes: a tier-1 baseline from Task 3; lane assignment and the approach hierarchy from Task 5.
- Produces: per-item `Verdict` (SAME / DIFFERENT / SKIP) plus, for DIFFERENT, a `dimension` of `state | timing | dispatch`, consumed by the classification step.

- [ ] **Step 1: Run the check to confirm this file is red**

Run: `~/.claude/skills/implementation-parity/docs/check.sh 2>&1 | grep prototype-comparison`
Expected: `FAIL: references/prototype-comparison.md: listed in manifest but missing`

- [ ] **Step 2: Write `## When this applies`**

Tier-1 baselines only: a runnable demo URL or a Figma prototype-mode link. State the motivating case so a reader understands what this file is for:

> ADAT-822: the prototype cleared the device filter at the moment a site checkbox was ticked and
> re-queried immediately; the implementation cleared it only when the menu closed and the value
> was committed. Screenshots of the two are identical. Only operating both sides and observing
> state transitions and request timing surfaces the difference.

- [ ] **Step 3: Write `## Login conflict check`**

Runs before any navigation:

> Cookies and localStorage are browser-wide, not per lane. If the prototype and the
> implementation require different identities, they cannot share a browser — signing into one
> evicts the other. Ask the user up front. If they conflict, compare one side fully, record its
> observations in the plan file, then compare the other; do not interleave.

Also: never change page state to improve an observation. Toggling a debug panel or a feature flag mutates browser-wide storage for every later item. Record the obstruction instead.

- [ ] **Step 4: Write `## Paired action execution`**

The per-item procedure:

```
1. Bring lane a (prototype) and lane b (implementation) to the equivalent starting state.
   Record both starting states in the plan file before acting.
2. Perform the identical action on lane a. Immediately read state. Record.
3. Perform the closing/committing action on lane a (close the menu, blur, submit). Read state
   again. Record.
4. Repeat 2-3 on lane b.
5. Compare the four readings, not two.
```

State why four readings and not two: a difference in *when* a change happens is invisible if each side is read only once, at the end. Both sides may reach the same final state by different routes, and the route is what is being compared.

- [ ] **Step 5: Write `## What counts as a difference`**

Three dimensions, each with how it is observed:

| Dimension | Observed by |
|---|---|
| `state` | The two sides end in different state — store query via `evaluate_script` |
| `timing` | Same end state, different moment — the immediate-vs-after-commit readings from Step 4 differ |
| `dispatch` | One side issues a network request the other does not, or issues it at a different point — `mcp__chrome-devtools-<lane>__list_network_requests` |

Then the rule that keeps the output trustworthy:

> Deliberate-versus-defect is not decided here. Every difference is listed, annotated with
> whether the ticket already records a decision about it. ADAT-822's device-menu scope hint is
> the model: the ticket explicitly places it Out of scope, so it is annotated "known deliberate"
> and kept out of the add candidates. A parity tool that reports deliberate design as defects
> stops being trusted after two runs.

Where the annotation comes from: the ticket's Scope / Out-of-scope sections and any scope decision recorded in comments — the same sources Task 3 already read.

- [ ] **Step 6: Run the check**

Run: `~/.claude/skills/implementation-parity/docs/check.sh 2>&1 | grep prototype-comparison || echo "prototype-comparison clean"`
Expected: `prototype-comparison clean`

---

### Task 9: reconcile-findings.md

**Do not start this task until Task 1 has recorded `PER_COMMENT_SUPPORTED`.** Read `docs/specs/2026-08-20-pending-comment-api-findings.md` first and write the matching path.

**Files:**
- Create: `references/reconcile-findings.md`

**Interfaces:**
- Consumes: differences with dispositions from the classification step; the verbatim backup written by Task 4.
- Produces: the three counts that Task 4's `## Final counts` prints.

- [ ] **Step 1: Run the check to confirm this file is red**

Run: `~/.claude/skills/implementation-parity/docs/check.sh 2>&1 | grep reconcile-findings`
Expected: `FAIL: references/reconcile-findings.md: listed in manifest but missing`

- [ ] **Step 2: Write `## Four dispositions`**

```
Difference exists + nobody raised it     -> Candidate: add
Difference exists + raised, and correct  -> Already covered, do not duplicate
Difference exists + raised, but wrong    -> Candidate: correct
No difference    + someone raised it     -> Candidate: retract (false positive)
```

Note that the fourth row is the half most easily forgotten: not only misdescribed problems, but problems that do not exist.

Reading existing conclusions: own pending review via the path Task 1 established; submitted reviews via `mcp__github__pull_request_read` method `get_review_comments`; a local branch findings file at `docs/context/branch-review-*.md`.

- [ ] **Step 3: Write `## Confirmation gate`**

> Candidates are presented and the user confirms before anything on the PR is touched. This is a
> standing rule in this environment, not a new one: a question is not an instruction, and this
> wait is not skippable.

Presentation format, in zh-TW:

```
原型比對結果（{N} 條差異）

➕ 建議新增（{N} 條）
  1. [file:line] <差異> — 基準：tier {n}, <來源>
❗ 建議修正（{N} 條）
  1. [comment id] 原文說 <X>，實測是 <Y>
🗑️ 建議撤回（{N} 條）
  1. [comment id] 實測兩邊一致，這條不成立
📄 只進報告（{N} 條，錨不到程式行）
  1. <差異>
✅ 已被既有 comment 涵蓋（{N} 條，不重複）

請確認，或調整。
```

- [ ] **Step 4: Write `## Backup first`**

Before any mutation, read every existing pending comment and write it verbatim into the plan file's `## Existing review conclusions (verbatim backup)` section, one fenced block per comment with comment id, path, line, body. Whichever path runs, this is the only safety net. If the backup cannot be written, do not mutate anything.

- [ ] **Step 5: Write `## Landing sites`**

```
Candidate add, anchorable to a diff line   -> new comment in the same pending review
Candidate add, not anchorable              -> plan file only, never the PR
Candidate correct                          -> rewrite that comment
Candidate retract                          -> remove that comment
```

Anchorability test: the target line must fall inside a diff hunk of the PR. Re-derive it from the `@@ +new_start @@` header rather than trusting a remembered number. A difference spanning several files, or one whose subject is code that does not exist, is not anchorable — those go to the plan file.

New comments use `mcp__github__add_comment_to_pending_review` with the anchor in the tool parameters (`path` / `line` / `startLine` / `side`), not restated in the body. The body follows `code-review`'s finding block, which is the sole owner of that format — forward it, do not restate the field names here.

- [ ] **Step 6: Write the mutation mechanism, matching Task 1's finding**

State the tooling constraint either way:

> The GitHub MCP surface exposes `create`, `submit_pending`, `delete_pending`, `resolve_thread`,
> `unresolve_thread`, and `add_comment_to_pending_review`. There is no per-comment delete or edit
> for pending review comments — only deletion of the whole pending review.

If `PER_COMMENT_SUPPORTED = true`, write the primary path with the exact commands verified in Task 1:

```bash
gh api -X PATCH  /repos/{owner}/{repo}/pulls/comments/{COMMENT_ID} -f body='<new body>'
gh api -X DELETE /repos/{owner}/{repo}/pulls/comments/{COMMENT_ID}
```

and the whole-review rebuild as the fallback, marked destructive and requiring a second explicit confirmation.

If `PER_COMMENT_SUPPORTED = false`, write the rebuild as the only path: back up verbatim, `delete_pending`, `create` a fresh pending review, re-add every surviving comment plus the new ones. Mark it destructive, require a second explicit confirmation naming what will be deleted and how many comments will be re-added, and state that a mid-run failure loses the review — which is why the backup in Step 4 exists.

- [ ] **Step 7: Write `## Situations without a pending review` and `## Never submit`**

| State | Behavior |
|---|---|
| Own pending review | Reconcile and write back |
| Submitted review (anyone's) | Read-only cross-check; suggest in the report, the user decides on replies |
| Local branch findings file | Reconcile and write back |
| Nothing | Report only |

`## Never submit` — no `event` parameter on create, no `submit_pending`, no asking whether to submit. Unchanged from the existing rule; being a new skill does not relax it.

- [ ] **Step 8: Run the full check**

Run: `~/.claude/skills/implementation-parity/docs/check.sh`
Expected: `OK: all checks passed`, exit code 0.

---

### Task 10: Dry run, then retire the replaced skill

**Files:**
- Delete: `~/.claude/skills/implementation-verification/` (only after the dry run passes)

- [ ] **Step 1: Confirm the check is green**

Run: `~/.claude/skills/implementation-parity/docs/check.sh`
Expected: `OK: all checks passed`

- [ ] **Step 2: Ask the user for a real case**

Ask which ticket and which PR or branch to dry-run against. A ticket with a tier-1 prototype is the most valuable first case, since that path has no predecessor to inherit behavior from. Wait for an answer — do not pick one.

- [ ] **Step 3: Run the skill end to end**

Exercise every gate in order and record what happened at each:

1. Baseline discovery reaches the parent ticket, not just the ticket itself.
2. The stop condition prints real counts when pointed at a ticket with no baseline (test this deliberately with a ticket you expect to fail).
3. The comparison-item list is presented and waits.
4. The plan file is created and per-item lifecycle is respected — no batch closes.
5. Both lanes are on lettered entries; `~/.claude/scripts/shared-chrome.sh status` was asked, not inferred.
6. The candidate list is presented and waits.
7. The three counts are printed.

- [ ] **Step 4: Fix what the dry run surfaced**

Edit the affected reference files, re-run `docs/check.sh`, and note each fix in the plan file's Differences section so the changes are traceable.

- [ ] **Step 5: Confirm the replacement, then delete**

Verify nothing references the old skill:

```bash
grep -rn 'implementation-verification' ~/.claude --include='*.md' | grep -v '.backup-' | grep -v '/memory/'
```
Expected: no output.

Ask the user to confirm the deletion, then:

```bash
rm -rf ~/.claude/skills/implementation-verification
```

The backup made in Task 2 Step 6 remains at `~/.claude/.backup-implementation-parity-2026-08-20/` as the rollback point.

- [ ] **Step 6: Update the memory index**

One memory file records the old skill's path (`reference_mcp_atlassian_single_site.md`). Update that reference so it does not point at a deleted directory.
