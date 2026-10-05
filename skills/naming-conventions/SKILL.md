---
name: naming-conventions
description: Use when writing, modifying, or reviewing JS/TS/Vue code that involves naming functions, parameters, variables, class methods, or enums — enforces business-context naming over implementation-detail naming. Also invokable standalone via "use skill - naming-conventions" for targeted naming review.
---

# Naming Conventions

## When to Use

- Loaded by `code-review` automatically (mandatory skill when `.js/.ts/.vue` files change)
- User invokes manually: `use skill - naming-conventions`
- User specifies during code-review: "也要檢查 naming-conventions"

## Process (Standalone Mode)

1. **Determine scan scope:**
   - User specifies files/folders → use directly
   - No specification → `git diff --name-only HEAD`, filter to `.js/.ts/.vue`
   - If no changed files → report "沒有偵測到變更檔案" and stop
2. **Read each file**, evaluate all function/variable/parameter/enum names against Rules 1-7
3. **Emit findings via `code-review`.** 本 skill 是規則 skill，不自排 finding 格式。要格式化的 naming review，經 `code-review`（或 `review-workflow`）執行、只載本規則；finding 由 code-review 的統一模板排版（與其他 rule skill 一致）。

## Core Principle

**Names reflect business context (Why), not implementation details (What).**

Implementation details change; business context is stable. Naming coupled to implementation causes cascading renames when behavior changes.

## Quick Reference

| Severity | Condition | Action |
|----------|-----------|--------|
| MEDIUM | Name coupled to implementation details | Suggest rename |
| MEDIUM | Business-logic name missing behavioral comment | Require comment |
| LOW | Better naming exists but current name is acceptable | Suggest improvement |

## Rules

### 1. Business Context Over Implementation Details

**Scope: variables and functions only.** Does not apply to component props or CSS/style — those follow their own conventions (vue-best-practices, component-general-principles).

```js
// ❌ Coupled to implementation — rename needed if permissions change
const isViewDeleteOnly = ...

// ✅ Describes business scenario — stable name
// When subscription renewal is overdue, only view and delete operations are available
const isRenewalOverdueMode = ...
```

```js
// ❌ Stacks multiple operations
const canEditAndCreate = ...

// ✅ Abstracts to business state
const isActiveSubscription = ...
```

### 2. Business Logic Names Require Behavioral Comments

**Scope: variables and functions only.** Does not apply to component props or CSS/style.

Names carrying business-logic semantics that are **not self-evident from the name alone** must have an inline comment directly above the declaration. The comment must cover:

1. **Business rule** — why this state/condition exists
2. **UI/UX behavior** — what changes on screen when this is active

Comments must be in **English**.

**Applies to:** variables, computed properties, and functions whose names encode a business scenario (e.g. `isRenewalOverdueMode`, `shouldShowUpgradePrompt`, `resolveActiveDeviceList`).

**Does NOT apply to:** self-evident names where behavior is obvious from the name (`isVisible`, `isLoading`, `hasPermission`).

**Severity: MEDIUM** — missing comment is a finding.

```js
// ❌ Missing behavioral comment
const isRenewalOverdueMode = computed(() => ...)

// ❌ Comment only describes UI — missing business rule
// Only view and delete operations are available
const isRenewalOverdueMode = computed(() => ...)

// ❌ Comment only describes business rule — missing UI behavior
// Subscription renewal has passed the grace period
const isRenewalOverdueMode = computed(() => ...)

// ✅ Both business rule and UI behavior
// When subscription renewal is overdue, only view and delete operations are available
const isRenewalOverdueMode = computed(() => ...)
```

### 3. No Stacking Operations/Conditions in Names

Names like `isViewDeleteOnly` pack multiple operations into one identifier. Abstract into a single scenario concept.

### 4. API Function Exception

Pure data-access functions use `verb + resource` — no forced business context:

```js
// ✅ Pure data access
getOrganizationItems()
createUser()
deleteDevice()
```

API functions with business logic (combining APIs, conditional logic) use business context naming:

```js
// ❌ Has business logic but named like data access
async function getAndFilterActiveDevices() { ... }

// ✅ Business context
async function resolveActiveDeviceList() { ... }
```

### 5. Casing

| Target | Casing | Example |
|--------|--------|---------|
| function / method / parameter / variable | camelCase | `fetchUserProfile` |
| enum value | UPPER_CASE | `DEVICE_STATUS` |

### 6. Semantic Prefixes

| Category | Prefix | Example |
|----------|--------|---------|
| Boolean | `is`, `has`, `should`, `can` | `isVisible`, `hasPermission` |
| Event handler | `handle` | `handleClick` |
| Async (data access) | action verb | `fetchUser`, `loadData` |
| Getter | `get` | `getUserName` |
| Array | plural noun | `users`, `items` |

### 7. Project Rules Take Precedence

If the project's README, coding guide, or observable codebase conventions define naming rules, those take precedence — **except** Rule 1 (business context naming) always applies.

## Review Dimensions

Applies to: `.js`, `.ts`, `.vue` files (non-config)

| Dimension | What to Check |
|-----------|---------------|
| Business context naming | Names describe scenario/state, not implementation details or operation lists |
| Comment supplementation | Business-logic names have English comments explaining both business rule and UI/UX behavior |
| API function naming | Pure data-access uses verb+resource; business-logic API uses context naming |
| Casing compliance | camelCase for functions/methods/params/variables; UPPER_CASE for enums |
| Semantic prefix | Booleans use `is/has/should/can`; handlers use `handle`; arrays use plural |

## Scope

function name, parameter name, variable name, class method name, enum value.
