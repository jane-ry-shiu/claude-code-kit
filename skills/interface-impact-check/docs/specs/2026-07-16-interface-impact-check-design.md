# Interface Impact Check Design

**Date:** 2026-07-16
**Scope:** New skill `~/.claude/skills/interface-impact-check/`; modifications to `~/.claude/skills/code-review/SKILL.md`
**Author:** brainstorming session
**Motivating case:** PR #8370 (`VIVOTEK-IT/webtech-monorepo`) — `feat(reseller): [VOR-30390] detect MA2/MA4 devices in Vortex VO`

---

## Background

Every check in the current review stack is scoped to the changeset. A grep across
`code-review/`, `review-workflow/`, and `parallel-path-consistency/` returns zero hits for
`consumer`, `caller`, `impact`, `blast radius`, or `downstream`. No rule asks "who else
depends on the shape this diff just changed?"

`parallel-path-consistency` is the nearest neighbour but does not cover this. Its stated
scope: *"Analyzes only conditional structures that contain at least one diff-modified
branch."* Its notion of "sibling" is a sibling **branch inside the same conditional**, or a
sibling `.md` **inside the same openspec directory**. Neither reaches a separate file that
merely consumes the same data shape.

### The motivating case

PR #8370 changed `api/device/deviceVO.js` so that `plans.ADD_ON` — previously a fixed-key map
identical for every device — became a map whose keys depend on `deviceType`:

| resolved deviceType | ADD_ON shape |
|---|---|
| `CAMERA` | `{ CLOUD_BACKUP, ADVANCED_AI_BUNDLE, PPE, LPR, FALL, THINK_ALERT }` (unchanged) |
| `MA2` | `{ CLOUD_BACKUP_MA2 }` |
| `MA4` | `{ CLOUD_BACKUP_MA4 }` |
| `NVR` / `IP_SPEAKER` / `null` | `{}` |

The review verdict was **PASS**. Three separate classes of problem were missed, and each was
missed by a *different* mechanism:

1. **Never discovered.** `activationConfigAutoSetup` sends two different `productType` values
   for the same MA2 device (`X_PRO_MA2` when extending an existing licence, `X_PRO` when
   activating a new one). Both reach the backend. At most one can be correct. No `CLOUD_BACKUP`
   grep finds it — it lives in `MAIN`, not `ADD_ON`. It surfaced only after a deliberate
   change of search angle to the *write-back* path.
2. **Discovered, then discarded as "planned work".** Two composables still read the generic
   `CLOUD_BACKUP` key. The reviewer saw this and dropped it: *"這正是 T5 的驗收條件，屬已規劃的
   後續工作而非本 PR 的缺陷，所以沒開 comment."*
3. **Structurally out of frame.** Five sibling producers still build the generic 6-key bucket
   via `getAddOnLicenseTypes`, which has no `deviceType` parameter at all. Only `deviceVO.js`
   was taught the new shape.

Class 1 is a detection gap. Classes 2 and 3 are *reporting* gaps — adding a new check without
addressing them would produce findings that the existing rules throw away.

### Why a signature-based trigger cannot work

The PR author's own inventory comment argued, correctly, that every function signature stayed
backward-compatible: `getAddOnLicenseTypes` was **not modified**, VO signatures did not change,
new fields were purely additive. All true — and all irrelevant. The break is in the *data*, not
the *functions*. Consumers do not call `deviceVO`; they read a VO that flows down through the
store.

The strongest available signal is therefore not "did a signature change" but **"did a call site
swap to a variant of the helper it used to call"** — `getAddOnLicenseTypes` →
`getAddOnLicenseTypesByDeviceType`, visible directly in the diff.

### Token history

`code-review/docs/specs/2026-06-04-code-review-token-optimization-design.md` set the cost
philosophy. Of its scope, **A (lazy skill loading) landed**; **B (light/heavy mode) and
E (finding template tiering) did not** — grepping `light|heavy|Mode` in `code-review/SKILL.md`
returns nothing. The 2026-07-15 evidence-field change then added a **seventh** finding field
(`證據`). Net token direction since that optimization has been upward. Any new check must
therefore pay for itself at the gate.

