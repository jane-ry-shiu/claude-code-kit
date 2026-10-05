# Scope Boundary

Decompose the source into its constituent surfaces; list each as an addressable item with a status.

**Group by UI-pattern type, not by module name.** First ground each surface in the real code (**REQUIRED: `codebase-grounding.md`**) and classify its pattern — where the control lives + how it's built. Then group same-type surfaces together (they share components and should slice together), and fold in the untracked same-pattern surfaces you found. Do NOT let the spec's module/page names dictate the grouping: that axis hides shared implementation and splits one real unit of work across modules.

Apply the one-logical-unit lens (see `change-scoping.md`): flag where one spec packs multiple patterns/features, and what "shouldn't be bundled."

**Scope gate:** batch-produce the scope list; the user confirms in/out. The confirmed `in-this-round` set gates what Phase 3 deep-assesses — do not deep-assess `not-this-round` / `deferred` items.
