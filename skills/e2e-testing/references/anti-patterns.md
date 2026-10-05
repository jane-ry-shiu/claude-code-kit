# E2E Anti-Patterns

Red flags this skill's review mode scans for when auditing an e2e spec, branch, or PR.
Framework-agnostic — code shown is illustration, not required syntax. Being a violation
(this table) and being blocking vs. backlog (see the skill's Review flow) are separate
questions: a pre-existing violation in code the change didn't touch is still a violation,
but it's reported as backlog, not blocking.

## Red flags

| Red flag | Why it hurts | Fix |
|---|---|---|
| Bare phase label as the whole comment (`// Given`, `// When`, `// Then`) | Comment adds no information beyond the code; the reader must reverse-engineer the precondition/action/outcome, and the doc drifts from intent immediately | Write the actual precondition/action/outcome inline, e.g. `// Given: a viewer-role user in a workspace that already has one shared document` — see [bdd-standard.md](bdd-standard.md#3-meaningful-phase-comments) |
| Fixed hard wait (`sleep(2000)`, `page.waitForTimeout(...)`) with no stated reason | Too short → flaky under load; too long → slow always; masks the real async condition the test is actually waiting on | Use an auto-retrying ("web-first") assertion, or a named/tiered timeout constant; if a fixed wait is truly unavoidable, comment why — see [bdd-standard.md](bdd-standard.md#5-assertions--selectors). Acceptable, with a comment, only when the delay exposes **no awaitable signal** — backend eventual-consistency, email/notification delivery, external-device provisioning; if any response or DOM change can be awaited, wait on that instead. |
| Per-environment `if` inside a test body (`if (env === 'stage') { ... }`) that alters the actions performed or the assertions checked | Test behavior — and what "passing" means — silently changes per environment; failures signal "which branch ran," not "did the behavior work" | Push the environment difference into fixtures/config; keep the test itself env-agnostic. NOT this anti-pattern: a stated-reason `test.skip()` (or project-level exclusion) for an environment where the feature does not exist — it **removes** the test rather than altering its actions or assertions. |
| Test depends on data it did not set up (assumes another test's leftover state, or manual setup) | Breaks test independence — order-dependent, fails when run alone or in parallel, breaks silently when the assumed data changes | Self-provision the data the test needs, or restore it in teardown — see [data-strategy.md](data-strategy.md#baseline-vs-dynamic) |
| Overuse of serial execution (`.serial`, `describe.serial` applied by default) | Serializes tests that should be independent, multiplying wall-clock time and hiding whether the "no shared state between tests" property actually holds | Default to parallel; use serial only for one stated, real dependency — and prefer removing the dependency instead |
| Non-user-facing selector (brittle CSS/XPath, e.g. `.col-4 > div:nth-child(2)`) | Breaks on any markup/style refactor unrelated to the behavior under test; couples the test to implementation detail instead of user-observable structure | Select by role, accessible text, or a stable test-id — see [bdd-standard.md](bdd-standard.md#5-assertions--selectors) |
| Building test data through the UI (clicking through forms/wizards to Arrange) | Slow and flaky — couples data setup to the very UI under test — and duplicates coverage the happy-path test already provides | Seed via the project's API for Arrange and teardown; reserve the UI for Act/Assert — see [data-strategy.md](data-strategy.md#seed-via-api-not-ui) |
| Hardcoded literal in a spec (inline email, user ID, token, URL) | Drifts silently from real fixture data, leaks env-specific values across environments, forces a find-and-replace edit whenever the value changes | Pull the value from the project's fixtures/constants module, never type literals in the spec — see [bdd-standard.md](bdd-standard.md#6-no-hardcoded-literals) |

All eight apply equally to code found during review, not just newly authored tests.
