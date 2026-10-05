---
name: jsdoc-documentation
description: Use when writing, modifying, or reviewing JS/Vue code in non-TypeScript projects, or when asked to scan and backfill JSDoc for modules or folders
---

# JSDoc Documentation

## Overview

Enforce comprehensive English JSDoc comments with TypeScript-flavored type annotations. Applies to all `.js` files and `.vue` files without `lang="ts"`. Two modes: passive (during development) and active (scan and backfill).

## Core Principles

**Describe what is NOT obvious from the code** (A Philosophy of Software Design, Ch.13):

1. **Don't repeat the code** — If someone could write the comment just by reading the function name and parameters, the comment adds no value. Use different words than the entity name; explain what the reader can't deduce from the signature alone.

2. **High-level abstraction first** — The first sentence should describe behavior as perceived by callers or the problem the module solves. Don't describe internal implementation.

3. **Lower-level precision where it matters** — Document: units (px, ms, bytes), boundary conditions (inclusive/exclusive), null/undefined meaning, side effects, preconditions, invariants (reference identity, lifecycle/staleness, sync model, error behavior).

4. **Interface ≠ Implementation** — JSDoc is interface documentation. It describes what users need to know to USE the artifact. Internal mechanics belong in inline `//` comments, not JSDoc.

5. **Variables: what it represents, not how it's manipulated** — State descriptions should name the business concept, not enumerate when it gets set/unset.

### Anti-Patterns

| ❌ Bad | Why | ✅ Better |
|--------|-----|-----------|
| `Removes a key from object` (for `removeKeyFromObject`) | Repeats the name | `Returns a shallow copy excluding the specified key, leaving the original unchanged` |
| `@param {string} key - The key` | Repeats param name | `@param {string} key - Property name to exclude from the result` |
| `Uses Redis cache internally` | Implementation leak | Omit — callers don't need this |
| `Set to true when heartbeat received` | Describes manipulation | `Whether a heartbeat arrived since the last election timer reset` |

## Passive Mode

When developing or modifying `.js` / `.vue` files:

1. **New artifact** — must include complete JSDoc
2. **Modified artifact** — no JSDoc? Add it. Non-compliant? Fix it. Compliant? Leave it.
3. **No spreading** — only process artifacts touched by the current change

Non-compliant patterns: missing type, bare `Object`, bare `Array`, bare `@returns` (no type), missing description on public API, description that merely restates the entity name.

### Public vs Internal

| Indicator | Classification | Detail Level |
|-----------|---------------|--------------|
| `export` keyword | Public | Full description required |
| `defineProps` / `defineEmits` / `defineExpose` | Public | Full description required |
| No `export`, `_` prefix, class private | Internal | Type-only acceptable |

## Active Scan Mode

When user requests a scan (e.g., "scan `src/utils/` and backfill JSDoc"):

1. Scan all `.js` / `.vue` files in target scope
2. Identify missing or non-compliant JSDoc
3. Output summary report with counts and issue types
4. Ask user: (a) fix all, (b) select which to fix, (c) report only
5. Execute based on choice

## Exclusions

- `.ts` / `.tsx` files
- `.vue` files with `<script setup lang="ts">` or `<script lang="ts">`
- Auto-generated files (mock handlers, generated code)
- JSON / config files
- JSDoc applies only to `<script>` / `<script setup>` blocks, not `<template>` or `<style>`

## Artifact Templates

### Exported Function

```js
/**
 * Returns a shallow copy of the object with the specified key removed,
 * leaving the original unchanged.
 *
 * @template {Record<string, any>} T
 * @template {keyof T} K
 * @param {T} obj - Source object (not mutated)
 * @param {K} keyToRemove - Property name to exclude from the result
 * @returns {Omit<T, K>} New object without the specified key
 */
export function removeKeyFromObject(obj, keyToRemove) { ... }
```

### Internal / Private Function

```js
/**
 * @param {string} key
 * @returns {boolean}
 */
function _isValidKey(key) { ... }
```

### Class

