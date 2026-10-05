# Quick Hypothesis

Generate a preliminary list of possible causes before deep tracing, based on shallow code inspection.

## Input

- Problem description (text) — from conversation context (Redmine/Jira issue, or direct user input)
- Screenshots (images) — optional
- Codebase — current workspace or GitHub repo

## Locate

Lightweight locate — find the most likely relevant file(s) without full verification:

| Priority | Strategy |
|----------|----------|
| 1 | grep visible text from description (error message, page title, feature name) → find template or i18n key |
| 2 | Search router config for matching route/page name |
| 3 | Search `src/pages/` or `src/components/` by keyword |

If no clear match → list candidates, ask user to confirm. Do not spend more than 2-3 searches.

## Shallow Scan

Starting from the located component, scan surface-level code only. Depth adapts to what's visible:

| Scan | What to read | Stop at |
|------|-------------|---------|
| Template | Rendering conditions (v-if, v-show, v-for), bound props, event handlers | Don't trace handler implementations |
| Script top-level | Data declarations (ref, computed, props, store imports, composable calls) | Don't read composable/store internals |
| Router config | Route guards, middleware, meta fields for the matched route | Don't trace guard implementations |
| Directory structure | Sibling files, related components in same directory | Don't open unrelated modules |

**Rule:** If you need to open a second-level file (composable source, store action body, API function) to understand something, stop — that belongs to Step 3.

## Hypothesis Generation

For each rendering condition or data source that **could explain the bug symptom**, create a hypothesis entry.

### Confidence Criteria

| Level | Condition | Example |
|-------|-----------|---------|
| high | Bug symptom directly maps to visible code | Description says "list empty", template has `v-if="list.length"` with data source that could be empty/undefined |
| medium | Related code exists but need deeper trace to confirm | Data comes from `useXxx()` composable — name matches feature but internals unread |
| low | Experience-based guess, no direct code evidence | "This pattern of symptom is usually caused by API response format change" |

## Output Format

```
━━━ Quick Hypothesis ━━━

Located: {file path}

Possible Causes:

1. [high] {description}
   Clue: {what you saw in code — file, line, snippet}

2. [medium] {description}
   Clue: {what you saw + what's unknown}

3. [low] {description}
   Clue: {reasoning basis}

Next: Proceed to full data flow trace to verify, starting from highest confidence.
```

## Constraints

- Maximum 5 hypotheses — force prioritization
- Each hypothesis must state what evidence would confirm or eliminate it
- Do not speculate about backend behavior unless API call is visible in the scanned code
