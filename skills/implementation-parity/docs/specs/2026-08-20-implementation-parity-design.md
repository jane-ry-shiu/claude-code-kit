# Implementation Parity — Design

**Date:** 2026-08-20
**Status:** Approved design, not yet implemented
**Replaces:** `~/.claude/skills/implementation-verification` (half-written, no inbound references)

## Problem

Two gaps exist in the current review ecosystem.

**Gap 1 — nothing compares against a runnable prototype.** `implementation-verification`
compares an implementation against static Figma frames or textual acceptance criteria. Some
differences are invisible to both. ADAT-822 is the reference case: the prototype cleared the
device filter *at the moment a site checkbox was ticked* and re-queried immediately, while the
implementation cleared it only when the menu closed and the value was committed. Screenshots of
the two are identical. Only operating both sides and observing state transitions and request
timing surfaces the difference.

**Gap 2 — review conclusions are never checked against the baseline.** `post-review-validation`
runs V1–V4 on pending review comments, but every check is static: line numbers, rule
applicability, severity, formatting. No check ever opens a browser. A finding that is simply
wrong about runtime behavior passes all four. A real difference that no finding mentions is
never noticed.

## Goals

1. Compare an implementation against a baseline (runnable prototype, Figma frame, or written
   spec) by operating the real application.
2. Reconcile the resulting differences against whatever review conclusions already exist —
   adding what was missed, correcting what was stated wrongly, retracting what turned out not to
   be a difference at all.
3. Replace `implementation-verification` entirely.

## Non-goals

- Deciding whether a difference is a defect or a deliberate choice. The skill reports and
  annotates; a human decides.
- Submitting reviews. The existing "never submit" rule holds unchanged.
- Pixel-perfect visual regression.

## Naming

`implementation-parity`. The old name described only the act of verifying, not what it verified
against; the core operation here is baseline × implementation parity. A global search found no
skill referencing `implementation-verification` — the only mention outside its own directory is
one memory file recording a path. Renaming leaves no dangling pointer.

## Baseline tiers

All three are supported. Each difference records which tier produced it, because the strength of
the conclusion differs.

| Tier | Baseline | Method | Detects |
|---|---|---|---|
| 1 | Runnable prototype (demo URL, Figma prototype mode) | Same action performed on both sides | State transitions, **timing**, request dispatch |
| 2 | Figma frame | Operate implementation only, screenshot | Layout, spacing, color, typography, missing/extra elements |
| 3 | Written spec / acceptance criteria | Operate implementation only | Whether observed behavior matches the description |

Timing differences are the reason tier 1 exists. They are detected by inspecting front-end state
and observing network dispatch — not by comparing images.

## File structure

```
implementation-parity/
    SKILL.md                      main flow: find baseline -> scope -> compare -> emit differences
    references/
        baseline-discovery.md     locating a prototype/Figma/spec from Jira; stop condition
        prototype-comparison.md   driving both sides of a runnable prototype (new)
        visual-comparison.md      Figma comparison (ported)
        browser-operation.md      operate, observe, inspect state, retry (four files merged)
        dev-server.md             dev server lifecycle (ported)
        plan-and-report.md        comparison plan file and final report format
        reconcile-findings.md     conditional write-back to pending comments / findings files
```

The old skill's `ui-interaction-verification`, `state-inspection`, `snapshot-usage`, and
`interaction-retry` merge into `browser-operation.md`. They describe four facets of one activity;
keeping them apart forces several loads per run for no benefit.

## Flow

```
1. Resolve inputs (PR / branch / Jira key / direct instruction)
2. Discover baseline           -> not found: STOP and ask
3. Derive comparison items     -> present list, WAIT for user confirmation
4. Write comparison plan file
5. Execute per item (browser)
6. Classify each difference against existing review conclusions
7. Present candidates          -> WAIT for user confirmation
8. Reconcile (conditional)
9. Report three counts
```

## 1. Baseline discovery

### Locating the Jira key

