# Component API Design

Rules for designing high-quality component interfaces (props, events, slots). Focuses on interface shape and usability, not syntax or naming (covered in SKILL.md).

## Props

| Rule | Core | Red Flag |
|------|------|----------|
| **Minimal prop surface** | Only expose what consumers genuinely need to control; internal UI state stays internal | A toggle's `isHovered` exposed as prop; parent forced to manage hover state |
| **Avoid boolean prop explosion** | When 3+ boolean props are mutually exclusive, replace with a single enum/string prop | `isOutlined`, `isFilled`, `isText` → use `variant="outlined"` |
| **Stable default values** | Object/array prop defaults must use factory functions to avoid shared reference across instances | `default: []` or `default: {}` — use `default: () => []` |
| **Reasonable defaults** | The most common usage should require zero or minimal configuration | Every consumer must pass 5 required props for the standard use case |
| **Flat over nested** | Prefer flat primitive props over a single config object when props are independent | `<Chart :config="{ title, xAxis, yAxis, legend }" />` when each is independent — use separate props |
| **Nested for cohesive groups** | Use object prop only when properties are tightly coupled and always travel together | Pagination: `{ page, pageSize, total }` — these are meaningless alone |

## Events

| Rule | Core | Red Flag |
|------|------|----------|
| **Payload over multiple params** | Emit a single object payload when event carries 2+ values | `emit('change', value, index, source)` — use `emit('change', { value, index, source })` |
| **Semantic event names** | Name describes what happened, not implementation detail | `emit('click-button')` — use `emit('submit')` or `emit('confirm')` |
| **No silent mutations** | If component changes shared state, it must emit an event so parent can react or intercept | Component writes to injected store without emitting — parent has no awareness |
| **Pair with v-model when bidirectional** | If a prop is expected to be updated by the component, use v-model pattern | Manual `modelValue` prop + `update:modelValue` emit without `defineModel` (Vue 3.4+) |

## Slots

| Rule | Core | Red Flag |
|------|------|----------|
| **Slot over complex render prop** | When consumers need to customize a visual region, provide a named slot | Prop accepts VNode / render function for customization |
| **Default slot content** | Provide sensible default content so slot is optional for common cases | Empty region when slot is not provided — use `<slot>default text</slot>` |
| **Scoped slots for data exposure** | When slot content needs component-internal data, use scoped slots | Parent accesses child internals via ref to get data for slot rendering |
| **Named slots for multiple regions** | Use named slots when component has 2+ customizable regions | Single default slot with complex conditional rendering based on prop flags |

## Interface Complexity Budget

A component's public API complexity should be proportional to its responsibility:

| Component Type | Guideline |
|----------------|-----------|
| Primitive (button, input, tag) | ≤ 5 props, ≤ 2 events, ≤ 1 slot |
| Composite (card, form group) | ≤ 10 props, ≤ 5 events, ≤ 3 slots |
| Feature (page section, data panel) | Props/events as needed, but question if exceeding 15 props |

Exceeding these is not forbidden — it is a signal to review whether the component is doing too much.
