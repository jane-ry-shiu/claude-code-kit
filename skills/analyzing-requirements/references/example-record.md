# Example Record (worked sample)

This shows the target **shape and depth** of the analysis record. It is illustrative — the "Device Filter Combo" case — **not a form to copy verbatim**. Match the layout, the id scheme, the status/category tags, and the depth signals (codebase grounding before the scope table, pattern-type grouping, truth tables, per-item owners, "confirm with PM" / "backfill" markers). Your real content will differ.

Self-contained on purpose: this file is the canonical shape reference and is always available. Any external "gold standard" page (e.g. the team's Logic page) is an optional, fuller real example — never depend on it; it can move, change, or be auth-blocked.

---

# Analysis Record — <feature name>

**Source:** <high-level spec / OpenSpec change>  ·  **Stage:** pre-implementation analysis (stops at slicing)
**Status:** `pending-confirm` 待確認 · `in-this-round` 本輪做 · `not-this-round` 本輪不做 · `deferred` 緩
**Categories:** `confirmed-decision` · `supplementary-decision` (+backfill) · `spec-gap` · `known-limitation` · `technical-constraint` · `phasing`
**Save location:** `pending-confirm` — ask the owner before this becomes the source of truth.

## Phase 1 — Summary & scope

*Plain-language summary (a few sentences): what it does, key operations, logic.*

**Codebase grounding (HARD GATE — done before the scope table; opened the real code, not just the spec):**
- **Pattern classification:** the Device list is a *page-based table toolbar* surface (chips + search live in the list toolbar). The Site picker it reuses is a *sidebar tree* surface — different pattern, different shared component.
- **Spec-vs-reality:** spec says "reuse the existing Device Query API" — the real endpoint is per-site only, no server-side search/type/status (→ A-T1). Spec implies a fresh filter bar — a shared `FilterChipShell` already exists, unconsumed → adopt, don't build.
- **Untracked same-pattern surfaces:** the Users list and Archive list share the same table-toolbar pattern but aren't in this spec — candidates for the same shared component (flag, decide in/out).

Scope items grouped by **pattern type** (not by page name):

| id | Scope item | Pattern | Note | Status |
|----|-----------|---------|------|--------|
| S1 | Filter chips (Site/Type/Status) + query wiring | table-toolbar | core unit; adopt existing `FilterChipShell` | `in-this-round` |
| S2 | Free-text Search box | table-toolbar | AND/OR vs chips undefined → see A-G1 | `in-this-round` |
| S5 | Saved Filters panel | — | separate feature — don't bundle | `not-this-round` |
| S6 | Bulk Action toolbar (export/delete/move) | — | 3 verbs incl. destructive — split per verb | `not-this-round` |

> **Scope gate:** statuses are *proposed* until the user confirms in/out. Only the confirmed `in-this-round` set is deep-assessed in Phase 3.

## Phase 2 — Coarse work breakdown (in-scope only)

W1 chip components · W2 search box · W3 filter→query + list fetch · W4 selection + "select all filtered" · W5 add-to-Group action · W6 page integration. *(No detail — that is Phase 3.)*

## Phase 3 — Assessment

### 3a. Design-source binding — HARD GATE

| id | Component | Design source | Status · owner |
|----|-----------|---------------|----------------|
| A-D1 | Site filter chip (multi-select) | **MISSING** — spec says "follow the new design", none attached | `pending-confirm` · designer/PM |
| A-D2 | Search box | **MISSING** | `pending-confirm` · designer/PM |

> **Gate result: BLOCKED.** No source → STOP. Components not specified/structured/deferred. Do not invent "sensible defaults".
> **If running without a human channel (e.g. delegated to a sub-agent):** do NOT try to ask interactively — record the `pending-confirm` + owner as above and **return it to the orchestrator to surface**. Returning the gap satisfies the gate; inventing visuals does not.

### 3b. Spec-gap check

| id | Gap / ambiguity | Category · status · owner |
|----|-----------------|---------------------------|
| A-G1 | Is Search part of the chip AND, or a separate query? Spec silent. | `spec-gap` · `pending-confirm` · PM |
| A-G2 | Across-facet = AND? Within-facet (multi Site) = OR? Assumed, not stated. | `spec-gap` · `pending-confirm` · PM |
| A-G3 | "Select all filtered" = all cross-page matches or only loaded rows? Drives the cap risk. | `spec-gap` · `pending-confirm` · PM |
| A-G7 | In-session filter persistence — default non-persistent. | `supplementary-decision` · backfill · PM |

**Combination truth table (the depth to reach — fill once A-G1/A-G2 are decided):**

| Site | Type | Status | Search | Result set |
|------|------|--------|--------|-----------|
| ✓ | — | — | — | devices in Site |
| ✓ | ✓ | — | — | Site **AND** Type |
| ✓ | ✓ | ✓ | "cam01" | Site AND Type AND Status **AND** search? ← A-G1 decides |

### 3c. Technical constraints — verify against the REAL system

| id | Finding (from the real API/data, NOT the spec text) | Category |
|----|------------------------------------------------------|----------|
| A-T1 | "Reuse existing Device Query API" is a *claim*: real endpoint is per-site only, no server-side search/type/status filter → **client-side filter + short-circuit**. | `technical-constraint` |
| A-T2 | No total-match count for "select all filtered"; selection cap unverified → measure with real data before sizing. | `known-limitation` |
| A-T3 | No "add to Group" batch endpoint found → S4 needs new backend work. | `technical-constraint` |

> **No silent unknowns:** every unresolved item is `pending-confirm` + owner, or an explicit assumption + backfill note.

## Phase 4 — Recommended slicing & hand-off

Apply `change-scoping.md`: one logical unit per change; domain-stable capability names; don't bundle.

| Change | One logical unit | Items | Capability | Blocked on |
|--------|------------------|-------|------------|-----------|
| C1 | Filter the Device List (chips + search) | S1, S2 | `device-list-filtering` | A-D1/2, A-G1–G3, A-T1 |
| C2 | Select from the filtered list | S3 | `device-list-filtering` | A-D*, A-G3, A-T2 |
| C3 | Add selected devices to a Group | S4 | `device-grouping` | A-T3 (backend), A-G* |

Deferred (not assessed): S5 Saved Filters; S6 Bulk actions (split per verb).

**Open items blocking hand-off:** design source (A-D*), scope confirm, behavior decisions (A-G*), real-API verification (A-T*), save location.

**Boundary:** STOP here. Do not generate `proposal.md` / `specs/`. Hand to the OpenSpec proposal flow once the open items clear.
