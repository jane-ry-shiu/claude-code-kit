# Prototype Comparison

Loaded at flow step 6 (Execute items) alongside `references/browser-operation.md`, for items whose
baseline is tier 1 — a runnable demo URL or a Figma prototype-mode link (see the tier table in
`references/baseline-discovery.md`). This file is the procedure specific to having a second,
independently operable side to compare against; it builds directly on `browser-operation.md`'s
`## Approach hierarchy` and `## Side-effect verification` — read state before DOM before snapshot
before screenshot, and never trust a tool's "Successfully" without checking the side effect. Both
are assumed below, not repeated.

## When this applies

Tier 1 only: a runnable demo URL, or a `figma.com/proto/` link. Both sides can be driven and
observed independently, which is what the rest of this file requires.

If the item's baseline is tier 2 (a Figma frame — `figma.com/design/` or `figma.com/file/`), this
file does not apply. Use `references/visual-comparison.md` instead: there is no second running
side to operate, only a frame to screenshot against.

If the item's baseline is tier 3 (a written spec or acceptance criteria, no URL), this file does
not apply either. There is nothing to drive on the "baseline" side at all — operate the
implementation alone and compare its observed behavior against the description, using
`browser-operation.md`'s process directly.

An agent arriving with a Figma frame or a spec paragraph and no prototype URL must be routed to
one of the paragraphs above, not improvise a two-lane comparison it has no second side to run.

### Why tier 1 gets its own procedure

> ADAT-822: the prototype cleared the device filter at the moment a site checkbox was ticked and
> re-queried immediately; the implementation cleared it only when the menu closed and the value
> was committed. Screenshots of the two are identical.

A screenshot taken after the menu closes shows the same filter state on both sides — the
difference is entirely in when the clear-and-requery happened, not in what either side eventually
displays. A written spec would not have caught it either unless it happened to specify timing
explicitly, which specs describing end states rarely do. Only operating both sides and reading
state and request timing at more than one moment surfaces it. That is the whole reason this file
exists: it is the capability a screenshot-only or spec-only comparison cannot provide.

## Login conflict check

Runs before any navigation — before lane a or lane b opens a tab for this item.

> Cookies and localStorage are browser-wide, not per lane. If the prototype and the
> implementation require different identities, they cannot share a browser — signing into one
> evicts the other. Ask the user up front. If they conflict, compare one side fully, record its
> observations in the plan file, then compare the other; do not interleave.

Concretely: ask whether the prototype and the implementation authenticate as the same account. If
they do, both lanes can stay open together and the default per-item procedure below (`## Paired
action execution`) runs as written. If they do not, follow `## When identities conflict` under
that section instead — the four-reading comparison still happens, just not with both lanes live at
once.

