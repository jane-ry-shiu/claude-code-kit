# Plan and Report

Write and maintain the single working document for a parity run: the comparison plan doubles as
the run's report. This reference is loaded twice — at flow step 4, to write the plan, and again
at flow step 9, to print the final counts.

## Plan file location

Path: `docs/verification-plans/YYYY-MM-DD-HH-mm-<topic>.md`, created with `mkdir -p` before the
first write.

**This one file is also the report.** A separate report file would recreate the two-ledger problem
that disqualified todo mirroring in the replaced skill: two places tracking the same state drift
apart, and the drift is only noticed once cleanup no longer matches the log. Item state, the
pending-comment backup, and the difference dispositions all accumulate into this same file as the
run proceeds — there is no second document to keep in sync with it.

The file lives inside the repo and will show up in `git status`. That is accepted, not
accidental — do not "fix" this later by moving the file to an untracked location.

Write the plan skeleton below in full before execution starts. The `<...>` markers are template
slots, not placeholder markers — reproduce them verbatim in this reference. When writing an actual
run's plan file from this skeleton, replace each slot with the real value from the confirmed
comparison-item list (flow step 3); duplicate the Item block once per item, incrementing the
number.

```markdown
# Parity Run: <topic>

**Date:** YYYY-MM-DD HH:mm
**Jira:** <KEY> (+ parent <KEY> if used)
**Baselines:** tier <n> — <source level / comment id> — <url or quoted text>
**Scope decisions:** <Scope / Out-of-scope item, or scope-deciding comment + id — one line each, or `none recorded`>
**Target:** <dev server url or deployed env>
**Lanes:** prototype=chrome-devtools-<a>, implementation=chrome-devtools-<b>

## Prerequisites

- [ ] Account/credentials confirmed: <user / login URL>
- [ ] Login conflict resolved: <shared browser OK | must run sequentially>
- [ ] Required test data: <devices, sites, fixtures>
- [ ] Baseline reachable AND operable: <one interaction confirmed on the named instance | Figma authenticated>

## State reading

- Baseline side: <how this app's state is read — the selector or store query, and what a set value
  looks like versus an empty one>
- Implementation side: <same>
- Traps: <controls whose clickable target is not the obvious element>

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

### Filling the `**Baselines:**` line

Render the three fields recorded during baseline discovery (flow step 2, see
`references/baseline-discovery.md`): `tier` (1, 2, or 3), `source` (which level it came from —
ticket description, ticket comment, parent description, parent comment, Confluence page,
attachment — plus the comment id when it came from a comment), and `location` (the URL, or the
quoted text itself for a tier-3 baseline with no URL). When more than one baseline was located,
render one `**Baselines:**` line per baseline — do not collapse multiple baselines into one line.

### Filling the `**Scope decisions:**` line

Render the run-level `scope decisions` field recorded during the same step (see
`references/baseline-discovery.md`, `### Recording`): the ticket's Scope and Out-of-scope sections
and any comment recording a scope decision, one line per item, each naming the level it came from
and the comment id where there is one. Unlike `**Baselines:**`, this is one field for the whole run,
not one per baseline — several baselines share a single set of scope decisions.

If baseline discovery recorded `none recorded`, write `none recorded` here too rather than deleting
the line. The line's absence would be indistinguishable from a run where nobody looked, and flow
step 6 reads this line to decide whether a difference is a documented choice — a distinction it
cannot make from a missing line.

### Filling `## State reading`, and seeding it from the last run

This section is the one part of the plan file written for the NEXT run, not this one. Reading a
value out of an app takes several probing calls the first time — which element carries the count,
whether a set dimension is marked by a class or by an icon glyph, which nested element actually
receives the click. That work is identical on every later run against the same app, and is otherwise
re-derived from scratch every time.

Before writing a new plan, list `docs/verification-plans/` and open the most recent plan file for
the same application. If it has a `## State reading` section, copy it forward and correct what has
changed; if it does not, that run predates this rule and the section starts empty. Fill it as the
run proceeds, not at the end — the moment a read technique works is the moment it is known.

Record traps as explicitly as the techniques. Measured examples from the first run: a chip's clear
button is a nested `role=button` inside its trailing container, and clicking the container opens the
popover instead of clearing; and a menu that caps its list at 50 rows makes "the list did not change"
indistinguishable from "the list was not narrowed".

## Per-item lifecycle

Carried over from the replaced skill, with the todo mirroring removed: the replaced skill tracked
item state in both a TodoWrite list and the plan file, and the two fell out of sync. From this
skill onward, **the plan file alone carries item state** — there is no todo list to keep in step
with it.

- An item opens only after the previous item has a terminal `Verdict` of SAME, DIFFERENT, or SKIP —
  with one named exception, `### The identity-conflict exception` below.
- Opening writes `Status: In Progress` and `Started:` before any browser action for that item.
- `Started` and `Ended` are written in separate edits, so the file's history reflects the real
  execution span.
- Closing writes `Ended`, both `observed` fields, `Verdict`, and `Evidence`.
- Batch-closing several items in one turn is forbidden.
- An item whose result cannot be determined is `SKIP`, with `Baseline observed:` recording *why*
  it could not be determined. Never guessed SAME or DIFFERENT.

### The identity-conflict exception

One situation cannot satisfy "an item opens only after the previous one is terminal": when the
prototype and the implementation authenticate as different identities, they cannot be observed in
one browser session — signing into either evicts the other — so no item can reach a terminal
`Verdict` until the identity has been switched. `references/prototype-comparison.md`'s
`## When identities conflict` is the procedure; this is the item-state half of the same rule, and
the two are written to be read together.

