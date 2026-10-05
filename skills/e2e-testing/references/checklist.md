# Checklist

Shared checklist for e2e specs — used by **authoring** as a self-check before finishing,
and by **review** as an audit. Every item traces to a rule in [bdd-standard.md](bdd-standard.md),
[test-planning.md](test-planning.md), [data-strategy.md](data-strategy.md), or
[anti-patterns.md](anti-patterns.md); don't restate those rules here beyond a one-line pointer.

## Authoring self-check

- [ ] Scenarios written match the confirmed scenario list — nothing dropped, nothing added
      without re-confirming ([test-planning.md#output-the-scenario-list](test-planning.md#output-the-scenario-list))
- [ ] Test title is a user-behavior sentence: `<role> <action> <observable outcome>`
      ([bdd-standard.md#1-test-title](bdd-standard.md#1-test-title))
- [ ] Body ordered Given → When → Then, phases not interleaved — a shared-setup or
      cross-step journey is allowed (each step keeps its substantive comment)
      ([bdd-standard.md#2-given-when-then-structure](bdd-standard.md#2-given-when-then-structure))
- [ ] Each phase comment states the real precondition/action/outcome — bare `// Given`,
      `// When`, or `// Then` is a violation
      ([bdd-standard.md#3-meaningful-phase-comments](bdd-standard.md#3-meaningful-phase-comments))
- [ ] Teardown restores baseline via API/backend, never the UI; a read-only test adds no
      teardown; delete-then-recreate is an acceptable restore
      ([bdd-standard.md#4-teardown](bdd-standard.md#4-teardown),
      [data-strategy.md#teardown--restore](data-strategy.md#teardown--restore))
- [ ] Assertions target user-observable outcomes, use web-first (auto-retrying) assertions,
      and select elements by role/text/test-id — never brittle CSS/XPath
      ([bdd-standard.md#5-assertions--selectors](bdd-standard.md#5-assertions--selectors))
- [ ] Data is seeded per data-strategy: baseline objects are pre-provisioned (test doesn't
      create/delete them); dynamic objects are created via API/DB and torn down; hardware-
      originated events go through an emulator/mock, not a real device by default
      ([data-strategy.md](data-strategy.md))
- [ ] The action under test (When) is driven through the real UI, not substituted by a
      direct API/DB call — Arrange/teardown use the API, but Act must use the UI
      ([data-strategy.md#arrange--api-act--ui-assert--ui](data-strategy.md#arrange--api-act--ui-assert--ui))
- [ ] No hardcoded literal (email, ID, token, URL) — values come from the project's
      fixtures/constants module
      ([bdd-standard.md#6-no-hardcoded-literals](bdd-standard.md#6-no-hardcoded-literals))
- [ ] No anti-pattern present: unexplained hard wait, per-environment `if` that alters
      actions/assertions (a stated-reason `test.skip` for an unavailable feature is fine),
      dependency on data the test didn't set up, or default-to-serial execution without a
      stated reason (bare phase labels, non-user-facing selectors, UI-seeded data, and
      hardcoded literals are already covered by the items above)
      ([anti-patterns.md](anti-patterns.md))

## Review audit

Default to **diff scope**: apply every item below to the new/changed tests in the diff.
A violation found in a pre-existing test the change didn't touch is reported separately as
**backlog**, not as a blocking finding.

- [ ] Scenarios covered by the diff match (or improve on) the plan/acceptance criteria for
      the behavior — flag obviously missing role, state, negative, or edge/boundary variants
      as gaps; a gap the change's own acceptance criteria require is blocking, a
      pre-existing untouched gap is backlog
      ([test-planning.md#steps](test-planning.md#steps),
      [test-planning.md#output-the-scenario-list](test-planning.md#output-the-scenario-list))
- [ ] Test title is a user-behavior sentence: `<role> <action> <observable outcome>`
      ([bdd-standard.md#1-test-title](bdd-standard.md#1-test-title))
- [ ] Body ordered Given → When → Then, phases not interleaved — a shared-setup or
      cross-step journey is allowed (each step keeps its substantive comment)
      ([bdd-standard.md#2-given-when-then-structure](bdd-standard.md#2-given-when-then-structure))
- [ ] Each phase comment states the real precondition/action/outcome — bare `// Given`,
      `// When`, or `// Then` is a violation
      ([bdd-standard.md#3-meaningful-phase-comments](bdd-standard.md#3-meaningful-phase-comments))
- [ ] Teardown restores baseline via API/backend, never the UI; a read-only test adds no
      teardown; delete-then-recreate is an acceptable restore
      ([bdd-standard.md#4-teardown](bdd-standard.md#4-teardown),
      [data-strategy.md#teardown--restore](data-strategy.md#teardown--restore))
- [ ] Assertions target user-observable outcomes, use web-first (auto-retrying) assertions,
      and select elements by role/text/test-id — never brittle CSS/XPath
      ([bdd-standard.md#5-assertions--selectors](bdd-standard.md#5-assertions--selectors))
- [ ] Data is seeded per data-strategy: baseline vs dynamic correctly classified; API/DB —
      not the UI — used for Arrange and teardown; hardware-originated events go through an
      emulator/mock ([data-strategy.md](data-strategy.md))
- [ ] The action under test (When) is driven through the real UI, not substituted by a
      direct API/DB call — Arrange/teardown use the API, but Act must use the UI
      ([data-strategy.md#arrange--api-act--ui-assert--ui](data-strategy.md#arrange--api-act--ui-assert--ui))
- [ ] No hardcoded literal (email, ID, token, URL) — values come from the project's
      fixtures/constants module
      ([bdd-standard.md#6-no-hardcoded-literals](bdd-standard.md#6-no-hardcoded-literals))
- [ ] No anti-pattern present in the diff: unexplained hard wait, per-environment `if` that
      alters actions/assertions (a stated-reason `test.skip` for an unavailable feature is
      fine), dependency on data the test didn't set up, or default-to-serial execution
      without a stated reason (bare phase labels, non-user-facing selectors, UI-seeded data,
      and hardcoded literals are already covered by the items above)
      ([anti-patterns.md](anti-patterns.md))
- [ ] Violations found outside the diff (pre-existing specs the change didn't touch) are
      listed separately as backlog, not blocking — per-file diff scope, not full-suite
      enforcement ([anti-patterns.md](anti-patterns.md#red-flags))
