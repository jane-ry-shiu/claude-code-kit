# OpenSpec Change Scoping — Official Handling Direction

<HARD-GATE>
Applies whenever you create or modify an OpenSpec change (scaffolding a
proposal, deciding change boundaries, or naming capabilities). These gates
run BEFORE you scaffold `changes/<id>/`. Most of these gates encode OpenSpec's
official scoping guidance (workflows.md, AGENTS.md), which is NOT loaded by the
proposal/apply/archive commands — so it must be enforced here. The one
capability-hygiene item drawing on community practice (not official doctrine)
is tagged inline.
</HARD-GATE>

## Gate 1: Change boundary (one change = one logical unit)

Before scaffolding, you MUST:

1. State, in ONE sentence, the single logical unit of work this change
   delivers. If the sentence needs "and also" or names two unrelated verbs,
   STOP and split into separate changes.
2. Behavior-vs-refactor test: if the change bundles a behavior change AND a
   refactor/relocation (e.g., build a component AND move it to a shared lib),
   the refactor/move is a SEPARATE change.
3. Update vs. new: refining the same intent, narrowing scope, or correcting
   from what you learned → update the existing change. Intent changed, or
   scope expanded into different work → start a new change.

Rationale (official): one logical unit per change is easier to review, keeps
archive history clean, ships independently, and rolls back simply.

## Gate 2: Capability / spec hygiene (don't fragment the source of truth)

Change granularity and capability granularity are independent axes. Keep
changes small WITHOUT fragmenting specs:

4. Name capabilities by stable DOMAIN (`user-management`, not `user-show` /
   `user-detail`); reuse the same capability name across related changes so
   sequential changes converge on one spec instead of fragmenting.
   (Provenance: this anti-fragmentation use is community — OpenSpec Discussion
   #737, unanswered; not official doctrine. The adjacent naming discipline IS
   official, AGENTS.md: single-purpose capability, verb-noun, split if a
   description needs "AND".)
5. Before adding a new capability, run `openspec list --specs` and prefer
   extending an existing capability (MODIFIED) over spawning a near-duplicate.

## Skip entirely (no change, no proposal)

Per official guidance, do NOT create a change for: a bugfix restoring
already-specified behavior, typo/format/comment edits, non-breaking
dependency bumps, config changes, or tests for existing behavior. Just do it.

## Self-check (before sharing the proposal)

- Can I name the ONE logical unit in a single sentence with no "and also"?
- Does every delta target a domain-stable capability, extending an existing
  one where possible rather than spawning a near-duplicate?

If any answer is "no", fix scope or structure before proceeding.
