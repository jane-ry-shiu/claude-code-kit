# Error Handling & Boundary States

## Three Required States

Every component that depends on asynchronous data or external input must handle:

| State | What to render | Common mistake |
|-------|---------------|----------------|
| **Loading** | Skeleton, spinner, or placeholder | Rendering stale data or nothing while fetching |
| **Empty** | Meaningful empty message with optional action | Blank area with no explanation |
| **Error** | Error message with retry option when applicable | Unhandled exception crashes the page |

A component may not need all three (e.g., a pure presentational component with no async), but the decision must be conscious, not accidental.

## Defensive Props

| Rule | Core | Red Flag |
|------|------|----------|
| **Fallback for optional props** | Provide sensible defaults; don't assume optional props are always present | `props.items.length` without checking if `items` is undefined |
| **Type mismatch resilience** | Guard against wrong types reaching the component at runtime | Component crashes because parent passes string where number expected |
| **Validator for constrained values** | Use prop validators for enum-like props | `variant` prop accepts any string but only 3 values are valid |

## Async Lifecycle Safety

| Rule | Core | Red Flag |
|------|------|----------|
| **Cancel on unmount** | Abort pending requests or ignore their results when component unmounts | `setState` / ref assignment after component is destroyed |
| **Race condition guard** | When multiple async calls can overlap (e.g., rapid filter changes), only apply the latest result | Stale response overwrites newer data |
| **Error boundary** | Errors in one component should not crash the entire page | Unhandled promise rejection in a card component takes down the whole dashboard |

### Async Cleanup Pattern (Conceptual)

```
on mount or trigger:
  create abort controller (or set "active" flag)
  start async operation with abort signal

on unmount or re-trigger:
  abort previous controller (or set flag to false)
  ignore results from aborted operation
```