```js
/**
 * Resolves authentication tokens and API domain prefixes per service context.
 * Singleton per key — repeated construction with the same key returns the existing instance.
 */
class ApiServiceStrategy extends IApiServiceStrategy {
  /**
   * Token strategies mapped by key, with 'default' as fallback.
   * @type {Record<string, ITokenStrategy>}
   */
  _tokenStrategies;

  /**
   * @param {Object} params
   * @param {Record<string, ITokenStrategy>} params.tokenStrategies - Must include 'default' key
   * @param {Record<string, string>} params.prefixDomains - Must include 'default' key
   * @param {string} params.key - Singleton identity; same key returns cached instance
   */
  constructor({ tokenStrategies, prefixDomains, key }) { ... }

  /**
   * Retrieves an authentication token using the configured strategy for this service.
   *
   * @param {Object} [params]
   * @param {AbortSignal} [params.signal] - Cancels the token request when aborted
   * @returns {Promise<string>} Resolved token value
   */
  async getToken({ signal } = {}) { ... }
}
```

### Vue Component API (Props / Emits / Expose)

```js
const props = defineProps({
  /** Device MAC address used to fetch device-specific data @type {string} */
  mac: { type: String, required: true },

  /** Visual severity level for the alert banner @type {('success' | 'error' | 'warning')} */
  alertType: { type: String, default: 'success' },

  /** Active subscription plans; empty array when device has no plans @type {Array<import('@/api/device').DevicePlan>} */
  plans: { type: Array, default: () => [] },
});

const emit = defineEmits({
  /** Fires after successful validation and submission @type {(payload: { id: string, data: Record<string, any> }) => void} */
  submit: null,
  /** Fires when user dismisses the dialog @type {() => void} */
  close: null,
});

defineExpose({
  /** Whether all password rules pass @type {import('vue').ComputedRef<boolean>} */
  isValid: computed(() => ...),
});
```

### Composable / Store

```js
/**
 * Provides form state management with reactive data, reset, and update capabilities.
 *
 * @template T
 * @param {T} originalFormData - Initial form shape used as the reset baseline
 * @returns {{ formData: import('vue').Reactive<T>, resetForm: () => void, updateOriginalFormData: (newFormData: T) => void }}
 */
const useForm = (originalFormData) => { ... };

export const useDeviceStore = defineStore('device', () => {
  /** All devices for the current organization, empty until first fetch @type {import('vue').Ref<Array<DeviceItem>>} */
  const devices = ref([]);

  /**
   * Fetches and replaces the device list for the given organization.
   * Clears existing data before populating with fresh results.
   *
   * @param {Object} params
   * @param {string} params.organizationId - Target organization ID
   * @param {import('@/type').BaseApiQuery<'name' | 'mac'>} params.query - Pagination and sort options
   * @returns {Promise<void>}
   */
  const fetchDevices = async ({ organizationId, query }) => { ... };
});
```

### Constants / EnumFactory

```js
/**
 * License type enumeration.
 *
 * @typedef {object} LICENSE_TYPE_ENUM
 * @property {string} CAMERA - Standard camera license
 * @property {string} NVR - Network video recorder license
 * @property {string} CLOUD_BACKUP - Cloud backup storage license
 */
export const LICENSE_TYPE = EnumFactory({ ... });
```

### VO / DTO (API Layer)

```js
/**
 * Transforms raw API response into a normalized device view model.
 *
 * @param {Object} raw - Raw API response object
 * @param {string} raw.mac_address - Device MAC from API
 * @param {string} raw.device_name - Device name from API
 * @param {Array<{plan_type: string, started_at: string, ended_at: string}>} raw.plans - Raw plan list
 * @returns {DeviceItemForCamera} Normalized device view model with consistent property names
 */
export const DeviceVO = (raw) => { ... };
```

## Bare Type Prohibition

`Object`, `Array<Object>`, and bare `Array` are never valid as final types.

**Exception:** `@param {Object} params` is acceptable when followed by `@param {type} params.subProp` lines.

**Note:** `@typedef {object}` (lowercase) with `@property` lines defines a named shape — not a violation.

| Rule | Example |
|------|---------|
| Bare `Object` | ❌ `@param {Object} data` — expand or use typedef |
| Bare `Array<Object>` | ❌ `@param {Array<Object>}` — specify element type |
| Bare `Array` | ❌ `@param {Array}` — must have type param: `Array<string>` |
| Object with sub-props | ✅ `@param {Object} params` + `@param {string} params.id` |
| Typedef object | ✅ `@typedef {object} Config` + `@property` lines |

Guideline: ≤ 3 properties can be inlined; > 3 should use `@typedef`.

## TS-Flavored JSDoc

### Allowed Syntax

