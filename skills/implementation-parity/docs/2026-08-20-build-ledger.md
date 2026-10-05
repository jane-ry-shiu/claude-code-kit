# SDD ledger — plan: ~/.claude/skills/implementation-parity/docs/plans/2026-08-20-implementation-parity.md

Spec: ~/.claude/skills/implementation-parity/docs/specs/2026-08-20-implementation-parity-design.md (read, reachable)

## Setup rulings

Ruling: no git worktree, no commits, no review-package script — `~/.claude` is not a git
repository (`git rev-parse` fails). Adapted: workspace is this scratchpad dir; `task-brief` is
used with an explicit OUTFILE so it bypasses `sdd-workspace`; the reviewer's "diff" is the list
of files the task created, passed as paths. Cost if wrong: reviewers see whole files instead of
diffs, which is strictly more context, not less — no correctness risk. Rollback for the one
destructive step (Task 10) is the backup dir made in Task 2 Step 6.

Ruling: Task 1 is deferred, not skipped. It needs the user to name a PR (it creates and deletes
a pending review on a live PR — a side effect outside the workspace). Tasks 2-8 have no
dependency on it; only Task 9 consumes PER_COMMENT_SUPPORTED. Execution order is therefore
2,3,4,5,6,7,8,1,9,10. Cost if wrong: none to Tasks 2-8; if the user never supplies a PR, Task 9
must be written for the destructive-rebuild-only path and Task 10's dry run is the first real
test of it.

## Pre-flight conflict scan

Cross-task pairs sharing a file or interface:

| A -> B | A produces | B consumes | Found |
|---|---|---|---|
| 2 -> 3..9 | manifest.txt rows + check.sh + SKILL.md link table | each file must exist, be linked from SKILL.md, carry its manifest headings | clean — all 29 manifest headings verified present in the tasks that write them (scripted check) |
| 2 -> 5,6,7 | backup dir .backup-implementation-parity-2026-08-20 | port source for the four merged + two ported references | clean — port sources point at the backup, not the original, so Task 10's delete cannot break them |
| 2 -> 10 | same backup dir | rollback point after deletion | clean — same path string in both (5 occurrences, consistent) |
| 1 -> 9 | PER_COMMENT_SUPPORTED | selects primary vs only path for mutation | clean — 5 occurrences, produced once, consumed once, both branches written |
| 3 -> 4,7,8 | baseline tier + source | plan file header, visual comparison input, prototype comparison gate | clean |
| 4 -> 8,9 | plan skeleton incl. "## Existing review conclusions (verbatim backup)" and "## Differences" | Task 8 writes execution logs, Task 9 writes the backup | clean — both target sections exist in Task 4's skeleton |
| 5 -> 8 | approach hierarchy + side-effect verification rule | paired action execution builds on it | clean |

Per-task self-consistency:

| Task | Own text agrees with itself? |
|---|---|
| 1 | yes — probe creates, probes, and cleans up unconditionally; Step 6 verifies nothing left |
| 2 | yes — check.sh was executed against a scaffold (5 scenarios: missing file / missing heading / all green / orphan / bare-entry+placeholder) before the plan was finalized |
| 3 | yes |
| 4 | yes |
| 5 | yes — Step 7 grep is the guard for the entry-rewrite mandated in Steps 3 and 5 |
| 6 | yes |
| 7 | yes — dropping the old Figma opt-in gate does not collide with SKILL.md's 4-rule HARD-GATE, which contains no Figma rule |
| 8 | yes |
| 9 | yes — both PER_COMMENT_SUPPORTED branches are specified |
| 10 | yes — deletion is gated on dry run + explicit user confirmation |

No conflict required a ruling. Two rulings above are setup adaptations, not plan defects.

## Task log

Ruling: the Task 2 backup was relocated from `~/.claude/skills/.backup-implementation-parity-2026-08-20/`
to `~/.claude/.backup-implementation-parity-2026-08-20/`. Evidence: the harness registered the
backup as a callable skill this session, because it contains a whole skill including SKILL.md and
sat inside the skills directory. The established `.backup-*` convention is not at fault — the
existing `.backup-finding-layout-2026-07-30` contains 0 SKILL.md files (it backed up reference
files only) and never registered. Plan Tasks 5/6/7/10 updated (5 occurrences) and briefs
re-extracted. Cost if wrong: the backup sits one directory higher than the convention; rollback
for Task 10 is unaffected.

Ruling: todo mirroring is skipped; this ledger is the only progress record. The skill asks for a
todo per task, but this very plan removes todo mirroring from the skill it builds, for the stated
reason that two ledgers drift. Cost if wrong: progress is not visible in the CLI todo panel
between messages.

Ruling: the Task 2 review and the Task 3 implementer run concurrently. They touch disjoint files
(the reviewer is read-only; Task 3 creates references/baseline-discovery.md, which SKILL.md
already links and the manifest already lists, both verified byte-identical to the brief). Cost if
wrong: if the Task 2 review demands SKILL.md changes, Task 3's file is unaffected — only SKILL.md
would be re-edited.

Task 2: complete (files SKILL.md + docs/check.sh + docs/manifest.txt; check.sh red at Step 3 and
Step 5 exactly as predicted, now red on precisely the 7 unwritten references; review dispatched)

Ruling: accepted Task 3's unbriefed addition — when no Jira key resolves at all, the stop message
says so plainly instead of printing a fabricated zero-count search summary. It follows directly
from the brief's rule that the counts must be real counts from the search that ran. Cost if
wrong: one extra branch in the stop condition.

