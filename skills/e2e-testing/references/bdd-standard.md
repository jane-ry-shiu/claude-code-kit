# BDD Standard for E2E Tests

> This file is the source of the core BDD rules — test structure, phase comments, assertions,
> and teardown. Data-setup strategy and the Arrange/Act/Assert split live in
> [data-strategy.md](data-strategy.md). Other docs link to these rules rather than restating them.

Six rules for a behavior-driven end-to-end test. Rules are framework-agnostic — examples
below use Playwright syntax, fenced as ```js // Playwright```. Cypress and other frameworks
express the same principle with their own APIs (e.g. `cy.get('[role=...]')` instead of
`page.getByRole(...)`, a custom command instead of a direct API call) — no rule here depends
on Playwright specifically.

## 1. Test title

The test title is a user-behavior sentence: `<role> <action> <observable outcome>`. It says
what the user does and what they should see — not the implementation, not the test's internal
steps. The `describe`/group block names the feature under test; each test title names one
behavior within it.

GOOD:
```js // Playwright
test.describe('Document list', () => {
  test('viewer sees an archived document flagged as read-only', async ({ page }) => {
    // ...
  });
});
```

BAD:
```js // Playwright
test.describe('Document list', () => {
  test('test document status', async ({ page }) => {
    // ...
  });
});
```
Violation: no role, no action, no observable outcome — a reader can't tell what "test document
status" verifies without opening the body.

## 2. Given-When-Then structure

Order the test body Given → When → Then: set up preconditions, perform the one action under
test, then assert the outcome. Don't interleave phases — no assertions mid-setup, no setup
added after the action beyond what the scenario needs.

GOOD:
```js // Playwright
test('editor archives a document and it drops off the active document list', async ({ page }) => {
  // Given: an editor viewing a project with one active document
  await seedDocument({ status: 'active' });
  await page.goto('/project/1/documents');

  // When: the editor archives the document
  await page.getByRole('button', { name: 'Archive document' }).click();

  // Then: the document is removed from the active document list
  await expect(page.getByText('Document 1')).not.toBeVisible();
});
```

BAD:
```js // Playwright
test('editor archives a document and it drops off the active document list', async ({ page }) => {
  await page.goto('/project/1/documents');
  await expect(page.getByText('Document 1')).toBeVisible(); // assertion before the action
  await page.getByRole('button', { name: 'Archive document' }).click();
  await seedDocument({ status: 'active' }); // setup after the action
  await expect(page.getByText('Document 1')).not.toBeVisible();
});
```
Violation: setup, action, and assertion are interleaved, so the phases can't be read or
changed independently of each other.

### Allowed: journey tests that chain several verifications

A single test MAY chain several When → Then cycles into one journey when EITHER predicate
holds:

- **(a) shared expensive setup** — the verifications exercise the same UI control or the same
  feature flow and share one costly setup (login, navigation, seeding), so splitting them
  would repeat that setup N times for no added coverage; or
- **(b) cross-step outcome** — the outcome is only observable across the full flow, not after
  any single action (e.g., assign a role, re-login as the target user, then confirm the user
  gained access).

The one-action rule above governs each single-behavior test; it does not forbid these
journeys. Two constraints still bind inside a journey: independent features that can fail
independently still get **separate** tests (a journey is not a dumping ground for unrelated
behaviors), and **every** step still carries its substantive phase/step comment (rule 3).

## 3. Meaningful phase comments

**This is the single most important rule.** Each phase — Given, When, Then — carries one
meaningful — *substantive* — comment stating the *real* precondition, action, or expected
outcome in domain language. A bare keyword with no content is a violation, even though the
test "looks" structured.

GOOD:
```js // Playwright
// Given: a viewer-role user in a workspace that already has one shared document
```

BAD:
```js // Playwright
// Given
```
Violation: `// Given` restates the structure, not the scenario — it tells a reader nothing
the code didn't already show, and defeats the entire purpose of a phase comment. The same
applies to a bare `// When` or `// Then`. A standard that only requires the keyword is
trivially satisfiable while remaining useless; requiring substantive content is what makes
the comment worth writing. A phase with no comment at all — e.g. a missing `// When` — is
just as much a violation as a bare label; every phase needs a substantive comment.

## 4. Teardown

Teardown restores the environment to its baseline state through the API/backend layer —
never by driving the UI. Two exceptions: a read-only test (no writes) needs no teardown; and
if there is no direct "restore" call, delete-then-recreate the affected resource is an
acceptable restore strategy.

GOOD:
```js // Playwright
test.afterEach(async () => {
  // Teardown: restore the document to its pre-test active state via the API
  await api.updateDocument(documentId, { status: 'active' });
});
```

BAD:
```js // Playwright
test.afterEach(async ({ page }) => {
  // Teardown: restore the document to its pre-test active state
  await page.goto(`/project/1/documents/${documentId}`);
  await page.getByRole('button', { name: 'Unarchive document' }).click();
});
```
Violation: teardown drives the UI — slower, flakier, and it re-tests a flow other scenarios
already cover instead of restoring state directly.

## 5. Assertions & selectors

Assert user-observable outcomes (what appears on screen, what the user could see or do) — not
internal state, network payloads, or store contents. Prefer the framework's auto-retrying
("web-first") assertions over manual polling or fixed waits. Select elements the way a user
identifies them — role, accessible text, or a dedicated test id — never a brittle CSS class
chain or XPath tied to DOM structure.

GOOD:
```js // Playwright
await expect(page.getByRole('alert')).toHaveText('Document archived');
```

BAD:
```js // Playwright
await page.waitForTimeout(2000);
const el = await page.$('div.MuiSnackbar-root > div > div:nth-child(2)');
expect(await el.textContent()).toBe('Document archived');
```
Violation: a fixed wait instead of an auto-retrying assertion, plus a CSS selector coupled to
DOM/class structure that breaks on any markup or styling refactor.

## 6. No hardcoded literals

Specs never hardcode literal emails, user IDs, tokens, or other real-looking values inline.
Pull them from the project's fixtures/constants module — discovering what that module is
called and where it lives is a project-specific detail, not part of this rule.

GOOD:
```js // Playwright
import { TEST_USERS } from '../fixtures/users';

await page.getByLabel('Email').fill(TEST_USERS.viewer.email);
```

BAD:
```js // Playwright
await page.getByLabel('Email').fill('jane.doe+test47@example.com');
```
Violation: the literal is meaningless to a reader, can't be updated in one place, and risks
colliding with real seeded data.
