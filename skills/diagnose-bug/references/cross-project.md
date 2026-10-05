# Phase 2: Cross-Project Analysis

## When This Loads

Phase 1 (analyze.md) traced to the codebase boundary (typically an API endpoint) and could not determine root cause. User has provided a path to an additional project (e.g., backend repo).

## Input

- Phase 1 results already in conversation context (data flow, breakpoints, API endpoint identified)
- Additional project path provided by user

## Flow

1. From Phase 1's identified API endpoint, locate the corresponding handler in the new codebase
2. Trace backend logic: route handler → service/controller → database query / external API call
3. Identify backend breakpoints (same format as Phase 1)
4. **Self-correct** if Phase 1 classification was wrong
5. Merge all findings into unified report

## Locating the API Handler

| Strategy | Method |
|----------|--------|
| Route/path search | grep the API path (e.g., `/api/v1/devices`) in router/route config files |
| Controller search | Search for handler function names matching the endpoint |
| Framework convention | Follow framework routing conventions (Express routes, NestJS controllers, etc.) |

## Tracing Backend Logic

```
Layer 1: Route Handler
  → Find the function handling the request
  → Identify parameters, middleware, auth checks

Layer 2: Service / Business Logic
  → Trace data retrieval and transformation
  → Identify filters, conditions, permission checks

Layer 3: Data Layer
  → Database queries, external API calls
  → Response formatting and serialization
```

At each layer: record breakpoints with file path, line number, and confidence level — same format as Phase 1.

## Self-Correction Rule

<HARD-GATE>
If Phase 2 findings contradict Phase 1's classification, you MUST explicitly correct the earlier judgment. Do NOT silently update — state what changed and why.
</HARD-GATE>

```
⚠️ Correction:

Phase 1 classified this as [{original}] because {original reasoning}.
After tracing {new project} code, {what was found — with file:line evidence}.

Revised classification: [{corrected}]
Revised root cause: {description with code evidence from both projects}
```

This applies whenever new evidence invalidates a previous conclusion.

## Unified Report

Merge Phase 1 and Phase 2 findings:

```
━━━ Unified Analysis ━━━

Data Flow (full trace):
  [Frontend] {Component}.vue → {composable} → API call: {method} {path}
  [Backend]  {handler} → {service} → {data layer}

All Breakpoints:

1. [{frontend}] {description}
   Project: {frontend project}
   File: {path}:{line}
   Confidence: {level}
   Verify: {how}

2. [{backend}] {description}
   Project: {backend project}
   File: {path}:{line}
   Confidence: {level}
   Verify: {how}

Classification: {Frontend / Backend / Both}

{⚠️ Correction block if applicable}

Suggested Reproduction:
  1. {step}
  ...
```