Task 3: complete pending review (references/baseline-discovery.md written, manifest row green)

Ruling: plan defect found by Task 4 — the plan-file skeleton it was told to transcribe verbatim
has no field for the `state | timing | dispatch` dimension that Task 8's interface block says it
produces. Accepted the implementer's resolution: keep the skeleton verbatim and append the
dimension inline on the Verdict line (`Verdict: DIFFERENT (timing)`). This ruling is carried into
Task 8's dispatch so both ends agree. Cost if wrong: the dimension is a parenthetical rather than
its own field, so a machine parser would need to read it off the Verdict line.

Task 4: complete pending review (references/plan-and-report.md written, manifest row green)

Task 2 review: Approved with 2 Important. Verified both myself before acting.
  (a) Flow digraph (SKILL.md) is misnumbered against the Execution step table: the digraph has no
      "Start dev server" node and steps 5-9 are shifted by one. Confirmed by reading both. The
      Execution table is canonical (the brief quotes it verbatim). -> fix round 1.
  (b) task-2-brief.md still carried the pre-relocation backup path. Confirmed: the PLAN was
      already correct (line 269), the BRIEF was stale because I re-extracted only briefs 5/6/7/10
      after the relocation ruling. Controller-side fix: brief re-extracted. Not an implementer
      defect.
Task 2 review ⚠️ items resolved by controller: both the Baseline tiers table and the Comparison
item derivation table in SKILL.md are byte-identical to the spec's corresponding tables (diffed
directly). No gap.

Task 3 review: Needs fixes. 1 Important, verified verbatim: baseline-discovery.md says
"go directly to `## Stop condition` with all counts at zero" in the Locating-the-Jira-key section,
and "state that plainly instead of printing a search count of zero for a key that was never looked
up" in the Stop-condition section. Same scenario, two incompatible instructions. -> fix round 1.

Ruling: Task 2's and Task 3's fix rounds run concurrently with each other and with the Task 5
implementer. The skill forbids parallel implementers because of git conflicts; there is no git
here and the three touch disjoint files (SKILL.md, references/baseline-discovery.md,
references/browser-operation.md). Cost if wrong: none identified — no shared file, no shared index.

Task 2: fix round 1/5 dispatched and returned (Flow digraph renumbered to match the Execution
table; controller confirmed the 9 nodes now read 1 Resolve inputs / 2 Discover baseline / 3 Derive
comparison items / 4 Write comparison plan / 5 Start dev server / 6 Execute items / 7 Classify
differences / 8 Reconcile / 9 Report counts, with "Present candidates" no longer a numbered node).
Scoped re-review dispatched.

Task 3: fix round 1/5 dispatched and returned (contradictory "all counts at zero" removed; concrete
zh-TW no-key-resolved template added). Scoped re-review dispatched.

Task 2: fix round 1/5 (1 addressed, 0 open — Flow digraph now maps one-to-one onto the Execution
table node by node; both confirmation gates still diamonds; dot syntax and edge connectivity
checked by inspection, graphviz not installed so no render check available).
Task 2: complete (files SKILL.md + docs/check.sh + docs/manifest.txt, review clean)

Task 3: fix round 1/5 (2 addressed, 0 open — contradictory zero-count instruction removed;
concrete zh-TW no-key-resolved template added, parallel in structure to the found-key one and
needing no runtime counts at all. Re-reviewer's full-file sweep found no third inconsistency, and
confirmed the two "first match vs exhaustive" statements govern different questions and are not in
tension).
Task 3: minor (deferred): baseline-discovery.md:26 forward-references "the found-key template" by a
name the document never assigns; the Stop-condition section calls it "the template above".
Readability only, resolves on reading. -> hand to the final whole-branch review for triage.
Task 3: complete (references/baseline-discovery.md, review clean, 1 minor deferred)

Ruling: Tasks 6 and 7 are batched into one dispatch and will share one review. They are the same
shape — port one file from the backup, rename its headings to the manifest's, make two specified
changes — both small, both writing disjoint files, neither depending on the other. The skill's
batching rule covers exactly this. Cost if wrong: one review covers two files, so a defect in one
gets slightly less attention than a dedicated seat would give.

Task 5: complete pending review (references/browser-operation.md, 580 lines, 16 bare
mcp__chrome-devtools__ prefixes rewritten to lettered lanes, manifest row green). Implementer
concern: kept interaction-retry's anti-pattern table whole under `## Side-effect verification`
instead of splitting rows across `## Retry policy` — passed to the reviewer to judge.

Task 4 review: Needs fixes. 2 Important + 1 Minor. Rulings made before dispatching the fix:

Ruling: Task 4's undisclosed multi-line `**Baselines:**` addition is KEPT. The design document is
explicit that several baselines can coexist (a tier-1 prototype for behavior alongside a tier-2
frame for appearance), so a single-line header cannot render the real case. The defect is the
non-disclosure, not the rule. Cost if wrong: the plan header grows a line per baseline.

