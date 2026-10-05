# State Boundaries

## Decision Framework

Where should this state live?

| Question | If Yes → | Example |
|----------|----------|---------|
| Only this component cares about it? | **Local state** (ref, useState) | Dropdown open/close, hover, input draft |
| Sibling components need it? | **Lift to nearest common parent** | Selected tab shared between tab bar and tab content |
| Needed across routes or after navigation? | **Global store** (Pinia, Redux, Zustand) | Current user, auth token, org context |
| Should survive page refresh or be shareable via URL? | **URL state** (query params, route params) | Search filters, pagination page, active tab ID |
| Derived from other state? | **Computed / derived** — not stored separately | Filtered list derived from items + search query |

## Anti-Patterns

| Anti-Pattern | Severity | Why It's Bad | Alternative |
|--------------|----------|-------------|-------------|
| **Everything in global store** | HIGH | Components become untestable in isolation; store becomes a god object | Use local state by default, promote to store only when needed |
| **Duplicated state** | HIGH | Same data in local state AND store — they drift out of sync | Single source of truth; derive or reference, don't copy |
| **Ephemeral UI state in store** | MEDIUM | Modal open/close, tooltip visibility stored globally — pollutes store with transient concerns | Keep in local state unless another component must react to it |
| **Forgetting URL state** | MEDIUM | Filters, pagination, selected tab not reflected in URL — user loses context on refresh or share | Push meaningful view state to URL params |
| **Derived state stored separately** | MEDIUM | Storing a filtered list alongside the original list — must manually keep in sync | Use computed/selector to derive on the fly |

## Promotion Path

State should start local and only be promoted when there is a concrete need:

```
Local state (component)
  ↓ sibling needs it
Lifted state (parent)
  ↓ distant components need it, or survives navigation
Global store
  ↓ must be shareable / bookmarkable
URL state
```

Do not skip levels preemptively. "We might need it globally later" is not a reason to start in the store.
