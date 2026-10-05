# Pending Review Workflow

All PR comments must go through a pending review. Users preview on GitHub before deciding to submit.

## Tool Priority

MCP tools (preferred) → `gh api graphql` (fallback)

The fallback must be GraphQL. REST has no endpoint that adds a comment to an existing pending review (`POST .../reviews/{id}/comments` returns 404), and the PR-comment hook blocks `POST .../pulls/{n}/reviews`.

## Steps

### 1. Resolve PR Info

Extract `owner`, `repo`, `pr_number` from context.

### 2. Check Existing Pending Review

```bash
gh api repos/{owner}/{repo}/pulls/{pr_number}/reviews \
  --jq '.[] | select(.state == "PENDING") | .node_id'
```

If PENDING review exists → keep its `node_id` (`PRR_...`, used by the GraphQL fallback), skip to Step 4.

### 3. Create New Pending Review

**MCP (preferred):**
```
mcp__github__pull_request_review_write
  method: "create"
  owner: "{owner}"
  repo: "{repo}"
  pullNumber: {pr_number}
  body: "整體備註內容..."   ← general notes go here (optional, zh-TW)
```

**CRITICAL: Do NOT include `event` parameter. Omitting it = PENDING state.**

If you have a general note (not tied to specific lines), put it in the `body` of this review creation call. Do NOT use `add_comment_to_pending_review` without `path` for general notes.

**GraphQL fallback:**
```bash
PR_ID=$(gh pr view {pr_number} --repo {owner}/{repo} --json id --jq .id)

gh api graphql \
  -f query='mutation($pr:ID!,$body:String){addPullRequestReview(input:{pullRequestId:$pr,body:$body}){pullRequestReview{id state}}}' \
  -f pr="$PR_ID" -f body="" \
  --jq '.data.addPullRequestReview.pullRequestReview'
```

The input has no `event`, so the review is PENDING. Keep the returned `id` (`PRR_...`) for Step 4.

### 4. Add Comments

Each issue → one call. See [line-comment.md](line-comment.md).

**MCP (preferred):**
```
mcp__github__add_comment_to_pending_review
  owner, repo, pullNumber
  path: "src/utils.ts"
  body: "建議重新命名此變數..."    ← zh-TW
  subjectType: "LINE"
  line: 42
  side: "RIGHT"
```

**GraphQL fallback (add to existing pending):**
```bash
gh api graphql \
  -f query='mutation($rv:ID!,$path:String!,$line:Int!,$body:String!){addPullRequestReviewThread(input:{pullRequestReviewId:$rv,path:$path,line:$line,side:RIGHT,body:$body}){thread{id}}}' \
  -f rv="{review_node_id}" \
  -f path="src/utils.ts" \
  -F line=42 \
  -f body="建議重新命名此變數..."
```

Multi-line: see [line-comment.md](line-comment.md).

### 5. Notify (then STOP)

```
已建立 {N} 筆 pending review comment。

請到 GitHub 預覽內容：
https://github.com/{owner}/{repo}/pull/{pr_number}
```

Do NOT ask about submit/discard. Do NOT add follow-up questions.

## Notes

- Multiple comments accumulate in one pending review
- Always reuse existing pending review if one exists
- `event` parameter absent = PENDING. Present = submitted immediately. NEVER include it.
