---
name: github-pr
description: Use when working with GitHub PRs — reading PR context, creating PRs, generating PR title/description, or posting PR review comments. MANDATORY — any action that creates a PR (regardless of which skill or workflow initiated it) MUST go through this skill's create-pr flow.
---

# GitHub PR

Unified skill for GitHub PR operations. Routes to the appropriate reference based on user intent.

## Hard Rules

- **NEVER** call `create_pull_request` tool or `gh pr create` directly without first going through create-pr.md + generate-pr-content.md flow
- ALL PR creation MUST produce a title/description via generate-pr-content.md and show a preview for user confirmation — no exceptions
- This applies even when another skill's workflow triggers PR creation (e.g., after a bug fix, after branch review, after any development task)

## Routing

| Scenario | Trigger | Read |
|----------|---------|------|
| Read PR | User pastes PR URL with no other command | [read-pr.md](references/read-pr.md) |
| Create PR | Any intent to create a PR — "發 PR", "開 PR", "create PR", "push and PR", or implicit within other workflows | [create-pr.md](references/create-pr.md) + [generate-pr-content.md](references/generate-pr-content.md) |
| Generate PR content (current branch) | "產生 PR 描述" for current branch | [generate-pr-content.md](references/generate-pr-content.md) |
| Generate PR content (existing PR) | "重寫 PR 標題", "更新 PR 描述" for an existing PR | [generate-pr-content.md](references/generate-pr-content.md) + [read-pr.md](references/read-pr.md) if PR context not available |
| Post PR comments | About to leave comments on a PR (called by other skills or directly) | [pr-comments.md](references/pr-comments.md) |
| Attach images | Any of the above needs an image or screenshot in the PR text | [attach-images.md](references/attach-images.md) |

### Disambiguation

- "開 PR", "發 PR", "push and PR", or any PR creation intent → **Create PR**
- "產生 PR 描述" without referencing an existing PR → **Generate PR content (current branch)**
- "重寫這個 PR 的標題" referencing an existing PR → **Generate PR content (existing PR)**
- About to post comments (from code-review or other skills) → **Post PR comments**

## Shared Rules

### Language

- All user-facing text: zh-TW (Traditional Chinese)
- Technical terms, code, branch names: English

### PR Info Resolution

Extract `owner`, `repo`, `pr_number` from PR URL:
```
https://github.com/{owner}/{repo}/pull/{pr_number}
```

When no URL is provided (e.g., create PR), resolve from git remotes:
```bash
git remote -v  # origin is the org repo VIVOTEK-IT/webtech-monorepo
```