That design's **Backlog item F** — *"Workflow 平行化：per-file sub-agent，主 context 只看彙總"*,
expected benefit **high** — is the route this design revives, with a gate in front of it so it
does not fire on every review.

---

## Goals

- Detect, at review time, when a diff changes a data contract and leaves sibling producers or
  downstream consumers behind
- Cost **zero** additional tokens on reviews where no contract change occurs
- Keep main-context growth flat when the check *does* fire — expensive work happens in
  subagents; main context receives only a structured summary
- Report findings in a form the existing rules will not silently discard
- Reproduce, unprompted, the three finding classes that PR #8370's review missed

### Non-goals

- Exhaustive proof of runtime impact. The check establishes static contract mismatch; whether
  users actually see breakage often depends on production data and is handed to the author as a
  question.
- Auto-fixing. Consistent with `code-review`, which does not auto-fix.
- Replacing `parallel-path-consistency`. See "Rejected approaches".

---

## Constraints

| Constraint | Consequence |
|---|---|
| GitHub review comments can only anchor to lines **inside the diff** | Affected siblings/consumers are by definition outside the diff. One comment per contract change, anchored at the producer's origin line, listing affected files in the body. Not one comment per affected file. |
| `Workflow` tool requires explicit user opt-in | This pass fires automatically on gate hit, so it cannot use `Workflow`. Uses parallel `Agent` dispatch instead, and therefore has no schema enforcement — return format is specified in the prompt. |
| `code-review` HARD RULE: runtime claims cap at LOW without runtime evidence | The `導致問題` field must stop at the last statically provable step. See "Section 3". |
| `~/.claude` is not a git repo | Rollback via manual backup. See "Rollout". |

---

## Section 1: Architecture — two directions

A contract change propagates two ways, and their costs differ by orders of magnitude.

### Lateral (sibling producers) — grep for candidates, then filter

Other places that build **the same shape**. These changes leave a named anchor in the diff:
`deviceVO.js` swapped `getAddOnLicenseTypes` for `getAddOnLicenseTypesByDeviceType`. Grepping
the old name across the package returns the candidate set.

**Measured on PR #8370 at head `be031eac5f`**, `getAddOnLicenseTypes(` returns **17 hits**, not
the 6 siblings:

| Hits | Kind | Disposition |
|---:|---|---|
| 1 | the function definition (`licenseHelper.js:148`) | discard |
| 1 | test file (`activationHelper.test.js:56`) | discard |
| 6 | build a map keyed by license type that holds plan data | **siblings — report** |
| 9 | only enumerate the key names — `headerItems` column arrays, or `validator: (v) => types.includes(v)` | different concern — discard |

So the grep is free but **not sufficient**: narrowing 17 → 6 is judgement, performed by main
context reading each call site's surrounding lines. The discriminator:

> Does this call site build a **map keyed by the contract's key names, whose values hold the
> entity's data**? Or does it merely **enumerate the key names** for a column list or a
> membership check?

**Persisted vs. transient is explicitly not the test.** This was measured: a blind run of the
procedure on 2026-07-16 classified 16 of 17 candidates correctly but could not decide
`useTableDeviceActivationTools.js:289`, because its `initTargetMap` is a scratch structure used
only to route batch updates and never written back to any entity. It **is** a sibling — keyed by
the contract, holding data under those keys. That file contains the motivating case's worst
defect (`activationConfigAutoSetup`), so a discriminator that cannot classify it defeats the
check's main purpose. The wording must rule on structure, not lifetime.

This costs ~15 short context reads — still an order of magnitude below the downstream fan-out, so
the "lateral first" ordering holds. The claim it does *not* support is "one grep yields the
answer"; treat grep output as a candidate list.

**Honest limitation:** this only works when the contract has a named anchor (helper function,
constant, typedef) that the diff visibly touches. A shape hand-rolled as an inline object
literal has no anchor to grep. That gap is deliberately not compensated here — it is covered,
imperfectly and at cost, by the `enumerate` lens in Section 4.

### Downstream (consumers) — fan-out, expensive

