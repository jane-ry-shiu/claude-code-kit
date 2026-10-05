# Dev Server

Loaded at flow step 5 (Start dev server). Ensures the implementation's dev server is running and
reachable before any browser operation begins, and produces `STARTED_BY_SKILL` (boolean) — read by
the plan file's Cleanup checklist (`references/plan-and-report.md`) so cleanup only stops what this
skill itself started.

## Protocol

### 0. Make sure the code under test is checked out somewhere servable

Skip this when the implementation is the branch already checked out — the common case. When the
subject is **someone else's PR**, it is not, and serving your own working tree would compare the
wrong code while also putting your in-progress work at risk.

Give that PR its own worktree rather than switching branches in an existing checkout. **Do not use
`gh pr checkout`** — it switches the branch of the checkout you run it in, which is the user's
working tree, and it leaves the branch checked out there so the `worktree add` that follows fails.
Fetch the PR head into a local branch without checking it out anywhere, then attach a worktree to it:

```bash
# find the remote that actually hosts the PR — in a fork workflow `origin` is usually YOUR fork,
# and the PR ref lives on the upstream one
git remote -v
git fetch <remote> pull/<N>/head:pr<N>
git worktree add ../<repo>-pr<N> pr<N>
```

Measured: running `git fetch origin pull/8861/head:...` in this monorepo fails with
`couldn't find remote ref` because `origin` is a personal fork and the PR ref is on `upstream`.
Confirm afterwards that the checkout you started from is still on the branch it was on.

A fresh worktree has no `node_modules` — the dependency install is a separate, slow step before the
dev server can start. It also has none of the **generated, git-ignored artifacts** a long-lived
checkout accumulated, and those failures do not look like missing artifacts:

| Symptom | Cause |
|---|---|
| `predev` dies building a sibling package | its `dist/` is missing and building it from clean fails on a dependency the long-lived checkout never had to resolve |
| server starts, page is blank, `window.<store>` undefined | a generated config module is absent — the dev server compiles the shell and fails only on the import |

Measured on this monorepo: `packages/design-tokens/dist` (the `predev` hook builds it, and that
build fails from clean) and `packages/app-vsaas-portal/src/aws-exports.js` (generated from
`awsconfig/<env>/`). Seed each from a checkout that already has it, or from its documented
generator, after confirming the PR under test does not modify that package.

Then install and serve from there, and record in the plan file's `**Target:**` line which directory
and which head commit were actually served — a parity result is not interpretable without knowing
which code produced it.

Remove the worktree at cleanup, and expect the removal to be slow: `node_modules` in a monorepo
package runs to six figures of files. Run it in the background rather than blocking the closing
report on it, and confirm afterwards that `git worktree list` is back to what it was.

### 1. Resolve the port, then check existing server and confirm ownership

The port is not fixed at 8080 and the user can override it. Read the target package's own
`package.json` and follow the serve script chosen in Start dev server (default `serve:dev`) through
any `pnpm run` indirection to the script that actually launches the dev server, then take the value
of its `--port` flag. The indirection is real, not hypothetical: in this monorepo `serve:dev` →
`serve:env` → `serve:vite`, and only the last one carries `vite --port 8080`. If no `--port` appears
anywhere in the chain, fall back to 8080. Hold the result as `PORT`.

Every command in this file reads `PORT`; none of them assumes 8080. Each block below sets it
itself, because shell state does not carry from one Bash call to the next.

A `200` on the resolved port still does not by itself mean the *target* app is running. In this
monorepo more than one app declares the same default — `app-reseller-portal` and `app-vsaas-portal`
both serve on 8080 — so a listener there can belong to a different package entirely. The port is
only the assumption being tested here; ownership is what the check below establishes.

```bash
PORT=<resolved above>; curl -s -o /dev/null -w "%{http_code}" "http://localhost:$PORT"
```

