---
name: component-general-principles
description: Use when creating, modifying, or reviewing UI components — enforces framework-agnostic principles covering error handling, state boundaries, decomposition, performance, and CSS class naming (BEM)
---

# Component General Principles

## Overview

Framework-agnostic component development principles. Covers areas not addressed by framework-specific skills (vue-best-practices) or design-level skills (software-design-principles). Applies to any component-based UI project (Vue, React, Svelte, etc.).

## Trigger Conditions

**Passive mode auto-triggers when:**

- Creating or modifying UI component files (`.vue`, `.jsx`, `.tsx`, `.svelte`)
- Reviewing component code

**Active mode triggers when:**

- User explicitly requests a component principles review

**Does NOT trigger when:**

- Pure utility/helper functions with no UI
- Configuration files
- Backend code

## Mode

### Passive Mode

Silently apply rules during development. Flag CRITICAL or HIGH violations:

> **Component Principle — [Rule Name]**: [One-sentence issue + consequence]. Recommend [alternative]. Proceed with current approach, or adjust?

### Active Mode

1. Confirm scope
2. Load relevant references
3. Evaluate against all rules
4. Produce report (same format as vue-best-practices)
5. Wait for user confirmation

## Reference Dispatch

| Trigger | Reference |
|---------|-----------|
| Component state handling, empty/loading/error states, defensive props | [error-and-boundary-states.md](references/error-and-boundary-states.md) |
| New component creation, checking for existing duplicates | [component-decomposition.md](references/component-decomposition.md) |
| Deciding where state lives (local, lifted, global, URL) | [state-boundaries.md](references/state-boundaries.md) |
| Splitting or merging components | [component-decomposition.md](references/component-decomposition.md) |
| Render performance, large lists, lazy loading | [performance.md](references/performance.md) |
| CSS class naming, BEM structure | [bem-naming.md](references/bem-naming.md) |

Load only the references relevant to the current task.

## Review Dimensions

When loaded by `code-review`, these dimensions must be checked for every applicable component file (`.vue`, `.jsx`, `.tsx`; excluding page-level `.vue` per code-review Step 3b):

1. **Three-state handling** — Loading, error, and empty states all handled; error state includes retry/recovery mechanism
2. **Render-time allocation** — No unnecessary object/array creation in computed or template
3. **Existing component reuse** — No duplication of existing shared components
4. **Async cleanup** — Async operations cancelled or ignored after unmount

## Quick Reference

| Principle | Core | Red Flag |
|-----------|------|----------|
| **Empty / Loading / Error states** | Every data-driven component handles all three states explicitly | Component renders blank or crashes when API returns empty or error |
| **Defensive props** | Validate or fallback for unexpected prop values | Component crashes on `undefined` or wrong-type prop |
| **Async cleanup** | Cancel or ignore async results after unmount | State update on unmounted component — memory leak or warning |
| **State locality** | State lives at the lowest level that needs it | All UI toggle states stored in global store |
| **URL state for shareable views** | Filter, pagination, tab selection → URL params | User refreshes page and loses all filter selections |
| **Decomposition signal** | Split when a component handles layout + data fetching + interaction + conditional rendering simultaneously | 500-line component with mixed concerns |
| **No shallow wrappers** | Don't extract a component that only passes through props to a single child | Wrapper with 8 props that maps 1:1 to child props |
| **Avoid render-time allocations** | Don't create new objects, arrays, or functions inside template/render | `<Child :style="{ color: 'red' }" />` on every render — creates new object |
| **Virtual scroll for large lists** | Use virtual scrolling when rendering 100+ items | `v-for` / `.map()` rendering 1000 DOM nodes |
| **BEM class naming** | `block__element--modifier` with kebab-case block names | `.cardHeader`, `.card-header-active`, mixed conventions |
| **Prefer existing shared components** | When reviewing a new component, search the project for existing components with overlapping purpose before evaluating code quality | Developer creates a new notification component when the project already has a snackbar/banner with equivalent functionality |