Who **reads** the changed shape. There is no named link between producer and consumer:
`TableDeviceInfoCamera.vue` never imports `deviceVO`; it renders a VO that arrives via the
store. Only semantic tracing finds these, which means subagents.

### Ordering: lateral first, and it gates the fan-out width

Lateral runs first because its result is the best available prior for how bad downstream is:

| Lateral result | Downstream fan-out |
|---|---|
| Siblings found (PR #8370: five) | 3 agents — the change is demonstrably partial |
| No siblings (sole producer) | 1 agent — read path only |

### Search scope

Package-first, matching the existing convention (`code-review` explicitly does not review
outside the current package). PR #8370's consumers were all inside `app-reseller-portal`.
Expand to repo scope only on concrete evidence of a cross-package contract — the changed file
lives under `core/*`, `const-vsaas`, or `lib-*`, or is imported by another package.

---

## Section 2: The gate

Three stages. Cost is bounded at each.

### Stage 1 — Mechanical signal (free)

Lives in `code-review/SKILL.md` Step 3, which already classifies changed files and holds the
diff. The signal is read off information already in context; it costs no additional reads.

Fires if **any** of:

| # | Signal | Rationale |
|---|---|---|
| 1 | A call site swaps a helper for a variant of it (`fnName` → `fnNameByX` / `fnNameForX`, or vice versa) | Strongest signal. Fires on PR #8370. Catches exactly the case where signatures are untouched but the shape moved. |
| 2 | Diff touches `*VO.js`, `*DTO.js`, `api/**`, `constants/**`, `models/**` | Path heuristic for contract-bearing files |
| 3 | A typedef, `@returns`, or `@param` shape declaration changes | Declared contract moved |
| 4 | An object-literal key is added or removed in a constructed/returned value | Shape moved without any declaration changing |

For PR #8370's `deviceVO.js`, signals 1, 2, and 3 all fire.

### Stage 2 — False-positive verification (cheap)

Read the diff hunk that triggered the signal — usually already in context, since Step 5
mandates reading diff hunks anyway. Clear the gate and stop if the change is:

- comments or JSDoc prose only
- formatting / whitespace
- a pure rename with no shape change
- a typo fix

**Measured (2026-07-16), on a constructed comment-only diff to `api/device/deviceVO.js`:** signal
2 fires on the path; Stage 2 reads the hunk, sees only an added `//` comment, and clears the gate
— zero agents dispatched. A blind run confirmed it, and also confirmed the gate resists a trap
worth noting: the diff's *context* lines mention `getAddOnLicenseTypesByDeviceType`, but signal 1
requires the swap to appear on `+`/`-` lines, so it correctly did not fire.

**A note on `utils/**`, deliberately excluded from signal 2:** `licenseHelper.js` lives there and
defines the contract helpers, which makes it a tempting addition. It is not needed. The actual key
vocabulary lives in `LICENSE_SERVICE.INFO.CATEGORY[ADD_ON].ITEMS` under `constants/`, which signal
2 already covers; the helper itself is a pass-through. Adding `utils/**` would fire the gate on
every formatter and validator in the tree and buy no coverage.

Consequence for testing: `licenseHelper.js`'s real two-comment-line diff
(`6ef8751469..7a9001d101`) is a **Stage 1 does-not-fire** case, not a Stage 2 case. Testing Stage 2
requires a diff that matches a path signal, which is why the test above is constructed.

### Stage 3 — Dispatch

Confirmed contract change → load `interface-impact-check` skill body → lateral grep →
downstream fan-out sized by the lateral result.

### Cost summary

| Situation | Additional cost |
|---|---|
| Gate does not fire (the large majority of reviews) | **0** |
| Fires at Stage 1, cleared at Stage 2 | **≈0** — one diff hunk re-read, usually already in context |
| Full run | Lateral: one grep. Downstream: 1 or 3 subagents. Main context receives only structured summaries, not file contents. |

---

## Section 3: Output and scope classification

### One comment, anchored at the producer

Forced by the platform constraint. The comment anchors at the line where the shape change
originates — for PR #8370 that is `deviceVO.js:243`, where `resolveDeviceTypeFromVortex` runs
unconditionally for every device on the CAMERA tab. The body lists affected siblings/consumers
as evidence.

`code-review/SKILL.md` must state explicitly: **this is one finding with an evidence list, not
several findings bundled together.** Otherwise a future reviewer will read it as a violation of
the `pr-review` HARD-GATE ("Do NOT bundle multiple findings in one comment"), which targets
*unrelated* issues.

### Step 5b needs clarification, not override

Step 5b currently reads: *"Problem spotted in other files → out-of-scope."* That rule assumes
the other file's problem **pre-existed** the diff — correctly excluded as scope creep. An
interface-impact finding is the inverse: those files were correct before this diff and are
incorrect after. **The diff created the mismatch.**

By Step 5b's own first row — *"Finding directly relates to diff-added/modified logic"* — such
findings are already in-scope. The wording simply does not reach them. Add a row:

| Situation | Scope |
|---|---|
| Diff changes a data contract; sibling producers or consumers in other files are now inconsistent with it | `in-scope` — the diff created the inconsistency; the other files were consistent before |

### An existing ticket is not a reason to suppress

Add to `code-review` Common Mistakes:

| Mistake | Fix |
|---|---|
| Treating a contract gap as a non-defect because a ticket (e.g. T5/T11) covers it | The ticket covers the future; the merge happens now. Report it, framed as a merge-order risk. Cite the ticket in the comment body as context, never as grounds for silence. |

This is the mechanism that discarded PR #8370's class-2 findings.

### Severity: stop at the last statically provable step

The runtime-claim HARD RULE caps severity at LOW absent runtime evidence, and *"MA2's Cloud
Storage column will be blank"* **is** a runtime claim — its truth depends on whether MA devices
exist in Vortex data. Written that way, the finding is capped at LOW and the whole pass is
wasted.

The resolution is not an exception. It is to write `導致問題` so it stops at the last step that
code alone establishes:

> producer emits `{ CLOUD_BACKUP_MA2 }`; consumer reads `plans.ADD_ON['CLOUD_BACKUP']` →
> **receives `undefined`**

Every step there is provable from source — the last one is a language-level fact, not an
observation of a running system. The visual consequence is **not written as a claim**. It
becomes the question handed to the author:

> Vortex 資料中目前是否已有 MA2/MA4 裝置？

**Consequence: interface-impact findings cap at HIGH (→ WARN) and never BLOCK**, because their
true severity always carries an unresolved runtime question. For PR #8370 this converts that
round's PASS into WARN with "resolvable once the author confirms the data situation" — the
correct outcome at the time.

### Step 6 header

Mirroring the existing `候選規則 / 實際套用` transparency lines:

```
Interface impact：{triggered signal} → sibling {N} / consumer {M}
Interface impact：未觸發
```

---

## Section 4: Fan-out orchestration

### Tool

Parallel `Agent` dispatch — multiple `Agent` calls in a single message. `Workflow` is
unavailable (requires explicit user opt-in; this pass is automatic). No schema enforcement is
therefore available; the return format is specified in the prompt.

### Lenses, not directories

Partition by **search angle**, each agent blind to the others' findings. Directory-based
partitioning misses cross-cutting paths.

| Lens | Question | Evidence it exists |
|---|---|---|
| **read** | Who reads this shape using the old key? | PR #8370's blank Cloud Storage column, silent-degradation composables |
| **write** | Do remapped values flow back to the backend, into DTOs, or into cross-system matching? | **PR #8370's most serious finding.** `activationConfigAutoSetup` sends two different `productType` values for the same device. No `CLOUD_BACKUP` grep reaches it — it lives in `MAIN`. It was found only by deliberately switching to the write-back angle. Without this lens the worst defect stays invisible. |
| **enumerate** | Who builds this shape from a generic list? | Compensates the lateral grep's stated limitation — finds hand-rolled shapes with no named anchor |

Sizing per Section 1: 3 lenses when siblings were found, `read` only when not.

### Agent return format

Facts only, no judgement:

| Field | Content |
|---|---|
| `file:line` | Affected location |
| `讀到的事實` | The last statically provable step, e.g. `plans.ADD_ON['CLOUD_BACKUP']` → `undefined` |
| `方向` | read / write / enumerate |
| `是否 crash` | Silent degradation vs. thrown error — the key severity discriminator |

**Agents deliberately do not map findings to tickets.** `tasks.md` is read once by main context,
which already holds the PR context; three agents each reading it is triple waste.

### Verification: spot-read, not a verifier fan-out

This departs from the usual adversarial-verify pattern, deliberately. These claims are static
and citable (`file:line` + content read), and the `證據` field mechanism already forces
citation. A refuter round buys the same guarantee twice.

**Rule: every item that enters the comment must have been read at that `file:line` by main
context.** Precedent from the motivating case: *"三個 agent 的結論高度收斂。但這些是 load-bearing
的主張，我不能直接轉述——先自己驗證最關鍵的幾條。"*

When the list is long, the comment cites representative items, states the total, and **explicitly
declares what was not individually verified.** This follows the existing "降級是合法出口"
philosophy, and both prior sessions did it unprompted.

### Merge into Step 6

Main context deduplicates by `file:line` → produces the single Section 3 finding plus the
author question → merges into `code-review`'s findings → flows through the orchestrator's
existing Step 4 (validation) and Step 5 (posting). V1 validation (re-deriving the line anchor
from the diff hunk) passes, because the anchor is the producer line, which is in the diff.

---

## Change overview

| Change | File | Detail |
|---|---|---|
| Gate (Stage 1 + 2 criteria) | `code-review/SKILL.md` Step 3 | ~8-line signal table + false-positive clearing rules |
| Scope row | `code-review/SKILL.md` Step 5b | Diff-created cross-file inconsistency → in-scope |
| **Boundaries amendment ×2** | `code-review/SKILL.md` Boundaries | See below — two stated boundaries currently contradict this design |
| Common Mistakes rows | `code-review/SKILL.md` | Ticket-exists suppression; one-finding-with-evidence-list vs bundling |
| Header line | `code-review/SKILL.md` Step 6 | `Interface impact：…` |
| Skill body | `interface-impact-check/SKILL.md` (new) | Lateral grep, fan-out orchestration, lens prompts, return format, verification rule. Loaded only on gate hit; also directly invocable. |

### Boundaries amendments (required — do not skip)

`code-review/SKILL.md` currently declares two boundaries that this design violates. Both must be
reworded, or the implementation contradicts the skill it lives in.

**1. "Review files outside the current package / PR scope"**

The whole point of this check is to read files outside the PR. Package scope is still respected
(Section 1: package-first). Reword to preserve the package boundary while permitting the
contract-impact exception:

> Review files outside the current package (contract-impact analysis may read other files
> *within* the package; cross-package only on the evidence rule in `interface-impact-check`)

**2. "Hardcode specific skill names — all skill loading is dynamic based on description matching"**

The gate must name `interface-impact-check` explicitly. This cannot be delegated to dynamic
discovery: Step 3c matches skill descriptions against **file types present in the changeset**, so
the skill would become a candidate for every `.js` changeset and Stage 2 would read its body on
the first `.js` file — paying the full cost on every review. That is precisely the token failure
that disqualified the `parallel-path-consistency` approach.

Note this boundary is **already inaccurate**: the Mandatory Skills table hardcodes
`naming-conventions`. Reword to describe actual behaviour:

> Hardcode *rule-skill* loading by file type — file-type rule discovery is dynamic via
> description matching. Explicitly gated skills (`naming-conventions`, `interface-impact-check`)
> are named by design.

`review-workflow` requires **no changes** — findings flow through `code-review`'s existing
output contract, so both `pr-review` and `local-branch` inherit the check.

`references/checklist.md`, `references/batch-strategy.md`, and `parallel-path-consistency` are
untouched.

---

## Rejected approaches

### Extend `parallel-path-consistency`

Conceptually the right home. It defines itself as a *"change completeness check — is this change
complete across all relevant code paths?"*, and "producer changed, consumers did not" is that
question at a larger radius. Its `Future Patterns (Not Yet Active)` section even sets the bar:
*"Added when backed by real-world cases (at least one missed finding causing rework)"* — PR #8370
clears it.

**Rejected on token grounds.** The skill is picked up by dynamic discovery and read in full for
**any** `.js`/`.vue` changeset. Adding fan-out orchestration to it makes every review pay for that
text whether or not the gate fires — in direct conflict with the cost premise.

### Put everything in a `code-review` reference, no standalone skill

Fewer moving parts, but `code-review/SKILL.md` is already 392 lines and its Step 5 is a per-file
loop; changeset-level fan-out orchestration does not fit inside it. Also forfeits direct
invocation, which has a demonstrated use case: the motivating analysis was originally produced by
the user asking, by hand, *"這個 PR 是不是改動了特定的 interface 格式"* and *"有多少檔案會被影響到"*.

---

## Testing & Rollout

Manual verification. No unit tests — consistent with the existing skill docs.

### Acceptance: PR #8370 as regression case

The strongest available test, because the ground truth is fully documented.

PR #8370 is **not merged into main** (verified 2026-07-16: main's `deviceVO.js:11` still calls the
generic `getAddOnLicenseTypes`). Run against commit `be031eac5f` — it and `6ef8751469` /
`7a9001d101` are present locally.