In order: user-supplied -> PR title -> branch name -> commit messages (this monorepo uses
`feat(reseller): [VOR-32711] ...`). None found -> stop condition.

### Where to look inside Jira

Search order, and all of it must be searched before declaring failure:

```
this ticket   description
this ticket   comments
parent/epic   description
parent/epic   comments
              linked Confluence pages
              attachments
```

**The parent levels are not optional.** In ADAT-822 the prototype link lived in the parent
ticket's description and the decision that settled the disputed behavior lived in a parent
comment; the ticket itself carried neither. Reading only the ticket's own description would have
produced a false "no baseline found".

Record, for every baseline located, which level and which comment it came from. Every difference
must be traceable back to a specific source.

### Stop condition

When nothing is found, stop. Do not degrade to guessing. The message must name what was searched
so the user knows where else to look:

```
找不到可比對的基準。已查過：VOR-xxxx 的描述與 N 則留言、parent VOR-yyyy 的描述與留言、
N 個 Confluence 連結、N 個附件。
請提供其中一種：可操作的原型網址、Figma frame 連結、或直接把預期行為寫給我。
```

## 2. Comparison item derivation

**The baseline side is authoritative; the diff is supplementary.** An intersection of the two
would exclude exactly the most valuable category — behavior the spec requires that was never
implemented leaves no trace in the diff.

| Class | Rule |
|---|---|
| Must compare | Covered by the baseline and inside the ticket's stated scope (its Scope / Out-of-scope sections, and any scope decision recorded in comments) — regardless of whether the diff touches it |
| Also compare | Touched by the diff but absent from the baseline — possibly unrequested work |
| Skip | Neither |

Present the derived list and **wait for user confirmation before opening a browser**. The
confirmed list becomes the skeleton of the comparison plan file.

## 3. Execution

### Plan file

`docs/verification-plans/YYYY-MM-DD-HH-mm-<topic>.md`. Per-item status lives here and the file is
the single source of truth.

**The plan file is also the report.** It gains two further sections as the run proceeds — the
verbatim backup of existing pending comments, and the differences with their dispositions. A
separate report file would recreate the same two-ledger problem that disqualified todo mirroring.

Retained from the old skill: one item opens only after the previous one reaches a terminal status;
batch-closing is forbidden; an item whose result cannot be determined is recorded `SKIP`, never
guessed `PASS`.

Dropped from the old skill: mirroring every item into a todo. The plan file already carries the
state; the second ledger only created a synchronization problem.

### Browser lanes

Bind the prototype to entry `a` and the implementation to entry `b`, both on the shared Chrome
(`chrome-devtools-{a,b,c}` entries — never mix stacks; see the `browser-lanes` skill).

**The reason for two lanes is state retention, not parallelism.** Tool calls within one session
serialize regardless. What each entry keeps is its own selected page, so both sides stay where
they were between comparison items without tab-switching, and neither closes the other's page.

This is a deliberate reading of `browser-lanes`, not a violation of it. That skill's "when NOT to
use lanes" covers fanning work out to parallel subagents, and a per-item comparison is indeed
linear. Here both entries are driven by the one session; the entry is being used for what it
uniquely provides — remembering which page is selected — with no subagent involved. If a run has
many independent comparison items and dispatch is worth it, `browser-lanes` governs unchanged.

**Login conflict check, before starting:** cookies and localStorage are browser-wide. If the
prototype and the implementation require different identities, they cannot share a browser —
signing into one evicts the other. Ask up front; if they conflict, compare one side fully, then
the other.

Screenshots are inline by default. `filePath` writes only inside a workspace root, which dirties
`git status`; persist an image only when a specific difference needs it as evidence.

### Per-tier method

Tier 1 — perform the identical action sequence on both sides. Compare resulting state, the
*moment* the state changes, and whether a request was dispatched. Read state through the app's
store or a narrow DOM query; observe network activity for dispatch timing.

