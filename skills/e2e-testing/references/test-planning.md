# Test Planning

The BDD discovery/formulation phase: derive and confirm WHICH scenarios to test,
**before** writing any spec. Skipping this step means coverage gets decided ad hoc
while typing the spec — which is how happy-path-only e2e suites happen.

## When to run

Before scaffolding a new e2e spec, and before adding new scenarios to an existing
one. Not needed for a small fix to an existing scenario's assertions.

## Steps

1. **Gather the behavior source of truth.**
   Read the feature's acceptance criteria, spec, Jira ticket, Confluence page, or
   Figma flow. **Without ACs, coverage is guesswork.** If none exists, ask for one
   before deriving scenarios — do not reverse-engineer acceptance criteria from the
   implementation you're about to test.

2. **Derive a scenario list as Given-When-Then statements**, one line per case,
   covering:
   - **Happy path(s)** — the primary flow(s) that satisfy the AC.
   - **Role/permission variants** — same flow, different role (e.g. admin vs viewer).
   - **State variants** — new vs existing, present vs absent, enabled vs disabled.
   - **Negative/error paths** — invalid input, forbidden action, error surfaced to the user.
   - **Edge/boundary cases** — limits, empty states, last-item removal — only where
     the source of truth calls them out; don't invent boundaries it doesn't mention.

3. **Prioritize by user value and risk.** e2e runs are slow and flaky-prone — do not
   exhaustively permute every role × state × input combination. Keep the scenarios
   that prove a real user journey end-to-end; push exhaustive permutation and
   pure-logic edge cases down to unit/component tests (Step 5).

4. **Decide grouping and data.** For the surviving list, decide: which scenarios
   share one `describe`/file vs split into separate files; which must run serial
   (shared mutable state) vs default parallel; which use shared baseline data vs
   per-test dynamic data. This decision feeds the data-strategy reference — don't
   seed data or write specs yet.

5. **Draw the boundary with unit/component.** For each scenario ask: does proving
   this require the real browser/network/full stack, or would a component/unit test
   prove it faster and more reliably? Prop-driven rendering states, pure validation
   logic, and computed-value edge cases are a `testing-principles` concern, not e2e.
   Mark and drop any scenario that really belongs there. Tie-breaker: if the acceptance
   criteria explicitly require a behavior that is really pure frontend validation, don't
   drop it silently — keep it as a candidate scenario, note it may be covered more cheaply
   by a component/unit test, and surface the keep-vs-push-down choice at the Step 6
   checkpoint. Second tie-breaker: if the project has **no component/unit test tier at all**
   (an e2e-only suite), keep the check in e2e rather than drop the coverage entirely — mark
   it to migrate if a component layer is later added.

6. **Output a reviewable scenario list and confirm it.** Present the surviving list
   as numbered GWT (Given-When-Then) one-liners. **Confirm it with the user before writing any code.**
   This is the checkpoint — the BDD "shared language" moment where a mismatch is
   still cheap to fix. Exception: a trivial single-behavior test (one flow, no
   variants) may state its one scenario inline and proceed without a separate
   confirmation round-trip.

## Output: the scenario list

The deliverable of this phase is not a spec file — it's a short, numbered list of
Given-When-Then statements, grouped per Step 4, ready to hand to authoring. Nothing
is scaffolded or written until the list is confirmed.

### Worked example: project sharing

Feature: a workspace admin shares a project with another user by email, choosing a role.

1. **Happy path** — Given an admin viewing a project's share settings, when
   they invite a valid teammate email as "viewer", then the teammate appears in the
   share list as "viewer" and receives an invite notification.
2. **Role variant** — Given an admin sharing a project, when they choose "editor"
   instead of "viewer", then the invited user can edit the project's documents but
   cannot manage other shares.
3. **State variant (already shared)** — Given a project already shared with a user as
   "viewer", when the admin re-invites the same email as "editor", then the
   existing share is upgraded in place, not duplicated.
4. **Negative path (permission)** — Given a user with "viewer" role opening the
   share dialog, when they attempt to invite someone else, then the invite control
   is disabled with an explanatory message.
5. **Negative path (invalid input)** — Given an admin in the share dialog, when they
   submit an email with no matching account, then an inline validation error appears
   and no invite is sent.
6. **Edge case (last share removed)** — Given a project shared with exactly one other
   user, when the admin revokes that share, then the list returns to its empty state
   and the project reverts to admin-only access.

Six scenarios — one happy path, one role variant, one state variant, two negative
paths, one edge case — covering every Step 2 dimension without permuting every
role × state combination.

## Cross-link

Deriving scenarios assumes the acceptance criteria are already sound and scoped —
that's a separate discipline. Use the `analyzing-requirements` skill when the source
of truth is itself a high-level spec that needs breaking down into a low-level,
verified requirement (ambiguous behavior, unverified API/data limits, an over-packed
spec covering several features). This file starts from acceptance criteria that
already exist; it does not re-derive them.