1. Re-run `/review-workflow` on PR #8370. **Gate must fire** on `deviceVO.js` (signals 1, 2, 3).
   Signal 1 is verifiable directly: `be031eac5f:deviceVO.js:218` calls
   `getAddOnLicenseTypesByDeviceType`, whereas main's `deviceVO.js:11` calls
   `getAddOnLicenseTypes`.
2. **Lateral must narrow 17 candidates to the 6 sibling producers.** The grep
   (`getAddOnLicenseTypes(` at `be031eac5f`) returns 17 hits — measured, not estimated. The
   filter must discard the definition (`licenseHelper.js:148`), the test
   (`activationHelper.test.js:56`), and the 9 enumerate-only call sites, keeping
   `activationHelper.js:11`, `useTableDeviceActivationHelper.js:94`,
   `useScheduleActivationHelper.js:92`, `useTableDeviceActivationTools.js:289`,
   `FormDeviceActivationManualSetup.vue:127`, and
   `FormDeviceActivationManualSetupWithoutPlan.vue:108`. **Reporting all 17 is a failure**, not a
   conservative pass — it is the noise that makes the check ignorable. Equally, **dropping
   `useTableDeviceActivationTools.js:289` is a failure** — it is the transient-map trap, and it is
   where the worst defect lives.
