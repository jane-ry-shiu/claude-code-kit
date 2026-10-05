---
name: browser-lanes
description: "Use when a task drives a real browser — checking a page, capturing a screenshot, exercising a feature — when two or more pages must be driven at the same time, when someone asks for browser work to run in parallel, or when it is unknown whether a browser is already open."
---

# Browser Lanes

A **lane** is one MCP server entry. The entry — not the browser — remembers
which page is selected, so two agents sharing an entry navigate that page away
from each other until both hang. That failure surfaces as a timeout, never as
an error.

**REQUIRED BACKGROUND:** superpowers:dispatching-parallel-agents decides
whether to fan out at all.

## Step 0 — Before the first browser call

```bash
~/.claude/scripts/shared-chrome.sh status   # "up port=9222 …" or "down"
~/.claude/scripts/shared-chrome.sh start    # only if down; idempotent
```

Drive it **only** through `mcp__chrome-devtools-{a,b,c}__*`. The unsuffixed
`mcp__chrome-devtools__*` launches a second Chrome on its own profile, and
`mcp__claude-in-chrome__*` drives a third. Both are signed in to something
else, so they answer the question about a different browser and look correct
doing it — and each leaves an orphan window running. Clear one with
`pkill -f -- "--user-data-dir=$HOME/.cache/chrome-devtools-mcp/chrome-profile"`.

**Login is the user's job.** Never type a password. If the profile is signed
out, stop and ask; it keeps the session afterwards.

## Step 1 — Give every agent a lane

The lane letter is a **required field of the dispatch prompt**. An agent that
is not given one takes `a`, so two of them collide as above.

Three at once is verified. More lanes: copy the `chrome-devtools-c` block in
`~/.claude.json`, rename it, keep the same `--browser-url`. New entries load on
session restart only, and past three nobody has tried.

## Step 2 — Tabs

Each lane opens its own tab (`new_page`, `background: true`) and closes it at
the end. **The user's tabs are read-only.** Adopt one only when the user points
at it, because an open dialog or an applied filter is usually the point.

## Step 3 — Dispatch

Use dispatch-template.md; each step there maps to a failure seen without it.

## Step 4 — Finish

Close only what you opened. **A lane that closes its own tab bricks its entry** —
every later call there, `list_pages` included, answers "The selected page has
been closed" — including the closing call itself, which succeeds anyway. That is
the normal end state of a run, not an accident: clear each
entry you used with one `new_page`, which still works while bricked and prints
the surviving page ids. (`select_page` needs an id you cannot look up, and a
wrong one returns the same error.) `curl -s http://127.0.0.1:9222/json/list`
lists tabs without MCP.

## Hazards

- **Cookies and localStorage are browser-wide.** Signing in or out and
  toggling a flag hit every lane — run those single-lane.
- **Never change page state for a cleaner capture.** Report the obstruction.
- **Screenshots inline.** `filePath` writes only inside a workspace root — a
  scratchpad path is rejected outright, a repo path dirties `git status`. A
  subagent's inline image is discarded when it returns, so when the caller needs
  the file itself, write it under a workspace root, then move it out and delete
  the temp directory.
- **~5s subagent startup skew** — lanes pay off only above ~30s of work each.

## When NOT to use lanes

One page; a chain where step N+1 needs step N; anything touching login or a
global flag.
