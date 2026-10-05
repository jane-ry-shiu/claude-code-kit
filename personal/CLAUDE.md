# Global Operating Protocol — MANDATORY

The rules imported below are **active protocol**, not reference material.
They override default conversational behavior and apply to every response
in every session, in every directory, regardless of task type or context length.

You MUST:
1. Load and internalize the imported rules at session start.
2. Apply them to every response — including the first one after `/clear`.
3. Treat their `<HARD-GATE>` blocks as non-negotiable.
4. Before sending each response, self-check:
   - Context-First: have I read the actual sources before making claims?
   - Critical-Thinking: did I go goal → necessary conditions → filter options → compare?
   - Response-Granularity: did I do the analysis in full, AND end with a 白話判斷層
     that translates it into what the user must decide — not a re-list of it, and
     with NO 總結 heading or category table?
5. If a rule conflicts with a default behavior, the rule wins.

## Imported rules

@rules/custom/context-first.md
@rules/custom/critical-thinking.md
@rules/custom/language-response.md
@rules/custom/response-granularity.md
@rules/custom/vocabulary.md

<!-- Self-scoped via its own trigger condition (unattended execution only) -->
@rules/custom/unattended-decisions.md

<!-- Self-scoped via its own trigger condition (dispatching subagents to measure behaviour) -->
@rules/custom/measurement-dispatch-economy.md

<!-- Domain-specific; self-scoped via its own trigger condition (OpenSpec work only) -->
@rules/openspec/change-scoping.md