3. Siblings found → **3 agents**. The `write` lens **must surface the `activationConfigAutoSetup`
   dual-`productType` defect** — the check's core justification. If it does not, the lens
   definition is wrong.
4. Findings must reach the comment **rather than being dropped as "T5 covers it"**.
5. **Verdict must be WARN, not PASS**, with the author question attached.

### Negative test

A changeset touching only comments in `utils/` (the `licenseHelper.js` two-comment-line case).
Stage 1 fires; **Stage 2 must clear it; zero agents dispatched.**

### Cost test

A routine `.vue` leaf-component PR with no contract change. **Gate must not fire; token usage
unchanged from today.**

### Rollback

`~/.claude` is not a git repo. Back up before applying:

```
~/.claude/skills/.backup-2026-07-16/code-review/SKILL.md
```

Restore by overwriting. The new skill directory can simply be deleted.

---

## Open questions

None. All design decisions were settled during the brainstorming session.

## Backlog

| Item | Note |
|---|---|
| Contract shapes with no named anchor | The `enumerate` lens is a partial, semantic-search-based mitigation. A stronger mechanism (e.g. declared contract registry) was considered out of proportion to the benefit. |
| Cross-package contract detection | Currently evidence-triggered (`core/*`, `const-vsaas`, `lib-*`, cross-package import). If cross-package misses show up in practice, revisit. |
| Backlog B / E from the 2026-06-04 token design | light/heavy mode and finding template tiering never landed. Unrelated to this change, but they remain the largest known token levers and would offset this check's cost. |
