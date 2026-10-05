---
name: e2e-testing
description: Use when writing or adding an end-to-end (e2e) test, scaffolding an e2e spec, or reviewing an e2e test/spec/PR against a behavior-driven (BDD) standard — including "does this spec follow BDD" questions. Framework-agnostic (Playwright, Cypress, or any e2e tool). Not for running/executing an e2e suite (defer to the project's own running skill) and not for unit/component tests (defer to testing-principles).
---

# E2E Testing

## Overview

A global, framework-agnostic standard for behavior-driven end-to-end tests, with two modes:
**authoring** a new e2e test and **reviewing** an existing test/spec/PR against the standard.
Principles hold across frameworks; project mechanics (directory, config, fixtures, seeding) are
discovered at invocation time, never assumed.

## Step 0 — Discover Project Conventions

Before either mode, locate:
- the e2e test directory and the test framework + its config file
- fixtures/constants modules (baseline users, IDs, credentials)
- data-seeding utilities (API/GraphQL helpers, DB/cloud scripts, hardware emulator or mock
  event trigger)
- auth/login/session setup (e.g. `storageState`, login helpers, per-role sessions) — how
  tests establish an authenticated user
- the page-object layout (if the project uses one)
- any project e2e README or standard doc

If no e2e setup is found in the current directory, check cross-package pointers before
concluding none exists — the monorepo root, a `CLAUDE.md`/`AGENTS.md`, or sibling packages
may hold or point to the e2e suite. If e2e genuinely doesn't exist and the need is
unit/component, defer to `testing-principles`. If no e2e setup exists but the need genuinely
is e2e, standing up the framework/config is a prerequisite — ask the user or defer to the
project's own tooling before authoring a test.

Everything downstream adapts to what is found here — never assume a fixed path or tool name.

## Mode Dispatch

Detect intent from the request:
- "write / add / scaffold an e2e test" → **Authoring**
- "review this e2e test / spec / PR", "does this follow BDD" → **Review**

## Dispatch Table

| Mode / need | Reference |
| --- | --- |
| Plan what to test (before writing) | [references/test-planning.md](references/test-planning.md) |
| The rule core (write & review) | [references/bdd-standard.md](references/bdd-standard.md) |
| Data setup & teardown | [references/data-strategy.md](references/data-strategy.md) |
| Red flags to avoid / flag | [references/anti-patterns.md](references/anti-patterns.md) |
| Final self-check / audit | [references/checklist.md](references/checklist.md) |

## Authoring Flow

1. Derive a scenario list from the feature's acceptance criteria ([test-planning.md](references/test-planning.md)).
2. **CHECKPOINT:** confirm the scenario list with the user before writing any code. Exception: a
   trivial single-behavior test may state its one scenario inline and proceed.
3. Locate the route and page object per Step 0's discovery.
4. Decide the data source — baseline vs dynamic, API/DB/emulator ([data-strategy.md](references/data-strategy.md)).
5. Scaffold the spec in the project's own convention (file location, naming, framework API).
6. Write the test Given→When→Then, each phase with a substantive comment, plus teardown
   ([bdd-standard.md](references/bdd-standard.md)).
7. Self-check against [checklist.md](references/checklist.md) before finishing.

## Review Flow

1. Collect the changed/new tests — default scope is the diff, not the whole suite.
2. Check each against [bdd-standard.md](references/bdd-standard.md), [anti-patterns.md](references/anti-patterns.md),
   and coverage (are obvious role/state/negative scenarios missing? see [test-planning.md](references/test-planning.md)).
3. Report findings as file:line, violation, fix, severity. Exception: a missing-scenario /
   coverage-gap finding has no code line — anchor it to the feature, the acceptance
   criterion, or the relevant `describe` block instead.
4. Violations in pre-existing tests the diff didn't touch are listed separately as **backlog** —
   never blocking.
5. Severity for coverage gaps: a scenario the change's own acceptance criteria require but
   the change omits is **blocking** (the change is incomplete); a pre-existing gap in
   untouched code is backlog.
6. Audit against [checklist.md#review-audit](references/checklist.md#review-audit).

## Cross-Links

- **REQUIRED FOR unit/component tests:** use `testing-principles` instead — this skill covers
  e2e/full-flow only.
- **REQUIRED WHEN acceptance criteria are themselves unclear or over-packed:** use
  `analyzing-requirements` to derive a sound low-level requirement before planning scenarios here.
- **REQUIRED TO EXECUTE a suite:** use the project's own running skill (e.g. its
  `running-*-e2e` skill) — this skill never runs tests itself.

## What This Skill Never Does

- Run or execute a suite (preflight, secrets, CI) — that's the project's running skill.
- Unit or component testing — that's `testing-principles`.
- Hardcode a project-specific path, tool, or fixture name (no fixed `utils/api`, no fixed
  emulator name, no fixed constants module) — Step 0 discovers these fresh every time.