| Syntax | Usage | When |
|--------|-------|------|
| Union | `{('success' \| 'error')}` | Specific values only |
| Generic | `@template T`, `@template {string} T` | Composables, utilities |
| `keyof` | `{keyof import(...).TYPE}` | Key set from object |
| `Omit`/`Pick`/`Partial` | `{Omit<T, K>}` | Object transforms |
| `Record` | `{Record<string, boolean>}` | Key-value maps |
| `import()` | `{import('@/type').X}` | Cross-file refs |
| Intersection | `{Base & { extra: string }}` | Extend types |
| Tuple | `{[string, number]}` | Fixed arrays |
| Indexed access | `{ENUM[KEY]}` | Value type extraction |
| Conditional | Avoid | Split into typedef |

### Vue Types

```js
/** @type {import('vue').Ref<string>} */
const name = ref('');

/** @type {import('vue').ComputedRef<boolean>} */
const isValid = computed(() => ...);
```

Simplify repeated imports with typedef:
```js
/** @template T @typedef {import('vue').Ref<T>} Ref */
/** @template T @typedef {import('vue').Reactive<T>} Reactive */
```

### Selection Principle

Pure JSDoc can express it → use pure JSDoc. Too verbose → use TS syntax. Too complex → extract `@typedef`.

### Typedef Placement

| Scenario | Location |
|----------|----------|
| Single file only | Top of same file |
| Cross-file | Follow project convention; name must be identical everywhere |

## Optional Tags

| Tag | When |
|-----|------|
| `@example` | Optional; improves understanding |
| `@throws` | Optional; non-obvious error behavior |
| `@see` / `@link` | Reference URLs (API Dog, Confluence), or cross-module design decisions |
| `@description` | Unnecessary — first line is the description |

**Cross-module decisions:** When a design decision spans multiple files, document it in the most central location and use `@see` from other files to point there.

## Review Dimensions

When loaded by `code-review`, check for every applicable file (`.js` and `.vue` without `lang="ts"`):

1. **Existence** — New/modified public artifacts have JSDoc
2. **Type correctness** — No bare `Object`, `Array`, or untyped `@returns`
3. **Description quality** — Summary adds information beyond the entity name; describes caller-perceived behavior, not implementation. Specifically check these sub-dimensions:
   - **Invariants** — Reference identity guarantees (same object vs new copy per access), immutability contracts (frozen, sealed), structural guarantees ("always contains at least one entry")
   - **Lifecycle/staleness** — When a returned value becomes invalid or stale (e.g., after calling another method), who is responsible for refreshing
   - **Sync model** — Whether an operation is synchronous or asynchronous, if not obvious from the signature (no `async`, no `Promise` return type)
   - **Error behavior** — Non-obvious throws (e.g., TypeError from frozen objects, throws on invalid state) that callers must handle or expect

## Quality Checklist

### Exported / Public

- [ ] Summary sentence uses different words than the entity name and adds non-obvious information
- [ ] First sentence describes behavior as perceived by callers (not internal mechanics)
- [ ] All `@param` with types and descriptions that explain purpose, not just restate the name
- [ ] No bare `Object`, `Array<Object>`, or `Array`
- [ ] `@returns` with type and description (non-void)
- [ ] Values with units annotated (px, ms, bytes, etc.)
- [ ] null/undefined return or param meaning documented
- [ ] Side effects stated in description when present
- [ ] Reference identity documented when getter/method returns cached or shared object (same ref vs new copy)
- [ ] Lifecycle/staleness documented when returned values can become invalid after other operations
- [ ] Sync/async model stated when not obvious from signature (no `async` keyword, no `Promise` type)
- [ ] Non-obvious error behavior documented (throws from frozen objects, invalid state, type misuse)
- [ ] Union literal types for specific values, not broad `string`
- [ ] Lowercase primitives (`string`, `number`, `boolean`)
- [ ] `@see` / `@link` when reference URLs provided or cross-module decisions apply
- [ ] Typedefs align with API spec; discrepancies documented with reason
- [ ] `@property` optional markers reflect actual runtime behavior
- [ ] Parameter interactions (conflicts, dependencies) explained
- [ ] All comments in English

### Internal / Private

- [ ] All `@param` with types (descriptions optional)
- [ ] No bare `Object`, `Array<Object>`, or `Array`
- [ ] `@returns` with type (non-void)
- [ ] Lowercase primitives
