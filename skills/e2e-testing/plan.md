# e2e-testing Skill Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a global, framework-agnostic `e2e-testing` skill that both authors new behavior-driven e2e tests and reviews existing tests/PRs against a shared BDD standard.

**Architecture:** One skill at `~/.claude/skills/e2e-testing/`. A thin `SKILL.md` router runs a project-convention discovery step, then dispatches to authoring or review mode, loading five on-demand reference files. `bdd-standard.md` is the single rule source; the other references cover scenario planning, data strategy, anti-patterns, and a shared checklist.

**Tech Stack:** Markdown skill files (`SKILL.md` + `references/*.md`) following the superpowers skill format (YAML frontmatter + Markdown body + dispatch table). No runtime code. Verification is done with fresh subagents per `superpowers:writing-skills` → `testing-skills-with-subagents.md`.

## Global Constraints

- **Location:** all files under `~/.claude/skills/e2e-testing/` (references in `references/` subdir). Design source of truth: `~/.claude/skills/e2e-testing/design.md`.
- **Not a git repo:** `~/.claude` is not version-controlled. There are **no `git commit` steps**; each task ends with **save + verify** (file exists, frontmatter parses, content-checklist passes).
- **Framework-agnostic:** rules are principle-level; framework syntax (Playwright primary, Cypress contrast) appears only as **swappable examples**. No rule may depend on a specific framework.
- **No hardcoded project specifics:** never bake in `utils/api`, `device-emulator`, `TEST_CONSTANTS`, or any Vortex path as a requirement — cite them only as illustrations. Project mechanics are found at runtime by Step 0.
- **Single source of truth:** `bdd-standard.md` holds the rules; every other file and any external doc **links** to it, never restates it.
- **GWT comment rule (verbatim from design Decision #2):** phase comments are mandatory for new/changed tests and must carry **substantive content** (e.g. `// Given: a viewer-role user in an org that already has one online camera`), **not** a bare `// Given`. Bare-keyword comments are a violation.
- **Checkpoint rule (design Decision #7):** authoring presents the derived scenario list for user confirmation before writing code; a trivial single-behavior test may skip the checkpoint by stating its one scenario and proceeding.
- **Cross-links (never duplicate):** `testing-principles` (unit/component), `analyzing-requirements` (requirement derivation → test-planning), and the project's own running skill (execution).
- **Authoring tool:** use `superpowers:writing-skills` when writing every file (frontmatter/description discipline, concise SKILL.md, detail in references). Match the sibling `~/.claude/skills/testing-principles/` style (name+description frontmatter, dispatch table with `[file](path)` links).

---

## File Structure

| File | Responsibility |
| --- | --- |
| `references/bdd-standard.md` | The enforceable rule core (6 rules + examples). Referenced by SKILL.md, checklist, and any code-review skill. |
| `references/test-planning.md` | BDD discovery/formulation: derive & confirm a scenario list before writing. Cross-links `analyzing-requirements`. |
| `references/data-strategy.md` | Baseline-vs-dynamic data decision tree; API-seeding; hardware emulation; teardown; AAA split; discovery guidance. |
| `references/anti-patterns.md` | Red-flag → fix table. |
| `references/checklist.md` | Shared authoring self-check + review audit checklist; mirrors the other references. |
| `SKILL.md` | Router: frontmatter, Step 0 discovery, intent detection, dispatch table, authoring flow, review flow, cross-links, "never does". |

Build order: the five references first (Tasks 1–5, independent of each other), then `SKILL.md` (Task 6, depends on all references existing so its links resolve), then end-to-end subagent smokes (Task 7).

---

### Task 1: `references/bdd-standard.md` — the enforceable rule core

**Files:**
- Create: `~/.claude/skills/e2e-testing/references/bdd-standard.md`

**Interfaces:**
- Consumes: `design.md` §"Components 3. bdd-standard.md" and §Decisions.
- Produces: the canonical rule anchors that `SKILL.md` (dispatch) and `checklist.md` link to. Section headings other files rely on: `## 1. Test title`, `## 2. Given-When-Then structure`, `## 3. Meaningful phase comments`, `## 4. Teardown`, `## 5. Assertions & selectors`, `## 6. No hardcoded literals`.

- [ ] **Step 1: Write the acceptance check for this file**

The file passes when it contains all six rules below, each with one GOOD and one BAD example, framework-agnostic (Playwright shown, with a note that Cypress/others map the same way), and no rule references a project-specific path:
  1. Test title = user-behavior sentence `<role> <action> <observable outcome>`; `describe` names the feature.
  2. Body ordered Given → When → Then.
  3. Each phase carries a **substantive** comment (GOOD: `// Given: viewer in an org with one online camera`; BAD: `// Given`).
  4. Teardown restores baseline via API/backend (not UI); read-only tests add none; delete-then-recreate is acceptable.
  5. Assertions target user-observable outcomes; prefer auto-retrying ("web-first") assertions; user-facing selectors (role/text/test-id) over CSS/XPath.
  6. No hardcoded literals (emails/IDs/MACs) in specs — pull from the project's fixtures/constants.
Plus a one-line note: "This file is the single rule source; other docs link here, never restate."

- [ ] **Step 2: Write the file**

Author with `superpowers:writing-skills`. Structure: short intro (what/why, framework-agnostic) → the six `##` sections above, each with a GOOD/BAD fenced example → the single-source-of-truth note. Keep examples minimal and framework-neutral in prose; label the framework in the code fence (```js // Playwright```). Substance is in `design.md`; do not restate the whole design — encode the rules as usable guidance.

- [ ] **Step 3: Verify against the acceptance check**

Run: `grep -nE "^## [1-6]\." ~/.claude/skills/e2e-testing/references/bdd-standard.md` → expect six headings.
Run: `grep -nc "Given\|When\|Then\|teardown\|selector" ~/.claude/skills/e2e-testing/references/bdd-standard.md` → non-zero.
Manually confirm: every rule has GOOD+BAD; the "meaningful comment not bare label" rule is explicit; no Vortex path appears as a requirement.

- [ ] **Step 4: Save & verify (no commit)**

Run: `test -s ~/.claude/skills/e2e-testing/references/bdd-standard.md && echo OK`
Expected: `OK`

---

### Task 2: `references/test-planning.md` — scenario derivation (BDD discovery/formulation)

**Files:**
- Create: `~/.claude/skills/e2e-testing/references/test-planning.md`

**Interfaces:**
- Consumes: `design.md` §"Components 2. test-planning.md"; `bdd-standard.md` (scenarios are expressed as GWT).
- Produces: the "scenario list" concept and the authoring CHECKPOINT that `SKILL.md` authoring flow invokes. Section headings: `## When to run`, `## Steps` (1–6), `## Output: the scenario list`, `## Cross-link`.

- [ ] **Step 1: Write the acceptance check**

The file passes when it documents the six planning steps and the confirmation checkpoint:
  1. Gather the behavior source of truth (acceptance criteria / spec / Jira / Confluence / Figma). "Without ACs, coverage is guesswork."
  2. Derive a scenario list as Given-When-Then statements covering: happy path(s), role/permission variants, state variants (new vs existing, present vs absent), negative/error paths, edge/boundary cases.
  3. Prioritize by user value and risk; do not exhaustively permute — push detail to unit/component.
  4. Decide grouping and data (shared `describe`/file, serial vs parallel, shared vs per-test) → feeds `data-strategy.md`.
  5. Draw the boundary with unit/component (`testing-principles`).
  6. Output a reviewable scenario list and **confirm it with the user before writing code** (trivial single-behavior test may state its one scenario and proceed).
Plus a cross-link to `analyzing-requirements` (don't restate requirement analysis).

- [ ] **Step 2: Write the file**

Author with `superpowers:writing-skills`. Include a short worked example: a feature ("device sharing") turned into a 4–6 item scenario list showing happy + a role variant + a negative path, expressed as GWT one-liners. End with the checkpoint instruction and the `analyzing-requirements` cross-link.

- [ ] **Step 3: Verify against the acceptance check**

Run: `grep -nE "role|negative|state|happy|checkpoint|analyzing-requirements" ~/.claude/skills/e2e-testing/references/test-planning.md`
Expected: matches for each coverage dimension, the checkpoint, and the cross-link.
Manually confirm the worked example lists multiple scenario types (not just happy path).

- [ ] **Step 4: Save & verify**

Run: `test -s ~/.claude/skills/e2e-testing/references/test-planning.md && echo OK` → `OK`

---

### Task 3: `references/data-strategy.md` — data setup & teardown

**Files:**
- Create: `~/.claude/skills/e2e-testing/references/data-strategy.md`

**Interfaces:**
- Consumes: `design.md` §"Components 4. data-strategy.md"; receives grouping/data decisions from `test-planning.md`.
- Produces: the baseline-vs-dynamic decision and the AAA split that authoring applies. Headings: `## Baseline vs dynamic`, `## Seed via API, not UI`, `## Real-hardware events`, `## Teardown & restore`, `## Arrange = API, Act = UI, Assert = UI`, `## Discovering this project's seeding mechanism`.

- [ ] **Step 1: Write the acceptance check**

The file passes when it contains:
  - A decision tree: **baseline** (accounts/orgs/roles/licenses/"already-exists" objects → pre-provisioned in fixtures, test does NOT create) vs **dynamic** (per-test objects/events → created at runtime + torn down).
  - "Seed via API, not UI": business objects via the project's API layer; backend state via DB access; **real-hardware events via an emulator/mock**; always pair creation with teardown restore.
  - The AAA split stated explicitly: **Arrange = API, Act = UI, Assert = UI** — reconciling "test like a user" with "seed fast & stable".
  - Discovery guidance: how Step 0 finds the project's seeding mechanism (search for API/GraphQL helpers, DB/AWS utilities, emulator/mock binaries, fixtures/constants) — described as *what to look for*, not fixed paths.

- [ ] **Step 2: Write the file**

Author with `superpowers:writing-skills`. Use a small decision-tree block (text or fenced pseudo-flow) and framework-neutral examples. Cite hardware emulation and API-seeding as patterns; mention "e.g. a device emulator, a mock event trigger" without hardcoding Vortex names.

- [ ] **Step 3: Verify against the acceptance check**

Run: `grep -nE "baseline|dynamic|Arrange|Act|Assert|emulator|teardown|discover" ~/.claude/skills/e2e-testing/references/data-strategy.md`
Expected: all present.
Manually confirm the AAA split line reads "Arrange = API, Act = UI, Assert = UI" and no fixed project path is required.

- [ ] **Step 4: Save & verify**

Run: `test -s ~/.claude/skills/e2e-testing/references/data-strategy.md && echo OK` → `OK`

---

### Task 4: `references/anti-patterns.md` — red flags → fixes

**Files:**
- Create: `~/.claude/skills/e2e-testing/references/anti-patterns.md`

**Interfaces:**
- Consumes: `design.md` §"Components 5. anti-patterns.md"; `bdd-standard.md` and `data-strategy.md` (fixes point back to them).
- Produces: the red-flag list the review mode scans for. Heading: `## Red flags` with a table.

- [ ] **Step 1: Write the acceptance check**

The file passes when it lists all eight anti-patterns, each with a concrete fix:
  1. Bare `// Given` labels → substantive phase comments.
  2. Fixed hard waits (`sleep`/`waitForTimeout` without cause) → auto-retrying assertions or a tiered timeout constant; if truly needed, comment why.
  3. Per-environment `if` inside a test → push env differences into fixtures; keep the test env-agnostic.
  4. Depending on data the test did not set up → self-provision or restore in teardown.
  5. Overuse of serial execution → default parallel; serial only with a stated reason.
  6. Non-user-facing selectors → user-facing (role/text/test-id).
  7. Building test data through the UI → API for Arrange/teardown.
  8. Hardcoded literals in specs → fixtures/constants.

- [ ] **Step 2: Write the file**

Author with `superpowers:writing-skills`. Format as a `| Red flag | Why it hurts | Fix |` table, one row per anti-pattern. Keep fixes one line each, linking to `bdd-standard.md`/`data-strategy.md` where relevant.

- [ ] **Step 3: Verify against the acceptance check**

Run: `grep -cE "hard wait|serial|selector|per-environment|hardcoded|// Given|UI|pre-existing|teardown" ~/.claude/skills/e2e-testing/references/anti-patterns.md`
Expected: covers all eight (count ≥ 8 distinct rows).
Manually confirm each row has a fix.

- [ ] **Step 4: Save & verify**

Run: `test -s ~/.claude/skills/e2e-testing/references/anti-patterns.md && echo OK` → `OK`

---

### Task 5: `references/checklist.md` — shared authoring + review checklist

**Files:**
- Create: `~/.claude/skills/e2e-testing/references/checklist.md`

**Interfaces:**
- Consumes: `bdd-standard.md`, `test-planning.md`, `data-strategy.md`, `anti-patterns.md` (the checklist is their union).
- Produces: the checklist both modes run. Headings: `## Authoring self-check`, `## Review audit`.

- [ ] **Step 1: Write the acceptance check**

Every checklist item must trace to a rule in another reference (no orphan items, no missed rules). Required items:
  - Scenario coverage matches the confirmed plan (from `test-planning.md`).
  - Title is a user-behavior sentence.
  - Given→When→Then order.
  - Meaningful (non-bare) phase comments.
  - Teardown restores baseline via API; read-only adds none.
  - Assertions user-observable; user-facing selectors; web-first.
  - Data seeded per `data-strategy.md` (baseline vs dynamic; API not UI).
  - No hardcoded literals.
  - No anti-pattern from `anti-patterns.md` present.
  - (Review only) pre-existing violations reported as backlog, not blocking.

- [ ] **Step 2: Write the file**

Author with `superpowers:writing-skills`. Two `- [ ]` checklists (authoring self-check, review audit) sharing the same rule items; the review section adds the diff-scope + backlog note.

- [ ] **Step 3: Verify traceability (consistency test)**

Run: `grep -c "^- \[ \]" ~/.claude/skills/e2e-testing/references/checklist.md` → expect ≥ 9 items per section.
Manually cross-check: each item maps to a rule in bdd-standard/test-planning/data-strategy/anti-patterns, and every rule in those files appears as a checklist item. Fix any mismatch (this is the type-consistency guard for the doc set).

- [ ] **Step 4: Save & verify**

Run: `test -s ~/.claude/skills/e2e-testing/references/checklist.md && echo OK` → `OK`

---

### Task 6: `SKILL.md` — router, discovery, and mode dispatch

**Files:**
- Create: `~/.claude/skills/e2e-testing/SKILL.md`

**Interfaces:**
- Consumes: all five reference files (must already exist for links to resolve).
- Produces: the skill entry point. Frontmatter `name: e2e-testing`; a dispatch table linking `references/*.md`.

- [ ] **Step 1: Write the acceptance check**

The file passes when it contains:
  - **Frontmatter:** `name: e2e-testing` and a `description` that (a) triggers on "write/add an e2e test", "scaffold an e2e spec", "review this e2e test/spec/PR against our standard", "does this spec follow BDD"; and (b) states it is NOT for running suites or unit/component tests.
  - **Overview** — global, framework-agnostic, author + review.
  - **Step 0 — discover project conventions:** locate the e2e directory, test framework + config, fixtures/constants, seeding utilities (API/DB/emulator/mock), page-object layout, and any project e2e README/standard; everything downstream adapts to what is found.
  - **Intent detection → mode dispatch.**
  - **Dispatch table** mapping each mode/topic to `[references/<file>.md](references/<file>.md)`.
  - **Authoring flow:** derive scenario list (`test-planning.md`) → CHECKPOINT (confirm with user) → locate route + page object → decide data source (`data-strategy.md`) → scaffold in the project's convention → write GWT with meaningful comments + teardown (`bdd-standard.md`) → self-check (`checklist.md`).
  - **Review flow:** collect changed/new tests (default diff scope) → check against `bdd-standard.md` + `anti-patterns.md` + coverage (missing scenarios?) → findings (file:line, violation, fix, severity); pre-existing violations listed separately as backlog.
  - **Cross-links:** `testing-principles`, `analyzing-requirements`, project running skill.
  - **What this skill never does:** run suites, do unit/component, hardcode project paths.

- [ ] **Step 2: Write the file**

Author with `superpowers:writing-skills`, matching `~/.claude/skills/testing-principles/SKILL.md` style (concise body, dispatch table). Keep SKILL.md thin — push detail into references. Use a dispatch table like:

```markdown
| Mode / need | Reference |
| --- | --- |
| Plan what to test (before writing) | [references/test-planning.md](references/test-planning.md) |
| The rule core (write & review) | [references/bdd-standard.md](references/bdd-standard.md) |
| Data setup & teardown | [references/data-strategy.md](references/data-strategy.md) |
| Red flags to avoid / flag | [references/anti-patterns.md](references/anti-patterns.md) |
| Final self-check / audit | [references/checklist.md](references/checklist.md) |
```

- [ ] **Step 3: Verify frontmatter and links resolve**

Run: `sed -n '1,6p' ~/.claude/skills/e2e-testing/SKILL.md` → confirm valid YAML frontmatter with `name` + `description`.
Run: `for f in test-planning bdd-standard data-strategy anti-patterns checklist; do test -f ~/.claude/skills/e2e-testing/references/$f.md && echo "$f OK" || echo "$f MISSING"; done` → all `OK` (every dispatch link points to an existing file).
Manually confirm Step 0, both mode flows, cross-links, and "never does" are present.

- [ ] **Step 4: Save & verify**

Run: `test -s ~/.claude/skills/e2e-testing/SKILL.md && echo OK` → `OK`

---

### Task 7: End-to-end subagent smoke verification

**Files:**
- Modify (as fixes require): any of the six files above.
- Reference: `superpowers:writing-skills` → `testing-skills-with-subagents.md` for the subagent-testing method.

**Interfaces:**
- Consumes: the complete skill (Tasks 1–6).
- Produces: a verified skill + a short results note appended to nothing persistent (report inline to the user).

- [ ] **Step 1: Run the six design smokes via fresh subagents**

For each, dispatch a fresh general-purpose subagent that is told to use the `e2e-testing` skill, and check the outcome:
  1. **Planning smoke** — give a feature + acceptance criteria; expect a scenario list (happy/role/state/negative) and a confirmation checkpoint before scaffolding; checkpoint skipped only for a trivial single-behavior case.
  2. **Authoring smoke** — after a confirmed scenario list, ask for the spec; expect it in the project's convention, GWT with substantive comments + API teardown, passing the checklist.
  3. **Review catches** — point at a known-bad sample (a hard wait; a bare `// Given`); expect exact file:line flags + fixes.
  4. **Coverage review** — give a PR testing only a happy path while role/negative variants exist; expect review to flag the missing scenarios.
  5. **Review precision** — point at a newly-written good test; expect no false positives, and pre-existing files reported as backlog not blocking.
  6. **Project adaptation** — run Step 0 in two different repos; expect discovery of each project's own conventions, not Vortex specifics.

- [ ] **Step 2: Record pass/fail per smoke**

Expected: all six pass. For any failure, note which file's guidance was insufficient.

- [ ] **Step 3: Fix gaps inline**

Edit the responsible reference/SKILL.md file to close each gap. Re-run only the failed smoke(s) until they pass.

- [ ] **Step 4: Final save & report**

Run: `find ~/.claude/skills/e2e-testing -type f | sort` → confirm `SKILL.md`, `design.md`, `plan.md`, and five `references/*.md`.
Report the smoke results to the user. (No commit — `~/.claude` is not a git repo.)

---

## Self-Review

**1. Spec coverage** — design deliverables mapped to tasks:
- SKILL.md (router + Step 0 + dispatch + both flows) → Task 6.
- test-planning.md → Task 2; bdd-standard.md → Task 1; data-strategy.md → Task 3; anti-patterns.md → Task 4; checklist.md → Task 5.
- Decisions #1–#7 (scope, GWT-meaningful-comments, packaging, framework-agnostic, name, location, test-planning+checkpoint) → Global Constraints + Tasks 1/2/6.
- Testing & Verification (6 smokes) → Task 7.
No gaps.

**2. Placeholder scan** — content specs enumerate concrete rules/examples; no "TBD"/"add appropriate…". The actual prose is written per file using `superpowers:writing-skills` (the plan specifies exactly what each file must contain).

**3. Type consistency** — cross-file names are fixed: reference filenames (`test-planning.md`, `bdd-standard.md`, `data-strategy.md`, `anti-patterns.md`, `checklist.md`) are identical in the File Structure, Task headings, SKILL.md dispatch table (Task 6), and Task 7 verification. The AAA phrasing "Arrange = API, Act = UI, Assert = UI" is used consistently (Task 3, design). The GWT "substantive comment, not bare label" rule is identical in Global Constraints, Task 1, Task 5, Task 7.

---

## Notes on deviations from the default writing-plans template

- **No TDD unit tests / no `git commit` steps:** the deliverable is a Markdown skill and `~/.claude` is not a git repo. The test-first analog is: define each file's acceptance check (Step 1) before writing it (Step 2), verify (Step 3), save (Step 4). Behavioral testing is the subagent smoke suite in Task 7, per `superpowers:writing-skills`.