Ruling: the DIFFERENT-dimension parenthetical is scoped by tier, drawn from the item's own
`Compare on:` set — tier 1 -> state | timing | dispatch; tier 2 -> appearance; tier 3 ->
description; `request dispatch` is written `dispatch` in the parenthetical. Reviewer's finding was
verified against SKILL.md's tiers table and the skeleton's five-value `Compare on:` field: an
agent closing a tier-2 item as DIFFERENT previously had no defined value and would invent one.
Task 8 was already dispatched with the tier-1 form only, and Task 8 handles tier 1 exclusively, so
this extension does not conflict with it. Cost if wrong: tier-2/3 parentheticals carry a single
coarse value rather than the finer tag vocabulary visual comparison produces.

Task 4 review ⚠️ resolved by controller: no downstream task depends on the `**Baselines:**`
rendering; the dimension convention is the one that mattered and is now defined for all three
tiers.

Task 4: fix round 1/5 dispatched (scope the dimension convention by tier; correct the report's
completeness claim; one-word ambiguity fix).

Tasks 6+7 (batched): complete pending review (references/dev-server.md and
references/visual-comparison.md written, both manifest rows green, no bare tool prefixes anywhere
in references/). Two implementer concerns passed to the reviewer: (a) dev-server's error table
appends 3 rows rather than editing the 3 original rows in place; (b) my brief was wrong that the
Figma opt-in gate lived in figma-visual-comparison.md — the implementer grepped the whole backup
tree and found it lived only in the replaced skill's top-level SKILL.md, so the "drop it"
instruction was a no-op; it added explicit non-gate text rather than silently omitting something
that was never there. That correction is right — I confirmed the gate's location when reading the
replaced skill during design.

USER INPUT 2026-08-20: Task 1 is to use the ADAT-822 PR, but that PR is still being implemented —
the user said to wait. Task 1 therefore stays deferred, and Task 9 stays blocked behind it.

Ruling: Task 9 will NOT be written speculatively while Task 1 is pending. Only the mutation
mechanism strictly depends on PER_COMMENT_SUPPORTED, but the surrounding sections' wording depends
on it too — "rewrite that comment" and "remove that comment" under Landing sites mean different
operations depending on whether per-comment edit/delete works at all. Writing 5/6 of the file now
would produce text that has to be re-argued rather than merely extended. The plan's own gate
("do not start until Task 1 has recorded PER_COMMENT_SUPPORTED") is honoured. Cost if wrong: one
file's worth of work waits for a PR that does not exist yet. Execution therefore pauses after
Task 8's review closes; Tasks 1, 9, 10 resume when the user says the ADAT-822 PR is up.

Task 5: complete (references/browser-operation.md, review clean — reviewer independently counted
the 16 bare-prefix rewrites from the sources and verified every source's material landed,
table row by table row; 19 cross-references all resolve).
Task 5: minor (deferred): browser-operation.md:527-536 two retry-discipline rows sit in the
anti-pattern table under `## Side-effect verification` rather than under `## Retry policy`.
Reviewer judged it non-functional (the whole file loads at once, never one subsection) — a
skim-discoverability nit only. -> final review triage.

Task 4: fix round 1/5 returned (dimension convention scoped by tier; completeness claim corrected;
wording fix). Re-review dispatched.

Task 8: complete pending review (references/prototype-comparison.md, 159 lines).
DONE_WITH_CONCERNS — see the SKILL.md annotation-ownership ruling below.

Ruling: SKILL.md's step 7 and prototype-comparison's step 6 both read as owning the
"is this difference already recorded as deliberate?" annotation. Task 8 resolved it as a pipeline
(step 6 produces the annotation, step 7 consumes it) and wrote its own file to say so explicitly,
but flagged that SKILL.md itself stays ambiguous and is outside its ownership. I am adopting that
reading and having SKILL.md tightened to match: annotation is produced where the difference is
observed, because that is where the ticket's scope sources are already in hand from discovery.
Cost if wrong: one sentence in SKILL.md moves the responsibility a step later.

Tasks 6+7 review: Needs fixes. 3 Important, all in dev-server.md, all the same root cause — the
port-ownership change was appended rather than integrated:
  (a) Step 1's "Returns 200 -> server already running, use it directly" is unconditional and is
      undercut by the very next paragraph's ownership caveat, with no mechanism given for
      confirming ownership.
  (b) An error-table row instructs starting "on its own port" with no step anywhere describing how
      to pick or pass an alternate port; also beyond what the brief asked for and undisclosed.
  (c) A stale "Chrome DevTools MCP unavailable" row survives from the pre-lane world, using
      vocabulary the rewritten Section 4 never uses, and could lead an agent to diagnose by
      triggering a tool error — which the same file explicitly forbids.
