# e2e-testing Skill — Design

Date: 2026-07-13
Status: Approved (brainstorming). Next: writing-plans → implementation.
Type: Personal **global** skill (`~/.claude/skills/e2e-testing/`), framework-agnostic.

## Context & Goals

Authoring and reviewing end-to-end (e2e) tests requires a consistent, behavior-driven
standard, but that standard tends to live only in prose docs that code drifts away from.
A concrete example that motivated this skill: in the Vortex Portal Playwright suite, both
the team's Confluence "BDD" page and the suite's 1002-line README mandate a
Given-When-Then structure with explicit phase comments — yet **0 of 47 spec files** carry
those comments, including the very file the README prints as its canonical example. Prose
did not enforce the standard; an agent-facing, action-oriented skill can.

**Goal.** One global, framework-agnostic skill that encodes a behavior-driven e2e testing
standard and applies it in two modes — **authoring** a new e2e test and **reviewing** an
existing test / PR against the standard — adapting to whatever project it is invoked in.

**Why global and framework-agnostic.** The *standard* (BDD/Given-When-Then, Arrange-Act-Assert,
data strategy, anti-patterns) is transferable knowledge that applies across projects and
across e2e frameworks (Playwright, Cypress, …). Only the *mechanics* (seeding APIs, fixtures,
hardware emulators, config) are project-specific, and those are discovered at invocation time
rather than hardcoded.

### Positioning (no fragmentation)

Three complementary skills, each one logical unit:

| Skill | Scope | Location |
| --- | --- | --- |
| `testing-principles` (existing) | unit + component testing | global |
| **`e2e-testing` (this skill)** | **e2e / behavior-driven full-flow testing — author + review** | **global** |
| `running-vortex-portal-e2e` (existing) | executing the Vortex suite (needs project secrets/preflight) | project-local |

The asymmetry is deliberate: a *standard* is universal knowledge → global; *execution*
needs project secrets → stays project-local. This skill cross-links to `testing-principles`
and defers execution to the project's own runner/skill.

### In scope

- A single global skill, `e2e-testing`, with two modes:
  - **Authoring** — first derive and confirm the test scenarios to cover (the BDD
    discovery/formulation phase), then scaffold a new e2e test that conforms to the standard.
  - **Reviewing** — audit an existing test / branch / PR against the standard, including a
    **coverage** check (are obvious scenarios missing?), and report findings.
- A framework-agnostic **standard core** (`bdd-standard.md`) reusable by both modes and
  loadable by a general code-review skill for changed e2e spec files.
- A **project-convention discovery** step so the skill adapts to the current repo's e2e
  layout (directory, config, fixtures, seeding utilities, page objects, README).

### Out of scope

- **Executing** any suite (preflight, secrets, runners) — that stays with a project-local
  running skill (e.g. `running-vortex-portal-e2e`).
- **Unit / component testing** — owned by `testing-principles`; this skill cross-links, never duplicates.
- **Hardcoding any project-specific path or mechanism** (no `utils/api`, no `device-emulator`,
  no `TEST_CONSTANTS`); such things appear only as illustrative examples.
- **Auto-fixing** reviewed code by default — review reports; fixing is a separate explicit ask.
- **Backfilling** a project's existing non-conformant specs — tracked as a project's own backlog,
  not part of this skill.

## Decisions (locked during brainstorming)

1. **Scope** — authoring + review, one skill, two modes sharing a single standard core.
2. **GWT comments** — mandatory for **new / changed** tests, but the comment must carry
   **substantive content** (e.g. `// Given: a viewer-role user in an org that already has one
   online camera`), **not** a bare `// Given` label. Bare-keyword comments are a violation.
   Pre-existing specs are the project's backlog, not enforced retroactively.
3. **Packaging** — single skill, dual entry, shared reusable standard core (Approach A).
4. **Breadth** — framework-agnostic principles; framework syntax appears as swappable examples.
5. **Name** — `e2e-testing`.
6. **Location** — `~/.claude/skills/e2e-testing/`; design doc co-located (this file). `~/.claude`
   is not a git repo, so the doc is saved, not committed.
7. **Test-planning phase** — authoring derives a scenario list from the feature's acceptance
   criteria **before** scaffolding (the BDD discovery/formulation step), and presents it for
   confirmation. Default checkpoint: present the derived scenario list for user confirmation
   before writing code; for a trivial single-behavior test, state the one scenario and proceed.
   Review mode adds a coverage check. Planning cross-links `analyzing-requirements` rather than
   restating requirement analysis.

## Approaches Considered

**Packaging.**
- **A — Single skill, dual entry, shared standard core (chosen).** One skill; a `SKILL.md`
  router dispatches to authoring or review; both consume one `bdd-standard.md`. Single source
  of truth, reusable by a general code-review skill.
