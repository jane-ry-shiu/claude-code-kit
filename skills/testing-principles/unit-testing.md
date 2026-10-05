# Unit Testing Principles

## Overview

Principles for testing non-UI code. The universal principles in SKILL.md (AAA, isolation, mocking philosophy, gap analysis) apply here as well.

## Target File Detection

Detect target file type to determine testing strategy. The examples below use Vue/Pinia terminology; apply equivalent patterns for other frameworks:

| File Type | Characteristics | Test Focus |
|---|---|---|
| Utility / Helper | Pure functions, export functions | Input/output, boundary values, error handling |
| Store | State management (e.g., Pinia `defineStore`, Zustand, Redux) | State changes, action side effects, getter/selector computations |
| Composable / Hook | Reusable stateful logic (e.g., Vue `use*`, React hooks) | Reactive behavior, method return values, lifecycle |
| API Module | HTTP calls, VO/DTO transformations | Request params, response transformation, error mapping |
| Class / Model | `class` definition, strategy pattern | Constructor, method behavior, state management |

## Store Testing

- Each test creates a fresh store instance (no sharing)
- Test three dimensions separately: state defaults → getter/selector computations → action side effects
- External dependencies (API calls) are mocked, but store internal logic stays real
- For Pinia: use `$patch` to set precondition state and `$reset` to verify reset behavior. For other libraries, use equivalent APIs

## Composable / Hook Testing

- Composables/hooks using reactive primitives must be invoked within a reactive context. Detect the project's pattern: some use `withSetup()` helpers, others invoke inside a component mount. Check existing tests for convention
- Test returned reactive properties and methods
- Verify reactive updates after state changes

## API / HTTP Layer Testing

- Mock `fetch` or the corresponding HTTP client, never send real requests
- Verify: correct URL, method, headers, body assembly
- Verify: response after VO transformation
- Verify: error structure in error scenarios (type, message, status)

## Pure Function Testing

- Cover major input categories: valid inputs (happy path) → boundary values (empty string, 0, single-element array) → null/undefined inputs → error-triggering inputs
- Use the function's type annotations and validation logic to determine relevant edge cases
- Verify return values, do not verify internal implementation
- Use parameterized tests (`it.each` / `describe.each`) to reduce repetition

## Class / Model Testing

- Test public interface, do not test private internals
- If using Strategy pattern → test strategy and consumer separately
- Cover constructor behavior, method return values, state transitions
