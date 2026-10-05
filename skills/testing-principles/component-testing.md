# Component Testing Principles

## Overview

Principles for testing UI components with emphasis on minimal mocking. The universal principles in SKILL.md (AAA, isolation, mocking philosophy, gap analysis) apply here as well.

## Core Philosophy: Minimal Mocking

The component under test and its child components should be rendered real. This is the core principle of this skill.

Only mock when:
- Purely decorative components (SVG icons, icon components)
- Features unsupported by test environment (teleport targets, canvas, WebGL)
- External API calls, Firebase / Remote Config, authentication/cloud services (per mocking philosophy in SKILL.md)

When tests fail due to real rendering, follow this resolution order:

```
Resolution order when component test fails:
1. Adjust mount options (attachTo, global.stubs only for the problem source)
2. Provide missing global dependencies (plugins, provide/inject)
3. Mock minimal scope (only the specific problematic child, not all children)
4. Last resort: stub the entire child component
```

## Preliminary Check

Before writing tests, check if the component has adequate test hooks:
- Do key interactive elements have test attribute selectors (e.g., `data-test` or `data-testid`)?
- Are emits definitions fully defined?
- Are model bindings consistent?

Detect the project's test attribute convention from existing components. Use the dominant convention consistently. Do not mix attribute names within a single test file.

If missing, apply minimal adjustments directly to the component (add test attributes, complete emits). **Not allowed:** structural refactoring for testability.

## Mount Factory Pattern

- Create a `mountFactory` function providing default props/slots/attrs
- Only stub what is necessary (e.g., icon components)
- Use `beforeEach` or `afterEach` to unmount previous wrapper and clear mocks for isolation

Conceptual structure:
```
mountFactory(overrides) →
  merge defaultProps with overrides.props
  merge defaultSlots with overrides.slots
  apply minimal stubs (icons only)
  return mounted component
```

## Selector Strategy

Examples use Vue Test Utils terminology. Apply equivalent patterns for other frameworks (e.g., React Testing Library: `screen.getByTestId`, `fireEvent`).

- **Prefer test attribute selectors** (e.g., `[data-test="..."]`) — do NOT use `.className`, `#id`, or tag selectors
- Secondary: component finder (e.g., `findComponent`) to locate child then operate
- Direct instance access (e.g., `wrapper.vm`) **only for** properties/methods explicitly exposed via the component's public API (e.g., `defineExpose`). Never access internal state through the instance

## Async Patterns

After triggering interactions or state changes, await the appropriate async boundary before assertions:
- Vue: `await nextTick()`, `await wrapper.setValue(...)`, `await trigger(...)`
- React: `waitFor()`, `act()`, `findBy*` queries

**Asserting that something has NOT happened yet:** have the test trigger the reveal explicitly — e.g. a stub exposes a method the test calls when it is ready — so the moment is chosen by the test, not by the clock. A real timer must never be what decides it: waiting helpers and timers do not share a queue (`flushPromises()` resolves on `setImmediate`, which may run before or after a pending `setTimeout(0)`), so an assertion placed between scheduling and firing is decided by machine load rather than by the component. Such a test goes red at random on an unchanged codebase.

## Test Coverage Dimensions

Organize as describe blocks:

| Dimension | What to Test |
|---|---|
| Rendering | Basic rendering, conditional rendering |
| Props | Each prop passing and its effect |
| Slots | Named slots, scoped slots |
| Events | Emitted events, model value updates |
| User Interaction | Click, input, form submit |
| Validation | Form validation rules (required → format → pass) |
| Exposed Methods | Explicitly exposed public methods |
| Edge Cases | Empty values, undefined props, extreme inputs |

## Dialog / Overlay Component Handling

Dialog, Modal, BottomSheet and similar components using teleport commonly fail in jsdom. Resolution order (do NOT mock directly):
1. `attachTo: document.body` — provide real DOM mount point
2. Stub teleport target — `global.stubs: { teleport: true }`
3. Confirm browser APIs (e.g., `visualViewport`) are mocked in setup file
4. Only if all above fail, consider stubbing the dialog component

## Child Component Interaction

- Keep child components real: use component finder to locate, then `setValue` / `trigger` (or framework equivalent)
- Verification: check emitted events or child component props changes
- Form validation test flow:
  1. Not filled → required validation failure
  2. Wrong format → format validation failure
  3. Correct input → pass all validations

## Comment Style

Follow the AAA pattern. In component tests, replace generic `// Arrange` / `// Act` / `// Assert` with concrete action descriptions while maintaining AAA structure.

Example: `// Mounts the component with disabled prop` instead of `// Arrange`