Tier 2 — operate the implementation, capture, compare against the frame on layout, spacing,
color, typography, icons, alignment, missing and extra elements. AI comparison is not
pixel-perfect; sub-2px differences are not reliably detected and the report says so.

Tier 3 — operate the implementation and check the observed behavior against the description.

## 4. Difference classification

Every difference is cross-checked against the review conclusions that already exist. Four
dispositions:

| Observation | Existing conclusion | Disposition |
|---|---|---|
| Difference exists | Nobody raised it | Candidate: add |
| Difference exists | Raised, and correct | Already covered — do not duplicate |
| Difference exists | Raised, but wrong | Candidate: correct |
| No difference | Someone raised it | Candidate: retract (false positive) |

The fourth row is the other half of "the pending comment is wrong": not only misdescribed
problems, but problems that do not exist.

**Deliberate-versus-defect is not decided here.** Every difference is listed, annotated with
whether the ticket already records a decision about it. ADAT-822's device-menu scope hint is the
model: the ticket explicitly places it Out of scope, so it is annotated "known deliberate" and
kept out of the add candidates. A parity tool that reports deliberate design as defects stops
being trusted after two runs.

## 5. Reconciliation (conditional)

### Confirmation gate

Candidates are presented and **the user confirms before anything on the PR is touched**. This is
an existing standing rule in this environment, not a new one: a question is not an instruction,
and this wait is not skippable.

### Backup first

Before any mutation, read every existing pending comment and store it verbatim in the report
file. Whichever path runs, this backup is the only safety net.

### Landing sites

```
Candidate add, anchorable to a diff line   -> new comment in the same pending review
Candidate add, not anchorable              -> local report only, never the PR
Candidate correct                          -> rewrite that comment
Candidate retract                          -> remove that comment
```

### Tooling constraint (verified 2026-08-20)

The GitHub MCP surface exposes `create`, `submit_pending`, `delete_pending`, `resolve_thread`,
`unresolve_thread`, and `add_comment_to_pending_review`. **There is no per-comment delete or edit
for pending review comments** — only deletion of the whole pending review. Note that
`post-review-validation` V1/V3/V4 already instruct "delete comment, recreate", which the MCP
tools alone cannot perform; that inconsistency predates this design.

Two-layer approach:

- **Preferred** — per-comment delete/edit through `gh api` REST endpoints.
  **Unverified:** whether those endpoints apply to comments in an unsubmitted review, and whether
  pending comments can be listed at all. Verifying this is the first implementation task; the path
  must not be written until it is confirmed.
- **Fallback** — delete the whole pending review and rebuild it from the merged list. This is
  destructive: a mid-run failure loses the user's review. Use only when the REST path is confirmed
  unavailable, and ask the user again before doing it.

### Situations without a pending review

Standalone operation is the default, so all four states must work:

| State | Behavior |
|---|---|
| Own pending review | Reconcile and write back |
| Submitted review (anyone's) | Read-only cross-check; suggest in report, user decides on replies |
| Local branch findings file | Reconcile and write back |
| Nothing | Report only |

### Never submit

Unchanged from the existing rule. No `event` parameter, no `submit_pending`, no offering to
submit.

## Final report

Three counts, always stated:

1. Landed on the PR
2. Report-only (not anchorable)
3. Recommended for manual handling

The second is the one most easily lost, and "specified but never implemented" — the most valuable
category this skill produces — lands there by construction.

## Replacement plan

`implementation-verification` is deleted only after `implementation-parity` has been exercised on
a real case. Nothing references the old skill, so removal is a single directory delete.

Note: `~/.claude` is not a git repository. This design document cannot be committed; rollback for
any edit to existing skills uses the established `.backup-<topic>-<date>/` convention.

## Open items carried into implementation

1. Verify REST behavior for pending review comments (list / delete / edit). Blocks the preferred
   reconciliation path.
2. Confirm whether `pull_request_read` `get_review_comments` returns pending comments or only
   submitted threads.