visual-comparison.md had no comparable issue; the reviewer independently confirmed the Figma-gate
correction was right and that the replacement text does necessary work (the source's "user must
provide a Figma frame URL" prerequisite would have conflicted with the discovery-driven flow).

PAUSED by user 2026-08-20 ("麻煩先暫停"). No new work dispatched from this point.
In flight at the moment of the pause, allowed to finish rather than killed (two are read-only
reviews; the third is a fix mid-edit and killing it could leave a file half-written):
  - Task 4 re-review (fix round 1 verification)
  - Task 8 review
  - Tasks 6+7 fix round 1
Task 2: fix round 2/5 returned (SKILL.md step 7 reworded to consume the step-6 annotation rather
than produce it). Task 2 remains complete.
State at pause: SKILL.md + docs/check.sh + docs/manifest.txt written; 6 of 7 reference files
written; check.sh red on references/reconcile-findings.md only, which is Task 9 and is blocked on
Task 1, which is blocked on the ADAT-822 PR not existing yet.
Resume point: read this ledger's Task log, take the three in-flight results, then Tasks 1, 9, 10.

Task 4: fix round 1/5 (3 addressed, 0 open — dimension convention now covers all three tiers with
the `request dispatch` -> `dispatch` normalization stated, tier-1 form unchanged so the sibling
task's dispatched form still matches; report's completeness claim corrected; wording fixed).
Re-reviewer diffed the verbatim plan skeleton byte-for-byte against the brief (1569 bytes both
sides, identical) and found no new internal contradiction.
Task 4: complete (references/plan-and-report.md, review clean)
Still in flight at pause: Task 8 review, Tasks 6+7 fix round 1.

Tasks 6+7: fix round 1/5 returned (3 Important + 2 Minor fixed; implementer swept dev-server.md
for further same-situation-two-ways pairs and found none new). NOT yet re-reviewed — the scoped
re-review is owed and must be dispatched on resume before these two can be marked complete.

Ruling (recorded now, dispatch owed on resume): the implementer escalated a real tension rather
than fixing it unilaterally — the intro now says the port is user-overridable, but the curl probe
and the 60-second poll loop still hardcode `localhost:8080`, because the brief mandated those two
code blocks stay verbatim. My ruling: the verbatim mandate was aimed at stopping the commands
being summarized into prose, not at freezing the literal port. Both blocks should take the port
from a variable resolved in the step that reads the target package's package.json. The escalation
was the correct call — it needed a scope decision, not a unilateral edit. Cost if wrong: two code
blocks diverge from the replaced skill's originals by one substitution each.
Owed on resume, in order: (1) dispatch the Tasks 6+7 port-parameterization fix, (2) its scoped
re-review, (3) take the Task 8 review result, then Tasks 1, 9, 10.

Task 8 review: Needs fixes. 1 Important, 1 Minor. Everything the brief required was verified
present and correct — four headings, the gate actually routing tier 2/3 to the right files, the
ADAT-822 detail including the load-bearing "screenshots of the two are identical", the login
conflict reason and fallback, the five steps, the four-readings reasoning (built out further than
the brief asked, using ADAT-822 as the counter-example), the three-dimension table, the exact
`Verdict: DIFFERENT (timing)` form, and the deliberate-versus-defect hard rule with its
justification and annotation source. All cross-references resolve.

The Important finding is a genuine cross-file contradiction, introduced by an unbriefed subsection
the implementer added to resolve a different tension it spotted:
  `prototype-comparison.md`'s `### When identities conflict` runs steps 1-3 for EVERY item against
  lane a first, for the whole run, then switches identity and does lane b. That leaves every item
  open with no terminal Verdict until pass 2. `plan-and-report.md` forbids exactly this: an item
  opens only after the previous one reaches a terminal Verdict, and batch-closing is forbidden.
  The implementer's report described the new subsection but never noticed it collided with the
  sibling file — the same "addition not disclosed as changing an existing rule" pattern that has
  now appeared in four of this plan's tasks.

Ruling (recorded now, dispatch owed on resume): take the explicit-exception route, not the
switch-identity-per-item route. Per-item identity switching would mean a full logout/login cycle
per comparison item, which is slow and is itself a source of state errors — the cure would be
worse than the disease. Instead: name it an exception in BOTH files, with its reason, and replace
the guarantee it removes rather than simply suspending it. Concretely — pass 1 closes each item
into an explicit non-terminal state (its lane-a readings written, e.g. `Status: Pass 1 complete`)
rather than leaving it `In Progress` indefinitely; pass 2 revisits items in the same order and
writes the terminal Verdict. `plan-and-report.md` must acknowledge this state and this exception
so the two files stop contradicting each other. Cost if wrong: one extra item state exists solely
for the identity-conflict path, and two files must be edited in step.

Task 8 review ⚠️ resolved by controller: the reviewer could not confirm (its scope forbade
crawling) that `baseline-discovery.md` really reads the ticket's Scope / Out-of-scope sections, on
which prototype-comparison's annotation-source claim depends. Checked directly — see the grep
output recorded alongside this entry in the session.

Owed on resume, in order: (1) Tasks 6+7 port-parameterization fix + its scoped re-review,
(2) Task 8 fix round 1 (the identities-conflict exception, touching BOTH prototype-comparison.md
and plan-and-report.md) + its scoped re-review, (3) Tasks 1, 9, 10.

CORRECTION to the entry immediately above: I recorded Task 8's ⚠️ as "resolved by controller"
before reading the grep output. It is NOT resolved — it is a real gap, and I am the source of it.

`baseline-discovery.md` never reads the ticket's Scope / Out-of-scope sections. The only "scope"
string in the file is the `<scope>` token of the commit-message format, which is unrelated. What
that file reads (description, comments, parent description, parent comments, Confluence links,
attachments) it reads to find BASELINES, and what it records per baseline is tier / source /
location — no scope decisions.

So `prototype-comparison.md`'s claim that the deliberate/not-deliberate annotation comes from
"the same sources baseline discovery already read" is asserted but unfounded: no task produces
that data. The wording came from MY Task 8 dispatch, which asserted the interface without checking
that Task 3's file delivered it. The reviewer flagged exactly this and was right to; its scope
forbade it from confirming.

Ruling (recorded now, dispatch owed on resume): fix it in `baseline-discovery.md`, not in
`prototype-comparison.md`. That file is already fetching the ticket, its parent, and both comment
streams — having it record the ticket's Scope / Out-of-scope sections and any scope decision in
comments while it is already there costs one extra capture and avoids a second round of Jira
fetches later. It becomes a fourth recorded field alongside tier / source / location.
`prototype-comparison.md`'s annotation-source sentence then becomes true as written.
Cost if wrong: baseline discovery carries one field that only the annotation step consumes.

This makes Task 3's file (already marked complete) part of the resumed work. Revised owed list on
resume, in order:
  (1) Tasks 6+7 port-parameterization fix + scoped re-review
  (2) Task 3 fix: record the ticket's scope decisions as a fourth field + scoped re-review
  (3) Task 8 fix round 1: the identities-conflict exception (touching BOTH prototype-comparison.md
      and plan-and-report.md) + scoped re-review
  (4) Tasks 1, 9, 10 — still blocked on the ADAT-822 PR existing

## Resumed 2026-08-20 (new session)

Context rebuilt from this ledger, the plan, the briefs and the reports — NOT from the paused
session's memory. The paused session (839ecdcd) is still resumable and holds the four review
rounds' reasoning; only what was written down came across.

Ruling: no subagents this session — the harness forbids dispatching them unasked. The controller
performs each owed fix and its scoped re-review inline. Cost if wrong: the re-review loses the
"separately dispatched seat" property, but not the fresh-context property that made those reviews
work — this controller did not write any of these files and read each one cold before editing.

Owed (1) Tasks 6+7 port parameterization: DONE. Step 1 now resolves the port before probing, by
following the serve script through its `pnpm run` indirection (`serve:dev` -> `serve:env` ->
`serve:vite`, only the last carrying `vite --port 8080`) and falling back to 8080; every command
block sets `PORT` itself, because shell state does not carry between Bash calls.
Ruling (extends the recorded one): the `lsof -nP -iTCP:8080` block was parameterized too. The
recorded ruling named only the curl probe and the poll loop, but the lsof block is the same defect
in the same step; leaving it would have made the ownership check probe a port the other two no
longer assume. Also updated: the Step 2 cross-reference (the server starts on the port that was
probed) and the error-table row that named 8080 literally. Cost if wrong: one more block differs
from the replaced skill's original by one substitution.
Scoped re-review: the five remaining `8080` strings are all prose (the fallback value and the
two-apps-same-default example); no command hardcodes a port. No other file in the skill mentions a
port at all (swept).

Owed (2) Task 3 fourth field: DONE, with a DEVIATION from the recorded ruling, stated here.
The ruling said "a fourth recorded field alongside tier / source / location". Implemented instead
as a RUN-LEVEL field recorded in the same step. Reason: tier/source/location are per baseline, and
several baselines can coexist by design; scope decisions belong to the ticket, so a per-baseline
fourth field would duplicate the same text across baselines and drift, and the plan file renders
one `**Baselines:**` line per baseline, which is the wrong shape to carry it.
Second addition, not in the ruling: the plan skeleton gained a `**Scope decisions:**` line, with a
`### Filling the **Scope decisions:** line` section beside the Baselines one. Without a landing
site "record it" would have meant working memory across a whole run — the exact two-ledger drift
this skill's plan-file rule exists to prevent. `none recorded` is written rather than omitting the
line, so "looked, found nothing" stays distinguishable from "nobody looked".
prototype-comparison's annotation-source sentence now cites that field and that line, and says to
read it from the plan file rather than re-fetching the ticket — the claim that was previously
asserted with no producer is now true as written.
Cost if wrong: the plan header carries one line only the annotation step consumes.

Owed (3) Task 8 identities-conflict exception: DONE, in BOTH files as ruled, plus a third.
prototype-comparison's `### When identities conflict` now names itself an exception to the
lifecycle, points at it by section name, and runs as two explicit passes: pass 1 closes each item
into `Status: Pass 1 complete` before the next opens, pass 2 reopens in the same order and writes
the terminal Verdict. plan-and-report gained `### The identity-conflict exception` defining that
state, why the alternative (per-item identity switching) was rejected, and that batch-closing stays
forbidden in both passes. The first lifecycle bullet now points at the exception instead of stating
an absolute the file contradicts four sections later.
Added beyond the ruling: pass 2 sets `Status` back to `In Progress` and does NOT write a second
`Started:`. The ruling defined the pass-1 state but left pass 2's item state undefined, which is the
same class of gap the review caught.
THIRD FILE found by sweep, not in the ruling: SKILL.md line 134 states the same
"one item opens only after the previous reaches a terminal status" rule a third time. It was left
untouched by the two-file ruling and would have contradicted the exception on the always-loaded
file. Now names the exception and points at its section. Sweep confirmed no fourth statement.

Integrity check: green except `references/reconcile-findings.md` (Task 9, still blocked). All
manifest headings in the four edited files verified present after editing.

Owed on resume, unchanged: Tasks 1, 9, 10 — still blocked on the ADAT-822 PR existing. Nothing
else is outstanding; Tasks 2-8 are complete with their reviews closed.

## Task 1 (spike) — 2026-08-20, unblocked by user

USER INPUT: ADAT-822 is far enough along to test against. Exactly one open PR maps to that ticket
(#8857), so the brief's "ask which PR, do not pick unilaterally" is satisfied by the user naming
the ticket — recorded rather than re-asked.

Pre-check not in the brief, added: listed ALL reviews on #8857 before touching it. `[]` — zero of
any state. Step 6's unconditional `delete_pending` is only safe if the user has no pending review
of their own on that PR; the brief mandates the cleanup without ever checking that. Verified empty
first, so nothing of the user's could be destroyed. This check belongs in Task 9's procedure too.

Results: Q1 yes, Q2 yes, Q3 NO (PATCH 404 on an unsubmitted comment), Q4 yes (DELETE 204).

Probe 2 added beyond the brief, and it was necessary. After Probe 1's delete, the review itself
404'd — which is equally consistent with "DELETE is per-comment" and "DELETE nukes the review",
and those two lead to opposite designs for Task 9. Probe 2 (two comments, delete one) settled it:
the review survived with the other comment attached. DELETE is genuinely per-comment; Probe 1's
disappearance was GitHub not keeping an empty pending review. Had the spike stopped where the
brief ended, Task 9 would have been written on a coin flip.

Anchor finding, unasked and consequential: a pending comment reports `line`, `side`, `start_line`
and `subject_type` as null; only `position` / `original_position` carry the anchor. But the add API
takes a LINE, not a position. `plan-and-report.md`'s `## Pending comment backup` block recorded
`id / path / line / body` — for a pending comment that is `line: null`, i.e. a backup that looks
complete and cannot be replayed. That file is Task 4's, already marked complete; corrected now to
record `position` and `commit_id` with the reason and a pointer to the findings file. This is the
fifth instance in this plan of a rule stated in one place being falsified elsewhere — here by the
API rather than by a sibling file.

Cleanup verified: 0 pending, 0 reviews of any state, 0 review comments and 0 issue comments
containing `parity-api-probe`. PR #8857 is in the state it was found in.

Decision recorded: `PER_COMMENT_SUPPORTED = true`, with edit expressed as delete + re-add (PATCH
does not exist for unsubmitted comments), with the empty-review rule (emptying a pending review
destroys it, so a rebuild must re-create it before re-adding), and with the position-to-line
conversion required on restore.
Findings: docs/specs/2026-08-20-pending-comment-api-findings.md
Task 1: complete.

Owed next: Task 9 (references/reconcile-findings.md) — now unblocked, writes per-comment mutation
as primary with whole-review rebuild as fallback. Then Task 10 (dry run + retire the replaced
skill), which needs a real parity run to dry-run against.

## Task 9 — 2026-08-20

USER INPUT: ADAT-822 was reviewed locally; the user believed the finding context was gone. Checked:
it is NOT gone. `branch-review-ADAT-822-trigger-binding-on-site-check.md` exists with 5 findings
(3 MEDIUM, 2 LOW, verdict PASS), written 10:56 today — in the wt1 worktree's `docs/context/`, not
the main checkout's. The main checkout holds only 775/779/780, which is why it looked missing.
That is a verified behavior, not a one-off, and it went into the file: a branch checked out in a
worktree keeps its local findings file in that worktree.

`references/reconcile-findings.md` written. Full check.sh now `OK: all checks passed`, exit 0 —
first time the skill is structurally complete.

Three deviations from the brief, all forced by Task 1's measurements:

1. The brief's Step 6 blockquote asserts "There is no per-comment delete or edit for pending review
   comments — only deletion of the whole pending review." Half wrong. It is true of the MCP surface
   and false of raw REST, where DELETE per comment works (204, verified twice). Rewritten to say
   which surface each claim applies to. Sixth instance in this plan of a stated rule falsified by
   evidence — this one would have made the skill rebuild whole reviews for no reason.
2. The brief's primary-path snippet includes `PATCH .../pulls/comments/{id}`. That call 404s on an
   unsubmitted comment. Replaced with delete + re-add via `add_comment_to_pending_review`, with the
   ordering rule (add the replacement BEFORE deleting the original when it is the review's only
   comment, or the review is destroyed and the re-add has nothing to append to).
3. The brief's Step 4 restates the backup fields as "comment id, path, line, body" — the stale list
   Task 1 disproved. The file forwards to `plan-and-report.md`'s section instead of restating, so
   there is one owner of that format and it is the one carrying the measured behavior.

Also added, from the same evidence: a pending comment reports a diff `position`, not a line, so a
comment being rewritten must have its line re-derived from the hunk header rather than copied from
what was read back.

Task 9: complete pending review.

Owed next: Task 10 — dry run, then retire the replaced skill. The dry run now has a real subject:
PR #8857 (ADAT-822), whose local findings file supplies the "existing review conclusions" input for
flow step 7 and whose PR has zero reviews, which exercises the local-file row of
`## Situations without a pending review`. Task 10 also needs the user's explicit confirmation
before the destructive deletion step, per the plan's own gate.

## Task 10 — dry run executed 2026-08-20, deletion still pending

Subject: ADAT-822 / PR #8857, wt1 worktree, dev server on 8080 started by the run.
Plan file: wt1 `packages/app-vsaas-portal/docs/verification-plans/2026-08-20-15-15-adat-822-trigger-binding-on-site-check.md`

Gates 1-7 all exercised. Verdicts: 5 SAME, 2 SKIP, 0 DIFFERENT. Final counts 0 / 1 / 2.

Four defects found in the skill and fixed during the run (all re-checked green):

1. SEVERE — same-call action-and-read. Ticking two rows and reading the count in one
   `evaluate_script` returned `0 selected`; the next call returned `2 selected` with nothing done in
   between. For THIS skill the false reading is indistinguishable from the timing difference it
   exists to detect, and it fires on both lanes at once, so the run still reports SAME with both
   readings wrong. Fixed in browser-operation.md (`### The verification must be its own tool call`)
   with the measured numbers, plus a cross-reference from prototype-comparison.md defining
   "immediately" as "the next tool call".
2. Tier 3 was unqualified, which made `## Stop condition` unreachable — every ticket has acceptance
   criteria of some kind. Testing against ADAT-752 showed its Done Criteria are code-structure
   assertions no browser can check. Tier 3 now requires behavior observable in the running
   application, with the ADAT-752 case recorded and an "what would a person DO to see this" test.
3. The stop template carried a comment-count slot for the ticket but not for the parent. Added;
   verified by emitting the real ADAT-752 message (1 / 7 / 0 / 0).
4. Task 10 Step 5's own claim is wrong: TWO memory files reference the replaced skill
   (`reference_mcp_atlassian_single_site.md`, `reference_parallel_browser_lanes.md`), not one.
   Step 6 must update both.

Method notes worth keeping:
- A candidate difference (prototype not narrowing the device list) was withdrawn before it was ever
  raised: the 50-vs-50 reading was the menu's row cap. Re-tested with a small site, 50 → 13. The
  run's own discipline caught it; a less careful pass would have reported a false difference.
- The operator violated the per-item lifecycle once (item 2's setup ran before `Status: In Progress`
  was written). Recorded in the plan file rather than hidden. The rule is easiest to break when the
  previous item's end state IS the next item's precondition.
- Closing a lane's own tab leaves that lane unable to answer `list_pages`. Recovery was via the CDP
  endpoint rather than by touching the user's tab. Not fixed — worth a line in browser-operation if
  it recurs.

Cleanup verified: dev server stopped (port 8080 refuses), both run-opened tabs closed, user's
`?sentinel=do-not-touch` tab never touched, PR #8857 has zero reviews and zero comments.

REMAINING: Step 5's deletion of ~/.claude/skills/implementation-verification requires the user's
explicit confirmation — not yet given. Step 6 (update the two memory files) follows it.
Rollback point: ~/.claude/.backup-implementation-parity-2026-08-20/

## Post-dry-run hardening 2026-08-20

Four gaps found by USING the skill rather than by reviewing it. All four were places where the text
was internally consistent and still wrong about the world.

1. `prototype-comparison.md` — `### When the action has no commit phase`. The four-reading model
   assumed every interaction has a separate commit moment. A chip's `×` has none: it changes and
   commits at once. The file already forbade collapsing four readings to two, so an agent meeting an
   atomic action was cornered between a prohibition and a nonexistent moment — the likely escape
   being a fabricated reading. Now: a stated test ("is there something the user still has to do for
   this to take effect?"), an explicit degraded form of one reading per side, and a requirement to
   name the degradation in the log. The old prohibition is scoped to where a commit phase exists.

2. `baseline-discovery.md` — a 200 is not an operable baseline. The general filter-combo demo turned
   out to be a gallery of seven toolbars, only some live. Tier 1 is now "candidate until an operable
   instance is confirmed", with one harmless interaction required before classifying, and `location`
   must identify WHICH instance when a page carries several. Without this the next run picks a
   different toolbar and compares something else.

3. `plan-and-report.md` — a `## State reading` section in the skeleton, plus the rule to seed it from
   the most recent prior plan file for the same app. Working out how to read a value out of an app
   cost most of this run's tool calls, and every bit of it applies unchanged next time. The section
   is the one part of the plan file written for the next run rather than this one. This run's own
   plan file was retro-filled, so the rule has something to inherit rather than starting empty.

4. `browser-operation.md` — closing a lane's own tab leaves that lane unable to answer even
   `list_pages`, and the cleanup instruction walks straight into it. Now: close lane tabs last,
   recover by reading the CDP endpoint rather than by selecting one of the user's tabs (which
   "read-only" forbids), and `new_page` to re-establish.

Deliberately NOT changed: comparison-item ordering. One lifecycle violation happened because the
previous item's end state was the next item's precondition. An ordering rule would route around the
weakness instead of fixing it; if it recurs, harden the lifecycle rule itself.

Still untested end to end: the reconcile half. This run produced 0 DIFFERENT, so steps 7-8 never
had a candidate to carry, and no PR was ever mutated by the skill's own path. The Task 1 spike
proved the API calls work by hand; the skill walking them has not run. Closing that needs a ticket
whose implementation is known to diverge from its baseline.

`docs/check.sh` green after each edit.

## Second-run hardening 2026-08-21 (from the PR #8861 / ADAT-809 run)

That run reached what the ADAT-822 run never did: 2 DIFFERENT, a real reconcile, comments written to
someone else's PR. Five gaps, all invisible from the ADAT-822 run because it produced no difference.

1. **Visibility was not a concept in this skill.** Landing sites said non-anchorable findings go to
   the plan file and "never the PR". A real finding could not be anchored, the user asked for it on
   the PR anyway, and the run posted a conversation comment — immediately visible to everyone with
   PR access — with no sanctioned path and no gate of its own. The user then had to ask what
   "public" meant. Now: the route is allowed (user's decision 2026-08-21), a table states who sees
   each destination and when, and it takes a SECOND confirmation naming the comment as public and
   the author as notified. Explicitly not folded into the candidate-list approval, because that
   approval is about which findings are real, not about notifying someone else's PR.

2. **`## Final counts` replaced by a landing map.** The old template's "上了 PR: {N}" merged a
   pending comment nobody can see with a conversation comment everyone can see. The user asked three
   consecutive follow-ups that the closing message should have pre-empted, and one of the two
   DIFFERENTs turned out not to be in the pending review at all. Now every difference is named
   beside its destination and identifier, the two PR buckets are separate, empty buckets are omitted,
   and the count of `Verdict: DIFFERENT` lines must equal the entries listed.

3. **Chrome is started, not asked for.** dev-server.md told the agent to stop and ask the user to
   run `shared-chrome.sh`. The user objected — correctly: the script is executable, idempotent, and
   its bare form is its start form. Now the agent runs it, re-checks `status`, and only escalates if
   the second check still reports down. The judgement kept: ask before acting outside the workspace;
   a local browser this skill itself needs is inside it.

4. **Unmet prerequisites are surfaced at gate 1.** That run ended 3 of 7 items SKIP — missing test
   data on a shared org, an org-level flag, an account that does not exist — all knowable before
   execution. SKILL.md step 3 now requires each item to be presented with what it needs and whether
   that holds, so the user can supply it or drop the item while it is still cheap.

5. **Someone else's PR needs its own worktree.** The whole skill had assumed the implementation is
   the current checkout. dev-server.md gained a step 0: check the PR out into a dedicated worktree,
   record the directory and head commit on the plan's `**Target:**` line, and expect removal to be
   slow enough to background.

Cross-file follow-through: SKILL.md's step 9 still described "the three final counts" after the
template changed — the same one-place-updated-not-the-other pattern this plan keeps producing. Prose,
digraph node and Execution table all realigned; swept for `never the PR` and for any remaining
instruction to have the user start Chrome. Both clean. `docs/check.sh` green.

## Second validation run 2026-08-21 (PR #8861 again, after the 08-21 fixes)

Ran the skill end to end against the same PR to check the fixes. 4 items (3 dropped at the gate),
2 SAME / 2 DIFFERENT / 0 SKIP, nothing landed on the PR.

VALIDATED:
- **Chrome auto-start.** `status` reported `down`; the new rule had the agent run the script itself
  and re-check; `up`. The exact friction the user objected to is gone.
- **Prerequisites at gate 1.** Each item was presented with what it needs and whether that holds.
  The user dropped three items rather than spending the run on them — and the store data later
  PROVED the prediction: the set `direct == 0 && rolled > 0 && has floor plan` is empty in that org,
  so the dropped item would indeed have been SKIP. Previously that cost a full run to discover.
- **State-reading seeding.** The prior run's plan file had independently grown a `## State reading`
  section before the rule existed — two runs converging on the same need. Seeding carried the
  concepts correctly (which numbers matter, the redirect-not-paint trap) but its getter names and
  shapes were WRONG: `site/devicesBySite` is a method-style getter that ignores its argument and
  returns a Map of siteId -> device array, and `site/descendantSiteIds` returns a Set. Reading
  `.length` off either yields `undefined`, which silently made every site look like zero cameras.
  Corrected in place, as the rule prescribes. Lesson: seeds save the WHAT, not the HOW; carried
  entries must be re-proved before they are trusted.
- **Landing map template — and it FAILED, then was fixed.** Both differences classified as "already
  covered" (the 09:18 run's findings are now a submitted review plus a public comment). The template
  had no bucket for that, so its own completeness check — every `Verdict: DIFFERENT` appears in
  exactly one bucket — became unsatisfiable, and a re-run would have looked like it lost its
  findings. Added `已被既有 comment 涵蓋` naming where each was already raised.
- NOT exercised: the public-comment gate. Nothing needed posting.

NEW GAPS, fixed during the run:
- `baseline-discovery.md` was Jira-only. ADAT-809's whole description is two Redmine links; the
  `[Expect result]` clause lives there. A search stopping at the Jira boundary reports "no baseline"
  for a ticket that has one. Added `### When the ticket only points somewhere else`, including what
  to do when the other tracker's tooling is absent from the session (say so, ask; label anything
  recovered from an old transcript as quoted, not verified — which is what this run had to do).
- `dev-server.md` step 0's snippet was wrong twice over: `gh pr checkout` switches the branch of the
  user's own checkout and then blocks the `worktree add`, and `origin` is a personal fork so
  `git fetch origin pull/N/head` fails outright. Replaced with fetch-into-a-branch from the remote
  that actually hosts the PR.
- A fresh worktree cannot boot even after `pnpm install`: it lacks generated, git-ignored artifacts
  a long-lived checkout accumulated. Two hit here — `design-tokens/dist` (its `predev` build fails
  from clean) and `src/aws-exports.js` (blank page, no store). Both now documented with their
  symptoms, because neither failure names the missing artifact.
- The readiness poll treats `200` as ready. Vite answers with the shell before any module resolves,
  so the poll went green while the page was blank and the store absent. Now: after 200, confirm the
  app booted and read the dev log for `Failed to resolve import`.

Technique worth keeping: the floor-plan tree would not select under synthetic clicks (three targets
tried). Direct URL navigation to the edit route was correct rather than a workaround — the route file
states permission checks live in the page's `watchEffect`, deliberately not in `beforeEnter`,
precisely so direct navigation behaves the same.

Cleanup verified: dev server stopped, worktree and its branch removed, report copied out first,
tab closed, user's tabs untouched, PR #8861 unchanged by this run.