- **B — Fold into the existing running skill.** Rejected: violates one-skill-one-logical-unit;
  execution (env/preflight/secrets) and authoring (BDD conventions) are different concerns and triggers.
- **C — Split into two skills (author / review).** Rejected: both need the same standard core;
  splitting duplicates the rules or fragments the source of truth.

**Breadth.**
- **Framework-agnostic (chosen).** Widest reuse; principles hold across frameworks; project
  mechanics discovered at runtime.
- Playwright-focused, cross-project. Rejected: narrower; breaks on non-Playwright projects.
- Include unit/component. Rejected: overlaps and fragments `testing-principles`.

## Architecture

```
e2e-testing/
├── SKILL.md              # router: Step 0 discover project conventions → author | review mode
└── references/
    ├── test-planning.md  # scenario derivation before writing (BDD discovery/formulation); cross-links analyzing-requirements
    ├── bdd-standard.md   # framework-agnostic rule core (shared by author + review + code-review)
    ├── data-strategy.md  # baseline vs dynamic; seed via API not UI; hardware→emulator/mock; teardown/restore; how to discover the project's seeding mechanism
    ├── anti-patterns.md  # red flags + fixes
    └── checklist.md      # pre-commit + review checklist (shared)
```

Invocation flow:

```
agent invokes e2e-testing
        │
        ▼
SKILL.md — Step 0: discover project e2e conventions
        │  (find e2e dir, test framework + config, fixtures/constants,
        │   seeding utilities, page objects, project e2e README/standard)
        ▼
   detect intent
   ├── "write / add an e2e test for X"  → AUTHORING mode
   └── "review this spec / branch / PR" → REVIEW mode
        │
        ▼
   load relevant reference(s): test-planning / bdd-standard (+ data-strategy / anti-patterns / checklist)
        │
        ▼
   AUTHORING: derive scenario list from acceptance criteria (test-planning)
              → CHECKPOINT: confirm scenarios with user → locate route + page object
              → decide data source (data-strategy) → scaffold spec in the project's
                convention → write GWT test with meaningful phase comments + teardown
              → self-check against checklist
   REVIEW:    collect changed/new tests (default: diff scope) → check against
              bdd-standard + anti-patterns + coverage (missing scenarios?) → findings
              (file:line, violation, fix, severity); pre-existing violations listed
              separately as backlog
```

## Components

### 1. `SKILL.md` (router + project discovery)

- **Frontmatter.** `name: e2e-testing`; description triggering on: "write / add an e2e test",
  "scaffold an e2e spec", "review this e2e test / spec / PR against our standard", "does this
  spec follow BDD". Explicitly not for running suites or unit/component tests.
- **Step 0 — discover project conventions.** Before either mode: locate the e2e directory, the
  test framework and its config, the fixtures/constants module, the data-seeding utilities
  (API/DB helpers, hardware emulators/mocks), the page-object layout, and any project e2e
  README/standard. Everything downstream adapts to what is found (for Vortex this surfaces the
  README, `utils/api`, `fixtures/*`, `device-emulator`; for another project, its own equivalents).
- **Mode dispatch** — authoring (plan scenarios → checkpoint → scaffold → write → self-check)
  vs review (standard + anti-patterns + coverage), per the flow above.
- **Cross-links** — `testing-principles` (unit/component); `analyzing-requirements` (requirement
  derivation feeding test-planning); the project's own running skill (execution).

### 2. `references/test-planning.md` (scenario derivation — the BDD discovery/formulation phase)

Run before writing any spec:

1. **Gather the behavior source of truth** — the feature's acceptance criteria / spec / Jira /
   Confluence / Figma. Without ACs, coverage is guesswork.
2. **Derive a scenario list as Given-When-Then statements** — happy path(s); role/permission
   variants; state variants (e.g. new vs existing, present vs absent); negative/error paths;
   edge and boundary cases.
3. **Prioritize by user value and risk** — e2e is expensive; cover critical journeys, do not
   exhaustively permute (push detail down to unit/component).
4. **Decide grouping and data** — which scenarios share a `describe`/file, serial vs parallel,
   shared vs per-test data (this feeds `data-strategy.md`).
5. **Draw the boundary with unit/component** (`testing-principles`) — mark scenarios that should
   not be e2e.
