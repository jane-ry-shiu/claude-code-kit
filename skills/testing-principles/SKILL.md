---
name: testing-principles
description: Use when writing, reviewing, or debugging tests — covers universal conventions, UI component testing (Vue SFC, React), and non-UI unit testing (utilities, stores, composables, API layers)
---

# Testing Principles

## Overview

Universal testing conventions and environment detection for any project. Framework-aware — detect the project's test toolchain and apply conventions accordingly. This is a principle-based skill, not a generation workflow.

## Environment Detection

Before any test-related work, detect the project's test toolchain:

1. Find config files (`vitest.config.*`, `jest.config.*`, `karma.conf.*`, etc.)
2. Find setup files (global test initialization files referenced by config)
3. Find `package.json` test scripts and related dependencies
4. Confirm existence of shared test utility files (test helpers, custom matchers, mount factories)

After detecting setup files, **read them** to determine which global plugins, mocks, and polyfills are already configured. Do not duplicate setup-file-provided globals in individual test files. Only add test-specific overrides.

## Universal Principles

- **AAA Pattern**: every test follows Arrange-Act-Assert structure
- **Test Isolation**: each test is independent, no reliance on other tests' state
- **Independent Test Data**: each test uses its own data, no cross-contamination
- **Naming Convention**: test files co-located with source files. Detect the project's convention (`*.test.js` vs `*.spec.js`) from existing test files and follow it consistently
- **Describe Grouping**: group by functional dimension, happy path first then edge cases and error scenarios
- **Comment Language**: all comments in test files must be in English
- **Cleanup**: use `beforeEach` or `afterEach` to clean up state. If mocks are used, include mock cleanup (e.g., `vi.clearAllMocks()` or framework equivalent) to prevent mock state leaking between tests
- **Timer Management**: when testing time-dependent behavior (timers, debounce, throttle, animation frames), use the framework's timer control API (e.g., `vi.useFakeTimers()`, `jest.useFakeTimers()`) and always restore real timers in cleanup. This covers timers the test itself schedules inside stubs, fakes, and mock implementations, not only timers in the code under test. A real timer that flips state the test later asserts on is a race, not a delay: any assertion that runs before that callback fires is decided by machine load. Drive such a state change from the test explicitly instead

## Mocking Philosophy

```
Is it an external system? (API, third-party service, browser API)
  → Yes → Mock
  → No  → Is it purely decorative? (SVG icons, layout wrappers)
            → Yes → Can mock
            → No  → Keep real
```

**Do NOT mock:**
- Utility functions, constants, enums — use original files
- The subject under test itself
- Plugins and globals already registered in the project's test setup file (e.g., UI framework, i18n, state management if registered in `setupFiles`). Read the setup file to determine what is pre-configured

**Should mock:**
- External API calls (HTTP requests)
- Third-party authentication/cloud services
- Browser-only APIs not available in test environment (e.g., jsdom)
- Firebase / Remote Config and similar external dependencies

**Gray area (may mock):** Router, i18n

## Gap Analysis

When a test file already exists, do NOT overwrite. This applies to both unit and component tests:
1. Compare source file capabilities (exported functions, props, events, etc.)
2. Compare existing test coverage
3. Produce a gap list and append only missing tests

## Routing

| Scenario | Reference |
|----------|-----------|
| Vue SFC / React component testing | [component-testing.md](component-testing.md) |
| Utility / Store / Composable / API / Class testing | [unit-testing.md](unit-testing.md) |

## Review Dimensions

When loaded by `code-review`, these dimensions must be checked for every applicable file. Dimensions 1–5 apply to `.test.js`/`.spec.js` files; dimension 6 applies to source files in testable directories.

1. **Selector strategy** — Uses `data-test` attributes, not class/tag/component-name selectors
2. **Test isolation** — Mocks and mutable variables initialized in `beforeEach`, no cross-test shared mutable state
3. **Behavioral testing** — Tests interact via UI (trigger, setValue) not via `wrapper.vm` internal access
4. **Factory duplication** — Multiple mount factories with near-identical logic should be merged
5. **Timing determinism** — A test must not be able to go red while the code under test is unchanged. Flag when the test file itself schedules a real timer (including inside stubs, fakes, or mock implementations the test defines) and an assertion runs before that timer's callback has fired. Waiting helpers and timers do not share a queue (Vue Test Utils' `flushPromises()` resolves on `setImmediate`, which may run before or after a pending `setTimeout(0)`), so that assertion passes or fails depending on machine load. State the consequence in the finding: **this test can fail on an unchanged codebase, and will do so intermittently on loaded CI machines**. (Reporting it as timer leakage or a missing timer restore understates it — a 0 ms timer does not leak, so that framing is easily rebutted and the race survives.) Fix: have the test trigger the state change explicitly, or use fake timers
6. **Test file existence** — Source files in testable directories have a co-located test file

## Existing Tests

Existing project tests may not yet follow these principles. When writing new tests, follow these principles. When modifying existing tests, do not refactor patterns unless specifically requested.

## Validation

Tests should be executed to verify they pass after writing. Specific validation workflow is deferred to other skills (TDD, verification-before-completion).
