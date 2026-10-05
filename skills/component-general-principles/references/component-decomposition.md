# Component Decomposition

## When to Split

These signals suggest a component should be broken into smaller pieces:

| Signal | Explanation |
|--------|-------------|
| **Mixed concerns** | Component simultaneously handles layout, data fetching, user interaction, and conditional rendering |
| **Multiple actors** | Different requirements (e.g., admin vs user view) would cause changes to the same component for unrelated reasons |
| **Reuse opportunity** | A visual block appears in 2+ places with the same structure but different data |
| **Testability barrier** | Cannot write a meaningful unit test without mocking half the component's internals |
| **Excessive template conditionals** | Template has 4+ `v-if` / ternary branches controlling entirely different visual structures |

## When NOT to Split

| Signal | Explanation |
|--------|-------------|
| **Single consumer** | Extracted component would only be used by one parent, and its props mirror the parent's internal state (shallow wrapper) |
| **Props ≈ internal state** | The child's prop count approaches the parent's state count — you moved complexity, not reduced it |
| **Forced context dependency** | Child cannot render or test without parent-specific context (inject, store slice) — extraction is artificial |
| **Readability loss** | Reader must jump between 3+ files to understand one visual block that was previously inline |

## Validation Test

After splitting, verify the extraction was worthwhile:

```
1. Can the new component be tested independently without mocking its parent?
2. Does the new component have fewer props than the parent had internal state for that region?
3. Does the new component have a clear, single-sentence purpose?

If any answer is NO → reconsider the split.
```

## Common Mistake: Wrapper Hell

Extracting components purely for "organization" without reducing complexity:

```
❌ PageDashboard
    → DashboardContent        (passes all props through)
        → DashboardBody       (passes all props through)
            → DashboardCards  (finally does something)

✅ PageDashboard
    → DashboardCards          (direct child, clear purpose)
```

Each layer must provide a different abstraction level. Pass-through wrappers are shallow modules — they add interface cost without hiding complexity.

## Prefer Existing Shared Components

When reviewing or creating a new component, search the project for existing components with overlapping purpose. Use keyword synonyms (e.g., notification → alert, toast, snackbar, banner) and functional signatures (similar props, emits) to find candidates.

**Only create new when:**
1. No existing component serves the same purpose
2. The existing component would require invasive changes that break other consumers
3. The use case is fundamentally different despite visual similarity

**Review check:** Flag duplication as HIGH severity.
