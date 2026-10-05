# Options API Best Practices

Rules specific to Vue Options API (`data`, `methods`, `computed`, `watch` as component options).

## Script

| Rule | Core | Red Flag |
|------|------|----------|
| **Options ordering** | Consistent order: `name` → `components` → `mixins`/`extends` → `props` → `emits` → `data` → `computed` → `watch` → lifecycle hooks (in call order) → `methods`. **ESLint override:** If the project configures `vue/order-in-components` with a different order, the ESLint rule takes precedence — check the project's `.eslintrc*` before flagging ordering violations. If ESLint enforces a different order (e.g. `methods` before `computed`), treat the code as compliant and do NOT report it as a finding. | Random option ordering across components |
| **`data` must be a function** | `data` must return a fresh object to avoid shared state across instances | `data: { count: 0 }` — object literal instead of `data() { return { count: 0 } }` |
| **No arrow functions for options** | Arrow functions bind `this` to parent scope, not component instance | `methods: { handleClick: () => { this.count++ } }` — `this` is undefined |
| **Computed over methods for derived state** | Use `computed` for cached derived values; `methods` for actions and event handlers | Method called in template for a value that should be cached |
| **Limit mixin depth** | Avoid mixin chains deeper than 1 level; document mixin contracts clearly | Mixin extending mixin extending mixin — 3+ levels of inheritance |
| **Mixin naming collision awareness** | Multiple mixins can silently override each other's data/methods/computed | Two mixins both defining `loading` data property — last one wins silently |

## Reactivity

| Rule | Core | Red Flag |
|------|------|----------|
| **Declare all reactive properties in `data`** | Properties needing reactivity must exist in `data()` return object | Adding `this.newProp = value` outside `data()` expecting it to be reactive |
| **Avoid `$forceUpdate`** | Almost always signals a reactivity design problem | Using `$forceUpdate` to work around state not updating |
| **Computed setter for two-way derived state** | Use computed get/set instead of watch + manual data update | `watch` on prop → update local data → emit — computed get/set is cleaner |
| **Name watch handlers** | Extract complex watch logic to named methods | `watch: { value(newVal) { /* 50 lines */ } }` — extract to method |
| **Deep watch with caution** | `deep: true` recursively observes entire object; prefer specific property watchers | Deep watching large form object — watch individual fields instead |
| **`immediate: true` for init logic** | Use `immediate` when watcher logic should also run on creation | Duplicating watcher logic in `created` and in the watcher itself |
| **Avoid redundant watcher + handler** | Don't combine `v-model` (or `@input`) with a watcher on the same property — pick one trigger path | `@input="handleSearch"` plus `watch: { searchQuery() { this.handleSearch() } }` — double execution |

## Props & Emits

| Rule | Core | Red Flag |
|------|------|----------|
| **Object-style prop definitions** | Use object syntax with `type`, `required`, `default` | `props: ['title']` — array syntax with no validation |
| **Prop validator for constrained values** | Use `validator` for props with a fixed set of allowed values | `size` prop accepting any string without validation |
| **Declare `emits` option** | List all emitted events in `emits` for documentation and to prevent native event fallthrough | Emitting events not listed in `emits` |
| **v-model implementation** | Vue 3: `modelValue` prop + `update:modelValue` emit. Vue 2: `value` prop + `input` emit | Mutating prop directly instead of emitting update |
| **Readonly props** | Never mutate props; use local `data` property initialized from prop if mutation needed | `this.items.push(newItem)` where `items` is a prop |

## Cross-Component Communication

| Rule | Core | Red Flag |
|------|------|----------|
| **`provide` as function for reactive data** | Use function form to provide reactive data from `data`/`computed` | `provide: { user: this.user }` — captures value at creation, not reactive |
| **Default values for inject** | Always specify `default` in inject | `inject: ['user']` without default — silent `undefined` if provider missing |
| **Avoid `$parent` / `$root`** | Direct parent/root access creates implicit coupling | `this.$parent.someMethod()` or `this.$root.globalState` |
| **Prefer props/emits for direct parent-child** | Use provide/inject only when drilling exceeds 2-3 levels | provide/inject between parent and direct child |
