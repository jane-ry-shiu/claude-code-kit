---
name: vue-best-practices
description: Use when writing, modifying, or reviewing Vue component/page code — enforces Vue best practices covering template, reactivity, performance, communication, and props/emits design. Supports both Composition API and Options API.
---

# Vue Best Practices

## Overview

Universal Vue best practice rules for any Vue 3 project. When a project-specific skill (e.g., `reseller-component-development`) defines conflicting rules, the project-specific skill takes precedence.

**API Style Preference**: Composition API (`<script setup>`) is the recommended default. Use Options API only when the project cannot support Composition API (e.g., legacy Vue 2 codebase). Both styles are covered with equal depth.

## Trigger Conditions

**Passive mode auto-triggers when:**

- Creating or modifying `.vue` files
- Creating or modifying composables / mixins

**Active mode triggers when:**

- User explicitly requests a Vue best practice review

**Does NOT trigger when:**

- Pure CSS/SCSS changes with no template or script changes
- Configuration files (vite.config, eslint config, etc.)
- Non-Vue JS/TS utility files with no Vue API usage

## Mode

### Passive Mode

Silently apply rules during development. Only surface a warning for CRITICAL or HIGH violations:

> **Vue Best Practice — [Rule Name]**: [One-sentence issue + consequence]. Recommend [alternative]. Proceed with current approach, or adjust?

### Active Mode

1. **Confirm scope** — Which files/components to review
2. **Detect API style** — Load corresponding reference ([composition-api.md](references/composition-api.md) or [options-api.md](references/options-api.md))
3. **Evaluate** — Check against universal rules (below) + API-style-specific rules
4. **Produce report** — Use report format below
5. **Wait for user confirmation** — Do not change code until approved

#### Report Format

```
### Vue Best Practice Review: [file/component name]

| # | Category | Severity | Issue | Suggestion |
|---|----------|----------|-------|------------|
| 1 | Template | HIGH     | ...   | ...        |

Severity levels: CRITICAL / HIGH / MEDIUM / LOW
```

#### Severity Guide

- **CRITICAL**: Causes bugs, memory leaks, shared state contamination, or security issues. Immediate fix required.
- **HIGH**: Significant anti-pattern causing maintenance pain or performance degradation. Fix before merging.
- **MEDIUM**: Suboptimal practice. Fix when convenient.
- **LOW**: Minor style preference. Optional.

## Reference Dispatch

| Trigger | Indicator | Reference |
|---------|-----------|-----------|
| Composition API | `<script setup>`, `setup()`, `ref()`, `reactive()`, `defineProps()` | [composition-api.md](references/composition-api.md) |
| Options API | `data()`, `methods:`, `computed:`, `watch:` as component options | [options-api.md](references/options-api.md) |
| Component interface design (props, events, slots) | Creating or reviewing component public API | [component-api-design.md](references/component-api-design.md) |

If a file mixes both API styles, load both references.

## Review Dimensions

When loaded by `code-review`, these dimensions must be checked for every applicable `.vue` file (page-level files still checked for template and reactivity rules; component-specific rules like options ordering apply to non-page `.vue` only):

1. **Options ordering** — Options follow standard order (or project ESLint config)
2. **Reactivity correctness** — Computed vs watch vs method usage is appropriate; no watcher for purely derived state
3. **Template rules** — v-if/v-for separation, stable keys, expression complexity
4. **Props/Emits declaration** — Complete declarations, no prop mutation
5. **Anti-patterns** — No prop mutation (CRITICAL), no implicit parent-child coupling, no global event bus

## Universal Rules (API-Style Independent)

### Template

| Rule | Core | Red Flag |
|------|------|----------|
| **v-if and v-for separation** | Never use `v-if` and `v-for` on the same element — in Vue 3 `v-if` evaluates first and cannot access `v-for` scope | `<div v-for="item in list" v-if="item.active">` |
| **v-for requires stable key** | Always provide a unique, stable `:key` — never use array index on mutable lists | `:key="index"` on lists that can be reordered, added, or removed |
| **v-if vs v-show** | `v-if` for rarely toggled; `v-show` for frequently toggled | `v-if` on elements toggling every few seconds; `v-show` on heavy components rendered once |
| **Simple template expressions** | Extract complex logic to computed or methods — template expressions should be glanceable | Chained ternaries, arithmetic with business logic, string concatenation building display values |
| **Component PascalCase** | Use PascalCase for components in SFC templates | `<my-component>` instead of `<MyComponent>` |
| **Self-closing components** | Self-close components with no slot content | `<MyComponent></MyComponent>` with no children |
| **Multi-attribute line breaks** | Elements with 3+ attributes: one attribute per line | 4+ attributes on a single line |
| **No direct DOM manipulation** | Use Vue reactivity and directives, not `document.querySelector` or `getElementById` | Direct DOM queries inside components |

### Performance

| Rule | Core | Red Flag |
|------|------|----------|
| **Lazy load routes and heavy components** | Use dynamic `import()` for route components and large components | All route components statically imported |
| **v-once for static content** | Use `v-once` on content that never changes after initial render | Large static blocks re-evaluated every render |
| **v-memo for list optimization** | Use `v-memo` on `v-for` lists where most items stay unchanged between renders | Large lists fully re-rendering when few items change |
| **Event listener cleanup** | Manually added `addEventListener` must have matching `removeEventListener` on unmount | `addEventListener` in mounted without cleanup in unmounted |
| **Debounce high-frequency handlers** | Debounce/throttle scroll, resize, input handlers that trigger expensive work | Raw `@scroll`/`@input` firing API calls or heavy computation on every event |

### Naming Conventions

| Rule | Core | Red Flag |
|------|------|----------|
| **Multi-word component names** | Component names must be multi-word to avoid HTML element conflicts | `<Button>`, `<Table>`, `<Input>` — use `<AppButton>`, `<DataTable>`, `<FormInput>` |
| **Boolean prop prefix** | Prefix boolean props with `is`, `has`, `can`, `should` | `<Modal active>` instead of `<Modal isActive>` |
| **Event kebab-case** | Emitted events use kebab-case with action verb prefix | `$emit('itemUpdated')` instead of `$emit('item-updated')` |
| **Composable `use` prefix** | Composables must start with `use` | `auth.js` as composable without `use` prefix |
| **PascalCase SFC filenames** | SFC files use PascalCase: `MyComponent.vue` | `my-component.vue`, `myComponent.vue` |

### Anti-Patterns

| Anti-Pattern | Severity | Why It's Bad | Alternative |
|--------------|----------|-------------|-------------|
| **Mutating props** | CRITICAL | Breaks one-way data flow; causes warnings and unpredictable state | Emit event for parent to update, or use local copy |
| **Watcher for derived state** | HIGH | Unnecessary complexity and timing issues when `computed` would suffice | Use `computed` for values purely derived from reactive state |
| **Implicit parent-child coupling** | HIGH | `$parent`/`$root` access breaks when hierarchy changes | Use props/emits or provide/inject |
| **Deep prop drilling (3+ levels)** | MEDIUM | Intermediate components carry props they don't use | Use `provide`/`inject` or state management |
| **Business logic in templates** | MEDIUM | Hard to test, hard to read, duplicated across templates | Extract to computed properties or methods |
| **Global event bus** | HIGH | Untraceable, no type safety, memory leak risk | Props/emits, provide/inject, or state management |