6. **Output a reviewable scenario list** — the collaboration/checkpoint point (BDD's "shared
   language for dev/QA/PM"); authoring confirms it with the user before writing code.

Cross-links `analyzing-requirements` (high-level → low-level requirement derivation) rather than
restating requirement analysis.

### 3. `references/bdd-standard.md` (the enforceable core, framework-agnostic)

1. **Test title = user-behavior sentence:** `<role> <action> <observable expected outcome>`.
   The `describe`/group names the feature.
2. **Body ordered Given → When → Then.**
3. **Each phase carries one substantive comment** describing the real precondition / action /
   expected outcome (not a bare keyword). Bare `// Given` = violation.
4. **Teardown** restores to baseline via API/backend (not UI); read-only tests add none;
   "delete-then-recreate" restore is acceptable.
5. **Assertions** target user-observable outcomes; prefer framework-native auto-retrying
   ("web-first") assertions; use user-facing selectors (role/text/test-id), not brittle CSS/XPath.
6. **No hardcoded literals** (emails, IDs, MACs) in specs — pull from the project's fixtures/constants.

Designed to be loadable by a general code-review skill for changed e2e spec files — one
standard, three consumers (author, review, PR review).

### 4. `references/data-strategy.md`

- **Baseline vs dynamic decision tree.** Baseline (accounts, orgs, roles, licenses, some
  "already-exists" objects) → pre-provisioned, lives in fixtures, the test does not create it.
  Dynamic (per-test objects, events) → created at runtime and torn down.
- **Seed via API, not UI.** Business objects via the project's API layer; backend state via DB
  access; **real-hardware events via an emulator/mock**; always pair creation with teardown restore.
- **Arrange = API, Act = UI, Assert = UI.** The AAA split reconciles "test like a user" (Act/Assert
  through the UI) with "seed fast and stable" (Arrange/teardown via API).
- **Discovery guidance** — how to find the current project's seeding mechanism during Step 0.

### 5. `references/anti-patterns.md` (red flag → fix)

- Bare `// Given` labels → substantive phase comments.
- Fixed hard waits (`sleep`/`waitForTimeout` without cause) → auto-retrying assertions or a
  tiered timeout constant; if a wait is truly required, comment why.
- Per-environment `if` inside a test → push env differences into fixtures; keep the test env-agnostic.
- Depending on data the test did not set up → self-provision or restore in teardown.
- Overuse of serial execution → default parallel; serial only with a stated reason.
- Non-user-facing selectors → user-facing.
- Building test data through the UI → API for Arrange/teardown.
- Hardcoded literals in specs → fixtures/constants.

### 6. `references/checklist.md`

A shared checklist used by authoring (self-check before finishing) and review (audit).
Mirrors the standard: scenario coverage matches the planned list; title is a behavior sentence;
GWT order; meaningful phase comments; teardown restores baseline; assertions user-observable;
user-facing selectors; no hardcoded literals; data seeded per data-strategy; no anti-patterns present.

## Example Strategy

The Confluence "Before (Cypress) → After (Playwright)" migration is used as the framework-agnostic
teaching example (it shows the same behavior expressed in two frameworks and the GWT structure).
Vortex-specific files are cited only as illustrations, never as required paths.

## Location & Naming

- Skill: `~/.claude/skills/e2e-testing/SKILL.md` (+ `references/`).
- Design (this doc): `~/.claude/skills/e2e-testing/design.md`.
- Name `e2e-testing` was chosen for breadth (covers author + review) over the gerund-style
  `writing-e2e-tests` and the more specific `behavior-driven-e2e`.

## Testing & Verification

The skill is `SKILL.md` + reference markdown; verification is manual smoke tests:

1. **Planning smoke** — give the skill a feature with acceptance criteria; confirm it derives a
   scenario list (happy / role / state / negative variants) and presents it for confirmation
   before scaffolding, and skips the checkpoint only for a trivial single-behavior case (stating
   the one scenario).
2. **Authoring smoke** — after a confirmed scenario list, ask the skill to write the spec; confirm
   it lands in the project's convention, uses GWT with substantive comments and API teardown, and
   passes the checklist.
3. **Review catches** — point it at a known-bad test (a hard wait, or a bare-comment sample);
   confirm it flags the exact violations with file:line and a fix.
4. **Coverage review** — give it a PR that tests only a feature's happy path while obvious role
   or negative variants exist; confirm review flags the missing scenarios.
5. **Review precision** — point it at a newly-written good test; confirm no false positives, and
   confirm pre-existing files are reported as backlog rather than as blocking violations.
6. **Project adaptation** — run Step 0 in two different repos; confirm it discovers each project's
   own e2e conventions rather than assuming Vortex specifics.

## Risks & Open Items

- **Framework-agnostic vs concrete tension.** Too abstract and the guidance is vague; too concrete
  and it stops being global. Mitigation: rules stay principle-level; every rule ships with a
  concrete example, and Step 0 grounds the run in the real project.
- **Discovery reliability.** Step 0 must handle projects whose e2e layout differs from Vortex.
  Mitigation: discovery describes *what to look for*, not fixed paths; degrades to asking the user.
- **Overlap creep with `testing-principles`.** Keep the boundary at e2e/full-flow vs unit/component;
  cross-link instead of restating.
- **Doc-vs-code drift (the original motivation) can recur** if the standard is copied into project
  READMEs. Mitigation: the skill is the single rule source; project docs should link to it.
- **`~/.claude` is not version-controlled**, so this design and the skill are not git-tracked;
  changes rely on the file itself.
