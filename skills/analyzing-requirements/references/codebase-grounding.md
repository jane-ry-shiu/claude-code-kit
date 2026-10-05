# Codebase Grounding

## Overview

**You may not finalize the Phase-1 scope from the spec text alone. Open the real codebase first and ground every scope item in it.**

This is a discipline agents reliably skip. In baseline testing, an agent ran Phase 1 entirely from the spec — opened **zero** implementation files, grouped scope by the spec's own module names, and took the spec's "current state" claims ("currently a flat list", "no search today") as given. It even cited this skill's phase boundary to justify it: *"real-code verification belongs to Phase 3 ... I was told to stop after Phase 1."* Result: scope is mis-sized (work the spec calls "build" is already half-built; the spec's "flat list" is false), same-pattern surfaces get split across modules, and surfaces the spec never names are missed.

**Grounding is a Phase-1 activity, not Phase 3.** Phase 3's `technical-constraints` deep-verifies API/data limits for the *confirmed* in-scope set. Grounding is upstream: it produces a *correct* scope list in the first place. "Stop after Phase 1" means don't deep-assess — it does NOT mean don't open code.

**Violating the letter of this gate is violating the spirit.** "I'll check the code in Phase 3" is not grounding the scope.

## The hard gate

Before the Phase-1 scope list is presented for confirmation, for the area the spec covers:

1. **Open the real code.** Find each surface the spec names and read enough to see how it is actually built today.
2. **Classify each surface by UI-pattern type** — *where* the control lives and *how* it is built (e.g. sidebar/tree search vs. page-based table toolbar vs. modal panel). This classification drives grouping (see `scope-boundary.md`): same type → shares components → slices together.
3. **Treat every "current state" claim in the spec as a claim, not a fact.** The spec says "flat list / no search / no column config"? Verify each against the code. Record where the spec is wrong; the code wins — re-baseline that scope item's delta to what is ACTUALLY missing.
4. **Inventory untracked surfaces.** Search for other surfaces of the SAME pattern the spec does NOT name. They are scope inputs (the real basis for the shared work), even if later marked out-of-round.
5. **Record findings** as scope inputs + `decision-tracking.md` entries: pattern per surface; spec-vs-reality discrepancies; untracked surfaces.

**No code opened → STOP.** Do not present a scope list grounded only in the spec.

## Rationalizations — all invalid

| Rationalization | Reality |
|---|---|
| "Real-code verification is Phase 3; I stop after Phase 1." | Phase 3 deep-verifies API/data for the *confirmed* set. Grounding the scope is Phase 1. Stopping after Phase 1 ≠ skipping Phase 1's grounding. |
| "I grouped by module — the axis the spec / Impact / design use." | The spec's module axis is the path of least resistance and hides shared implementation. Group by the real UI-pattern type, found in code. |
| "I attributed current-state to 'the spec' — that's enough hygiene." | Attribution ≠ verification. A wrong current-state claim silently mis-sizes scope (e.g. "Devices is a flat list" when per-type tables already exist). Open the code and re-baseline. |
| "Finding untracked surfaces needs code reading — that's Phase 2/3." | Inventorying same-pattern surfaces the spec omits is a Phase-1 scope input. Do it now, or the scope is incomplete. |
| "The spec is the source of truth for what exists." | The spec is a claim about what exists. The code is what exists. When they disagree, trust the code and flag the discrepancy. |

## Red flags — STOP and ground first

- Presenting a Phase-1 scope list without having opened a single implementation file.
- Grouping scope items by the spec's module/page names.
- Repeating the spec's "currently X" / "no Y today" without checking the code.
- "Real code is Phase 3." / "out of scope for a Phase-1-only task."
- Not having looked for same-pattern surfaces the spec doesn't mention.

All of these mean: open the real codebase and ground the scope before confirming it.