- Non-200 or connection refused → nothing is listening, proceed to Start dev server.
- `200` → something is listening. Confirm ownership before deciding what it means:

  ```bash
  PORT=<resolved above>; lsof -nP -iTCP:$PORT -sTCP:LISTEN
  ```

  Take the `PID` from that output, then check which directory that process was launched from:

  ```bash
  lsof -a -p <PID> -d cwd
  ```

  - Reported `cwd` matches the target package's directory → already running, use it directly. Set
    `STARTED_BY_SKILL = false`.
  - Reported `cwd` belongs to a different package → not the target. Do not use it, and do not start
    a second server on the same port — abort and report the port conflict (see Error cases).

### 2. Start dev server

Read `package.json` to identify the serve script. Default: `pnpm serve:dev`. This is the same
script Step 1 followed to resolve `PORT` — the server is started on the port that was probed, never
on a different one.

Start in background:

```bash
pnpm serve:dev
```

Use the Bash tool with `run_in_background: true`. Set `STARTED_BY_SKILL = true`.

### 3. Wait for ready

Poll until the server responds `200` (max 60 seconds):

```bash
PORT=<resolved above>; timeout=60; elapsed=0; while [ $elapsed -lt $timeout ]; do code=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:$PORT" 2>/dev/null); if [ "$code" = "200" ]; then echo "ready"; exit 0; fi; sleep 2; elapsed=$((elapsed+2)); done; echo "timeout"; exit 1
```

If timeout → report error and abort verification.

**A `200` is not a working app.** A dev server answers with the HTML shell before any application
module has resolved, so this poll passes while the page renders nothing. After it goes green,
confirm the app actually booted — the store global is present, or the body has content — and treat
an empty body as a startup failure to diagnose, not as a slow paint. Read the dev server's own log
for `Failed to resolve import` before concluding anything about the application.

### 4. Verify browser lanes are available

Lane-aware and order-sensitive: ask, never diagnose by triggering a tool error.

1. Run `~/.claude/scripts/shared-chrome.sh status` first.
   - `up   port=9222 ...` → the shared Chrome is running; proceed to step 2.
   - `down port=9222` → **start it yourself**: run `~/.claude/scripts/shared-chrome.sh` with no
     argument (that is its start form, and a no-op if it is somehow already up), then run `status`
     again to confirm. Only if the second `status` still reports `down` is this the user's problem —
     say what you ran and what it reported.

   Do not call a lane tool before `status` reports `up` — a `list_pages` failure at that point only
   restates what `status` already answered.

   An earlier version of this file told the agent to stop and ask the user to start Chrome. That was
   wrong and a user said so: the script is executable, idempotent, and right there. Asking someone
   to run a command you can run is friction, not caution. The judgement to preserve is "ask before
   acting on things outside the workspace" — a local browser this skill itself needs is inside it.
2. Only once `status` reports `up`, confirm both lanes are actually attached by calling
   `mcp__chrome-devtools-a__list_pages` and `mcp__chrome-devtools-b__list_pages`. Call both — one
   lane responding does not confirm the other, and flow step 6
   (`references/browser-operation.md`, Lane assignment) needs both before it can run.

If either lane fails, inform the user:

```
Chrome DevTools MCP lane <a|b> is not connected. Please ensure:
1. `~/.claude/scripts/shared-chrome.sh status` reports "up"
2. The chrome-devtools-<a|b> MCP server entry is configured and connected
```

## Cleanup

At verification end:

- `STARTED_BY_SKILL = true` → kill the dev server process.
- `STARTED_BY_SKILL = false` → leave it running.

This is the flag the plan file's own Cleanup section reads (`references/plan-and-report.md`, plan
skeleton, `Dev server: <stop if started by skill / leave running>`) — record its value there when
the plan file is written, not only in this run's working memory.

## Error cases

| Situation | Action |
|---|---|
| Server start fails (port in use by non-dev process) | Report error, abort |
| Server starts but page blank/errors | Record as pre-condition failure |
| The resolved port already answers, but the listening process's `cwd` belongs to a different app | Abort; report the port conflict — do not use it and do not start a second server on the same port |
| `shared-chrome.sh status` reports `down` | Inform user, abort |
| A browser lane fails `list_pages` after `status` reports up (either lane, or both) | Inform user which lane(s) failed, abort |
