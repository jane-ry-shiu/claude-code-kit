# claude-code-kit

Skills, subagents, rules and hooks for Claude Code, packaged so a teammate can
clone once and install with one command. Everything is linked into
`~/.claude`, so `git pull` here updates what Claude Code loads.

Company-specific skills (Jira, Confluence, Redmine, portal conventions) live in
a separate private pack, `claude-code-kit-vivotek`, installed on top of this one
with the same installer.

## What is inside

```
skills/       27 skills  — review, verify, fix, testing, design principles, browser, PR …
agents/       reviewer · verifier · fixer · doc-writer subagents
rules/        team rules, loaded in every session
  custom/       context-first, critical-thinking, vocabulary, language, …
  openspec/     OpenSpec change scoping
personal/     opt-in layer (--personal): response-format rule + global CLAUDE.md
hooks/        PR-comment guard (PreToolUse) · review-done Teams card (Stop)
scripts/      shared-chrome.sh — one Chrome shared by several devtools MCP servers
statusline/   two-line status line (opt-in: --statusline)
mcp/          MCP server template (GitHub, Chrome DevTools) — no secrets in it
bin/          kit-secret · kit-env · kit-github-headers (credential helpers)
```

## Install

```bash
git clone git@github.com:jane-ry-shiu/claude-code-kit.git ~/claude-code-kit
cd ~/claude-code-kit
./install.sh --dry-run      # see what would change
./install.sh                # skills, agents, team rules, hooks, scripts
```

Options (combine freely):

| Option | Adds |
|---|---|
| `--mcp` | registers the servers in `mcp/servers.json` at user scope; existing names are skipped |
| `--statusline` | the status line, only if you have none configured |
| `--personal` | the author's response-format rule and global `CLAUDE.md` (you probably do not want this) |
| `--uninstall` | removes every link into this repo, the hook entries and the status line setting |

The installer never overwrites. If `~/.claude/skills/jira` (for example)
already exists, it is reported as skipped and left alone; move yours aside and
re-run to take the kit's version. `settings.json` is backed up before each
change.

Requires `jq`. MCP registration requires the `claude` CLI on `PATH`.

## Credentials

No token, password or signed URL is stored in this repository or written into
Claude Code's JSON config by the installer. Credentials live in the macOS
Keychain (service `claude-code-kit`); an environment variable of the same name
always takes precedence.

```bash
bin/kit-secret set GITHUB_PAT   # optional: without it, your `gh auth login` session is used
bin/kit-secret list             # shows which are set, never the values
```

How each consumer gets them:

| Consumer | Mechanism |
|---|---|
| stdio MCP servers that need a token (e.g. in a company pack) | started through `bin/kit-env`, which loads the Keychain values into that process only |
| GitHub MCP server | `headersHelper` → `bin/kit-github-headers`; uses `GITHUB_PAT` if set, otherwise your `gh auth login` session (no PAT needed) |
| Skill scripts that need a token | read it from the environment — add `eval "$(~/claude-code-kit/bin/kit-secret env)"` to `~/.zshrc` |
| Teams notifications | `skills/teams-notify/references/targets.json` — git-ignored; the teams-notify skill creates it when you add a target |

The review-done hook sends its card to the Teams target named by
`REVIEW_NOTIFY_ALIAS` (default `jane-pr`). Without a matching target it only
logs and does nothing.

On Linux or without a Keychain, export the same names in your shell instead.

## Updating

```bash
cd ~/claude-code-kit && git pull
```

Links pick up the change immediately; re-run `./install.sh` only when new
skills, agents or rules were added.

## Contributing

Another pack with the same layout (`skills/`, `agents/`, `rules/`,
`mcp/servers.json`) installs through this installer:
`KIT_DIR=~/other-pack ~/claude-code-kit/install.sh`.

Edit files in this repository (or through the `~/.claude` links — they are the
same files), then commit here. Before pushing, check that nothing secret is
tracked:

```bash
git ls-files | xargs grep -nIE 'ghp_|github_pat_|ATATT|APS-|sig=|BEGIN .*PRIVATE KEY' || echo clean
```
