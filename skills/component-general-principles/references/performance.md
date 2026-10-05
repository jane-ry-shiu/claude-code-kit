# Component Performance

## Render-Time Allocation

| Rule | Core | Red Flag |
|------|------|----------|
| **No inline object/array literals in templates** | Object/array literals create new references every render, triggering unnecessary child updates | `<Child :style="{ color: 'red' }" />`, `:options="[1, 2, 3]"` in template |
| **No inline function creation in templates** | Anonymous functions in templates create new references every render | `<Child @click="() => handleClick(item)" />` in a list — extract to method or use data attribute |
| **Hoist static data** | Constants, config objects, and option arrays that never change should be defined outside the component or as module-level constants | Static dropdown options defined inside setup/render — recreated every instance |

## Large Lists

| Rule | Core | Red Flag |
|------|------|----------|
| **Virtual scroll for 100+ items** | Render only visible items using virtual scroll | `v-for` / `.map()` rendering 500+ DOM nodes simultaneously |
| **Paginate when appropriate** | Server-side pagination for datasets that can exceed 1000 items | Loading entire dataset into memory then paginating client-side |
| **Stable keys** | Use unique, stable identifiers as keys — never array index on mutable lists | `:key="index"` on a sortable, filterable list |

## Resource Loading

| Rule | Core | Red Flag |
|------|------|----------|
| **Lazy load heavy components** | Components with large dependencies (charts, editors, maps) should be dynamically imported | All route components and heavy libraries statically imported in main bundle |
| **Lazy load images** | Images below the fold should use `loading="lazy"` or intersection observer | All images load eagerly on page mount regardless of viewport position |
| **Debounce high-frequency events** | Scroll, resize, input handlers that trigger expensive work must be debounced or throttled | Raw `@scroll` / `@input` firing API calls on every event |

## Event Handling

| Rule | Core | Red Flag |
|------|------|----------|
| **Event delegation for repeated elements** | When many sibling elements share the same event handler, consider handling at the parent level | 200 list items each with their own `@click` listener doing the same thing |
| **Cleanup manual listeners** | `addEventListener` added in lifecycle hooks must have matching `removeEventListener` on unmount | `addEventListener('resize', handler)` without cleanup |
