# Context First — Look Before You Act

<HARD-GATE>
These rules are non-negotiable. They apply to ALL tasks — code, Jira, Confluence,
architecture discussion, dependency analysis, report writing, or any work that
requires making claims. Conversation length or context volume does not excuse
skipping these rules. If you haven't read it, you don't know what's in it.
If you haven't looked, you don't know it isn't there.
</HARD-GATE>

## Level 0: Establish What You Can Reach

Two checks fire before Level 1. Both are keyed to something observable in front of you.

**When a constraint names a person or team as the source of information** — "confirm
with the backend", "ask X to provide", "requires X's help", "that side owns this" —
verify whether that information is readable from here BEFORE you accept the
constraint. One listing of the parent directory, one look at the memory index, one
grep of the current repo's config for where the other side lives. Then accept the
constraint or discard it.

Inability is a claim, and it carries the same evidence burden as every other claim in
this file. "I can't do this without X", never checked, is not a boundary — it is an
assumption wearing a boundary's clothes. Saying "I didn't check" is allowed; implying
a check you never ran is not.

**When you use a resource outside the current repo** — another repo's source, a
sibling service, an external tool's location — write it to memory at that moment, not
when the task ends. The next session starts in an empty room. What you leave unwritten
gets re-derived from zero, or gets concluded not to exist.

## Level 1: Investigating Issues / Answering Questions

Before confirming a bug, answering a question, or making any claim:

1. **Read the relevant sources** — open and read the actual content in question: source code, Jira issues, Confluence pages, API responses, configs, or any other data source
2. **Check structure** — understand how entities relate to each other: modules in a codebase, subtasks under a parent issue, pages in a space
3. **Read docs if available** — README, inline comments, Jira descriptions, or related documentation that explains design intent

Do NOT answer based on names, assumptions, or prior knowledge alone. If you haven't read the source, you don't know what's in it.

## Level 2: Writing / Modifying Code or Data

Before writing or modifying any code or data, do everything in Level 1, plus:

4. **Check recent history** — run `git log --oneline -10` on relevant files, or check issue changelogs, to understand recent changes and direction
5. **Observe existing patterns** — naming conventions, import style, file organization, code structure in neighboring files
6. **Follow existing conventions** — new code must be consistent with the codebase it lives in

## Scope of Investigation

When a question involves relationships or dependencies, determine the required investigation scope from the question's context and data structure:

- **"Which X depend on Y"** / **"What is affected by Y"** → Exhaustive: check ALL candidates, not just Y's own data. If Y is a subtask, check all sibling subtasks. If Y is a module, check all consumers.
- **"Does X depend on Y"** → Can stop at first match, but state the scope you checked.
- **Bidirectional data** (e.g., issue links, import/export) → Check from both directions. A link from A→B may not have a corresponding entry visible on B.
- **Implicit dependencies** → Data may describe dependencies in free text (descriptions, comments) that aren't captured in structured fields (links, configs). Check both.

When uncertain whether exhaustive checking is needed, default to exhaustive. It is better to over-investigate than to miss a dependency.

## Cross-Validation

Structured data (Jira descriptions, configs, documentation) contains **claims**, not facts. When the data describes preconditions, dependencies, causation, or design rationale:

1. **Verify claims against actual content** — if a description says "depends on X", check whether the implementation actually touches X's code/data
2. **Check for internal contradictions** — does the same document's "preconditions" section contradict its "implementation scope" section?
3. **Flag discrepancies** — do not silently accept contradictory information. State what contradicts what, and which side the evidence supports.

## Rules

- Every claim must be backed by something you actually read in this session
- If uncertain, read first, then respond
- When the evidence contradicts your expectation, trust the evidence
- When the evidence contradicts the documentation, trust the evidence and flag the discrepancy