It is an exception, not a suspension. The guarantee the rule provides — that no item is left in an
undefined state while another is worked on — is replaced rather than dropped:

- Pass 1 closes each item into `Status: Pass 1 complete`, an explicit non-terminal state, with the
  baseline side's readings written, before the next item opens. Still one item at a time, in order.
- `Pass 1 complete` is the only non-terminal state an item may be closed into, and only on this
  path. An item sitting at `In Progress` is an unfinished item, never a pass-1 item.
- Pass 2 reopens items in the same order: `Status` goes back to `In Progress`, and the item's
  existing `Started:` stands — no second `Started:` is written, so the span the file records covers
  both passes and the identity swap between them. Closing writes `Ended`, both `observed` fields,
  `Verdict`, and `Evidence`. Only then is the item terminal.
- Batch-closing stays forbidden in both passes. This exception changes how many passes an item needs
  to reach a terminal verdict, not how many items may be written in one turn.

The alternative — switching identity per item so every item stays single-pass — was rejected: it
costs a full logout/login cycle per item and makes shared browser state the thing most handled
during the run, which is where state errors come from in the first place.

### Recording a `DIFFERENT` verdict's dimension

When item execution (flow step 6) closes an item with `Verdict: DIFFERENT`, also record the
dimension it falls on. The skeleton above has no separate field for this — append it to the
`Verdict:` line itself, for example `Verdict: DIFFERENT (timing)`.

The dimension is drawn from the item's own `Compare on:` set, and which value applies depends on
the item's `Tier:`:

- tier 1 → `state`, `timing`, or `dispatch`
- tier 2 → `appearance`
- tier 3 → `description`

`request dispatch` in `Compare on:` is written `dispatch` in the parenthetical. This dimension is
what flow step 7 reads when classifying the difference against existing review conclusions.

## Pending comment backup

Before any mutation of a PR — before a single comment is added, resolved, or a review is
created — every existing pending review comment is read and stored verbatim under
`## Existing review conclusions (verbatim backup)`, one fenced block per comment, carrying that
comment's id, path, line, and body, for example:

```
id: <comment id>
path: <file path>
line: <line number, or `null` — a pending comment reports none>
position: <diff position — the anchor that IS populated while the review is pending>
commit_id: <the commit the position was computed against>
<body, verbatim>
```

`position` and `commit_id` are in this block because of a measured API behavior, not for
completeness: while a review is still pending, GitHub returns `line`, `side`, `start_line` and
`subject_type` as `null` and carries the anchor only in `position` / `original_position` (verified
against a live PR). Re-adding a
comment, however, takes a **line**, not a position. A backup recording only `line` would therefore
read as complete and be unreplayable — restoring includes converting the recorded `position` back
to a line against `commit_id`'s patch hunks.

Whichever reconciliation path runs afterward (flow step 8, see
`references/reconcile-findings.md`), this backup is the only safety net: if a mutation goes wrong,
this section is what makes the original comment recoverable.

## Final counts

The closing message (flow step 9) does not state counts alone. **Every difference is named next to
where it landed**, with the identifier needed to find it, in this exact template:

```
比對完成。

已進 pending review（只有你看得到，要你按 submit 對方才讀得到）：{N} 條
  1. <差異一句話> → comment {id}，{檔名}:{行}
已送出 PR 公開留言（PR 上所有人現在就看得到）：{N} 條
  1. <差異一句話> → 留言 {id}
已被既有 comment 涵蓋，未重複張貼：{N} 條
  1. <差異一句話> → 已在 {comment {id} | 留言 {id} | 本機 findings 檔}
只在報告裡（錨不到程式行，未上 PR）：{N} 條
  1. <差異一句話>
建議你手動處理（這個方法答不了）：{N} 條
  1. <一句話，說明為什麼答不了>

報告：<plan file path>
```

Omit a bucket entirely when its count is zero — an empty heading reads as a category that was
considered and came back clean, which is a different claim.

**Every `DIFFERENT` verdict in the plan file appears in exactly one bucket.** Check that before
sending: count the `Verdict: DIFFERENT` lines, count the entries above, and make the two match. A
difference that reached no destination is the failure this template exists to prevent, and a
difference listed twice overstates what was delivered.

The `已被既有 comment 涵蓋` bucket exists because that check is otherwise unsatisfiable. A real
difference whose disposition is "already covered" is deliberately NOT written anywhere new — that is
the correct outcome, not a gap — but it is still a `Verdict: DIFFERENT` in the plan file. Without a
bucket for it, a re-run against a PR that already carries the findings reports fewer entries than it
has differences and looks like it lost them. Name where each one was already raised, so the reader
can see the run agreed with the existing comment rather than missing it.

The two PR buckets are separated because they are separated in reality, not for tidiness. A pending
comment is invisible to everyone but the reader of this message; a conversation comment is already
in front of the PR author. Merging them into one "上了 PR" number is what forced a real user to ask
three follow-up questions — "有更新到 PR 上嗎", "DIFFERENT 的部分有進 pending comment 嗎", "公開是指
哪裡" — none of which the message should have left open. Naming which finding went to which id
answers all three before they are asked.

The third bucket matters more than its position suggests: "specified but never implemented" lands
there by construction — it has no diff line to anchor to — and it is the category most easily lost
if this template is not followed.
