# Composition API Best Practices

Rules specific to Vue 3 Composition API (`<script setup>` or `setup()` function).

## Script

| Rule | Core | Red Flag |
|------|------|----------|
| **Prefer `<script setup>`** | Use `<script setup>` over `setup()` for conciseness and better type inference | `setup()` with manual return object when `<script setup>` is available |
| **Macro ordering** | Consistent order: `defineOptions` → `defineModel` → `defineProps` → `defineEmits` → `defineSlots` → `defineExpose` | Macros scattered between other logic |
| **Group by logical concern** | Organize code by feature/concern, not by API type | All `ref()` at top, all `computed()` in middle, all `watch()` at bottom — mimicking Options API |
| **Extract composables for reuse** | Extract to `use*` composable when logic is reused across 2+ components or a single component exceeds ~200 lines of setup logic | Duplicated reactive logic; monolithic setup blocks |
| **Composable single responsibility** | Each composable encapsulates one logical concern | `useUserAndPermissionsAndNotifications()` — split into `useUser`, `usePermissions`, `useNotifications` |
| **Composable return convention** | Return object with `ref` values (not `reactive`) so callers can destructure without losing reactivity | Returning `reactive()` object — destructuring breaks reactivity |
| **Lifecycle hooks near related logic** | Place `onMounted`, `onUnmounted` etc. next to the logic they serve | All lifecycle hooks clustered at file bottom, disconnected from related code |
| **Top-level await requires Suspense** | `await` in `<script setup>` requires `<Suspense>` boundary in parent | Top-level `await` without parent `<Suspense>` — component never renders |

## Reactivity

| Rule | Core | Red Flag |
|------|------|----------|
| **`ref` for primitives, `reactive` for grouped object state** | `ref()` for primitives and values that may be reassigned; `reactive()` for object state that won't be reassigned | `reactive()` for a single boolean; deeply nested `.value.nested.prop` access |
| **Never reassign `reactive`** | Reassigning replaces the proxy and breaks all reactive bindings | `state = { ...newState }` — use `Object.assign(state, newState)` |
| **Destructuring loses reactivity** | Destructuring `reactive` or composable returns creates plain non-reactive values | `const { count } = reactive({ count: 0 })` — use `toRefs()` or keep object reference |
| **`toRefs`/`toRef` for prop decomposition** | Use `toRefs(props)` or `toRef(props, 'name')` when passing props to composables | Passing `props.name` directly — loses reactivity on parent update |
| **`shallowRef` for large non-reactive structures** | Use `shallowRef` when only top-level reference change matters | `ref()` on large dataset where deep tracking is unnecessary and costly |
| **`computed` for derived state** | `computed()` caches and re-evaluates only when dependencies change | `watch` + manual ref update for a value `computed` could express directly |
| **`watch` vs `watchEffect`** | `watch` for specific sources or old/new comparison; `watchEffect` for auto-tracked side effects | `watchEffect` when old value needed; `watch` with long dependency list that `watchEffect` would auto-track |
| **Avoid deep watch on large objects** | `deep: true` recursively traverses entire object every change | Deep watching large array — narrow with `watch(() => obj.specificProp, cb)` |
| **Unnecessary `deep: true`** | Watching a primitive ref or a specific property path does not need `deep: true` | `watch(() => userId, cb, { deep: true })` — `deep` is meaningless on primitives |
| **Stop watchers in non-component contexts** | `watch`/`watchEffect` return a stop function; call it when no longer needed outside component setup | Watchers created in utility functions without stop mechanism — memory leak |

## Props & Emits

| Rule | Core | Red Flag |
|------|------|----------|
| **`defineProps` with types** | Always define prop types and defaults; use runtime or type-based declaration consistently | `defineProps(['title', 'count'])` — array syntax with no type info |
| **`defineEmits` with signatures** | Declare all emitted events with payload types | Emitting events not declared in `defineEmits` |
| **`defineModel` for v-model** | Use `defineModel()` (Vue 3.4+) instead of manual `modelValue` prop + `update:modelValue` emit | Manual v-model pattern when `defineModel` is available |
| **Readonly props** | Never mutate props; use `computed` or local `ref` initialized from prop | `props.list.push(item)` — mutating prop internals |

## Cross-Component Communication

| Rule | Core | Red Flag |
|------|------|----------|
| **Typed `InjectionKey` for provide/inject** | Use `InjectionKey<T>` symbols for type safety and collision avoidance | String-based keys: `provide('user', user)` |
| **Default values for inject** | Always provide default or factory function | `inject('key')` without default — silent `undefined` if provider missing |
| **Provide at lowest common ancestor** | Don't provide at app root unless data is truly global | Component-specific data provided at app level |
| **Prefer props/emits for direct parent-child** | Use provide/inject only when drilling exceeds 2-3 levels | provide/inject between parent and direct child |