This is the same hazard `browser-lanes` names generically ("cookies and localStorage are
browser-wide... run those single-lane"); here it is the specific case of the two sides of a parity
comparison needing different identities.

### No state mutation to get a cleaner read

Never change page state to make an observation easier. Toggling a debug panel, a feature flag, or
any other setting to get a cleaner view writes to storage that is shared by every lane and every
later item in this run and in whatever runs after it — the same rule `browser-lanes` states as
"never change page state for a cleaner capture." If a comparison is awkward to observe as the page
stands, record the obstruction in the item's execution log rather than reaching for a toggle to fix
it.

## Paired action execution

The per-item procedure. `a` is the prototype lane, `b` is the implementation lane, per
`browser-operation.md`'s `## Lane assignment`.

```
1. Bring lane a (prototype) and lane b (implementation) to the equivalent starting state.
   Record both starting states in the plan file before acting.
2. Perform the identical action on lane a. Immediately read state. Record.
3. Perform the closing/committing action on lane a (close the menu, blur, submit). Read state
   again. Record.
4. Repeat 2-3 on lane b.
5. Compare the four readings, not two.
```

Steps 3 and 5 assume the interaction HAS a commit phase. Some do not — see
`### When the action has no commit phase` below before assuming four readings are available.

Each "read state" in steps 2-4 follows `browser-operation.md`'s `## Approach hierarchy`: query the
store via `evaluate_script` first, fall back to a narrow DOM query, then a snapshot, then a
screenshot only for purely visual items.

"Immediately" means the next tool call, never the same one. Batching the action and its read into
one `evaluate_script` reads the pre-action value and fakes a timing difference on both sides at
once — see `browser-operation.md`'s `### The verification must be its own tool call`, which was
written from a real occurrence of this during the dry run. This pairing is exactly the discipline
`browser-operation.md`'s `## Side-effect verification` describes under "Comparing timing across two
lanes" — a merely "eventually true" check cannot tell "changed now" from "changed on close"; reading
immediately after the action and again after the closing action is what makes that distinction
possible.

### Why four readings, not two

Two readings — one per side, taken at the end after both are closed/committed — cannot detect a
timing difference. Both sides can reach the same final state by different routes: one clears and
re-queries the instant the checkbox is ticked, the other waits until the menu closes to do the same
thing. A read taken only at the end sees the same destination on both sides and reports SAME, which
is exactly the false negative ADAT-822 produced against screenshots. The four readings — immediate
and post-close, on each side — are what let the comparison see the route, not just the destination.
Collapsing this back to two readings "to save a step" silently removes the ability to detect timing
differences at all; do not do it.

### When the action has no commit phase

Four readings exist only where the interaction has two distinct moments: the action, and a separate
user action that ends the interaction. Test it directly — **is there something the user still has to
do for this change to take effect?** Closing a popover, blurring a field, pressing Submit all
qualify. If the answer is no, the action is atomic and there is no second moment to read.

Measured example: clearing a whole dimension with the chip's `×`. The chip is not open, the action
both changes and commits, and nothing follows it. Reading "after the closing action" would mean
inventing an action that does not exist.

The honest form for an atomic action is **one reading per side, two in total**, and the item's
execution log must say which form was used and why. Write it as "the four-reading model degenerates
to one reading per side here — the `×` has no commit phase", not as a bare pair of readings that
looks like the forbidden collapse.

What `### Why four readings, not two` forbids is dropping to two readings when a commit phase DOES
exist. It does not require manufacturing a reading where no second moment exists. Faking that
reading is worse than recording the degradation: it puts a number in the log that no observation
produced.

### When identities conflict

If `## Login conflict check` found the two sides need different identities, all four readings are
still taken, but they cannot be taken in one pass — signing into either side evicts the other.

This is a **named exception** to the per-item lifecycle in `references/plan-and-report.md`, not a
licence to leave items open: that file's `### The identity-conflict exception` defines the item
states this path introduces, and the two sections are written to be read as one rule. Do not run
this path without it.

1. **Pass 1 — lane a (prototype) only.** For each item in order, run steps 1-3 above and write the
   starting state and both readings (immediate, post-close) into that item's execution log, then
   close it into `Status: Pass 1 complete` before opening the next. No `Verdict` is written in pass
   1 — the comparison a verdict would state has not happened yet.
2. **Swap identity in the browser.**
3. **Pass 2 — lane b (implementation) only.** Reopen the items in the same order and run steps 1-3
   against the implementation, reading the prototype's observations from the plan file instead of
   from a live lane a.
4. **Close each item in pass 2** with the four-reading comparison and a terminal `Verdict` — two
   readings from pass 1, two from this pass — one item at a time, exactly as the lifecycle requires
   on the normal path.

The plan file is what bridges the two passes. If pass 1's readings are not written in full at the
moment they are taken, pass 2 has nothing to compare against and the whole run has to start over
under the first identity.

## What counts as a difference

Three dimensions, each with how it is observed:

| Dimension | Observed by |
|---|---|
| `state` | The two sides end in different state — store query via `evaluate_script` |
| `timing` | Same end state, different moment — the immediate-vs-after-commit readings from `## Paired action execution` differ |
| `dispatch` | One side issues a network request the other does not, or issues it at a different point — `mcp__chrome-devtools-a__list_network_requests` / `mcp__chrome-devtools-b__list_network_requests` |

Record a `DIFFERENT` verdict with its dimension appended inline, per
`references/plan-and-report.md`'s convention: `Verdict: DIFFERENT (timing)`. `state` and `dispatch`
follow the same form — `Verdict: DIFFERENT (state)`, `Verdict: DIFFERENT (dispatch)`. A `SAME`
verdict needs no dimension; a `SKIP` needs the reason recorded in `Baseline observed:` instead, per
`plan-and-report.md`'s per-item lifecycle rules.

### Deliberate versus defect

> Deliberate-versus-defect is not decided here. Every difference is listed, annotated with
> whether the ticket already records a decision about it. ADAT-822's device-menu scope hint is
> the model: the ticket explicitly places it Out of scope, so it is annotated "known deliberate"
> and kept out of the add candidates. A parity tool that reports deliberate design as defects
> stops being trusted after two runs.

This file only produces the verdict and the dimension; it does not decide whether a `DIFFERENT`
verdict is a bug. That classification happens at flow step 7, against whatever review conclusions
already exist. What this file is responsible for is attaching the annotation that step 7 needs to
tell a defect from a documented choice — every `DIFFERENT` item gets checked against the ticket
before it is handed off, not left for step 7 to discover cold.

The annotation's source is not a new lookup: it is the `scope decisions` field that baseline
discovery already recorded at flow step 2 (`references/baseline-discovery.md`, `### Recording`) and
that the plan file carries on its `**Scope decisions:**` line — the ticket's Scope / Out-of-scope
sections plus any scope decision in comments, captured while those fetches were already open. Read
it from the plan file; do not re-fetch the ticket here.

If that field records a decision covering the observed difference, annotate it "known deliberate" in
the item's execution log, citing the level and comment id it came from, and do not carry it forward
as an add candidate. If it says nothing about the difference — including when it reads `none
recorded` — the difference goes forward unannotated. Silence in the ticket is not itself a "known
deliberate" annotation; only an explicit Out-of-scope note or comment is.

The reason this distinction is a hard rule and not a judgment call left to step 7: a parity tool
that reports deliberate design as defects stops being trusted after two runs, and once that
happens every future run gets re-litigated by hand regardless of what this file finds. Skipping the
annotation here does not make the tool more thorough — it makes its output require re-verification,
which is the opposite of the point.
