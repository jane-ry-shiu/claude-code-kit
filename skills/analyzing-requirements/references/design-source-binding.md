# Design-Source Binding

## Overview

**You may not specify, structure, or defer a UI component from the spec text alone. Bind it to its design source first.**

This is the one discipline agents reliably skip. In baseline testing, agents produced detailed component breakdowns straight from the spec without ever opening the design mockup — one literally concluded *"a reviewer can sign off the logic before the visual layer exists."* Real-world result: components diverge from the mockup, and component **structure** (boundaries, hierarchy, states) turns out wrong and is found late — an expensive redo.

**Violating the letter of this gate is violating the spirit.** "I'll bind it later" is not binding it.

## The hard gate

Before ANY component is specified, structured, or deferred:

1. **Obtain the design source** — the Figma/mockup/prototype frame(s), or an explicitly named existing component/convention to reuse.
2. **No source → STOP.** Mark the component `pending-confirm`, name the owner, ask for the source. Do NOT proceed on assumed or "sensible default" visuals.
3. **Bind** — record, per component, exactly which design-source node/frame (or named convention) it maps to.
4. **Compare** — check layout, component boundaries, states, and tokens against the source; record every divergence as a finding (`decision-tracking.md`).

Component **structure is decided by the design, not the spec.** Deferring visuals defers the structural decision — which is how the wrong architecture gets built.

## Rationalizations — all invalid

| Rationalization | Reality |
|---|---|
| "Define the logic now; the visual layer / reviewer can come later." | Structure (layout, hierarchy, states, boundaries) is set by the design. Defer visuals → defer structure → build the wrong architecture → redo. |
| "The spec describes the behavior — that's enough to build components." | Behavior ≠ appearance or structure. Spec text doesn't pin layout, boundaries, states, or tokens. The source does. |
| "No mockup was provided, I'll use sensible defaults / general patterns." | Inventing visuals is the exact divergence this gate prevents. No source → STOP and ask. Don't invent. |
| "It's a standard list/filter — the design is obvious." | "Obvious" is how you end up not matching the real mockup. Bind to the actual source. |
| "We're authorized to use best judgment now and adjust the visuals later — the designer is out and the sprint can't slip." | Authorization removes the *organizational* blocker, not the *technical* one. Inventing the structure doesn't make it correct — it hides the divergence until integration, then you redo it. No source still means STOP. If truly blocked, bind to a **named existing component/convention** to reuse, or get even a rough frame — don't fabricate. |

## Red flags — STOP and start over

- Specifying component layout/boundaries without having opened the design source.
- "The visual layer can come later." / "A reviewer can sign off the logic before visuals exist."
- "No mockup, so I'll use sensible defaults."
- Deriving component structure from spec text alone.
- "We're authorized to invent now and adjust later." / "The designer is out and the deadline is fixed."

All of these mean: get the design source and bind to it first. If there is no source, STOP and ask — do not invent.
