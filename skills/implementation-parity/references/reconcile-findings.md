# Reconcile Findings

Loaded at flow step 8. Takes the observed differences and their dispositions from flow step 7,
decides where each one lands, and produces the three counts flow step 9 prints (see
`references/plan-and-report.md`, `## Final counts`). Nothing here touches a PR before the user has
confirmed the candidate list.

## Four dispositions

```
Difference exists + nobody raised it     -> Candidate: add
Difference exists + raised, and correct  -> Already covered, do not duplicate
Difference exists + raised, but wrong    -> Candidate: correct
No difference    + someone raised it     -> Candidate: retract (false positive)
```

The fourth row is the half most easily forgotten. A reconciliation that only looks for *new*
problems does half the job: an existing conclusion that describes a problem the implementation does
not actually have is just as wrong as a missed one, and it is the kind of error that survives
indefinitely because nobody re-tests a finding that is already written down.

### Reading the existing conclusions

Three sources, all three checked before concluding nothing was raised:

| Source | How |
|---|---|
| Own pending review | `gh api /repos/{owner}/{repo}/pulls/{n}/reviews` for a `PENDING` row, then `/reviews/{id}/comments` — visible only to its author |
| Submitted reviews (anyone's) | `mcp__github__pull_request_read` method `get_review_comments` |
| Local branch findings file | `docs/context/branch-review-*.md` in the repo |

The local findings file is the one that gets missed. It lives in the checkout where the branch is
checked out, which for a worktree-based branch is **not** the main checkout — `docs/context/` in
the directory you happen to be standing in can be empty while the file exists one worktree over.
Resolve the branch's worktree (`git worktree list`) before concluding no local review exists.
A review run locally leaves nothing on the PR at all, so "the PR has no reviews" is not evidence
that the branch was never reviewed.

## Confirmation gate

> Candidates are presented and the user confirms before anything on the PR is touched. This is a
> standing rule in this environment, not a new one: a question is not an instruction, and this
> wait is not skippable.

Presentation format, in zh-TW:

```
原型比對結果（{N} 條差異）

➕ 建議新增（{N} 條）
  1. [file:line] <差異> — 基準：tier {n}, <來源>
❗ 建議修正（{N} 條）
  1. [comment id] 原文說 <X>，實測是 <Y>
🗑️ 建議撤回（{N} 條）
  1. [comment id] 實測兩邊一致，這條不成立
📄 只進報告（{N} 條，錨不到程式行，預設不上 PR）
  1. <差異>
✅ 已被既有 comment 涵蓋（{N} 條，不重複）

請確認，或調整。
```

If the `📄 只進報告` bucket is non-empty and the user asks for any of it to reach the PR, ask the
second question before writing anything:

```
這 {N} 條錨不到程式行，只能用 PR 一般留言，跟 pending review 不同——
留言一送出，PR 上所有人（含作者）立刻看得到，而且會收到通知。
pending review 的行內意見則只有你看得到，直到你自己按 submit。

要送出公開留言嗎？
```

## Backup first

Before any mutation — before a single comment is added, rewritten, or removed — every existing
pending comment is read and written verbatim into the plan file's
`## Existing review conclusions (verbatim backup)` section. The block format and the fields it must
carry are owned by `references/plan-and-report.md`'s `## Pending comment backup`; follow it there
rather than reproducing the field list here, because a pending comment does not report the fields
one would expect and that section is where the measured behavior is recorded.

If the backup cannot be written, do not mutate anything. A rebuild that fails halfway with no
backup loses review work that exists in no other place.

## Landing sites

```
Candidate add, anchorable to a diff line   -> new comment in the same pending review
Candidate add, not anchorable              -> plan file by default; a public PR comment only on a
                                              separate confirmation (see below)
Candidate correct                          -> rewrite that comment (see the mechanism below)
Candidate retract                          -> remove that comment
```

### Two destinations, two different visibilities

These are not two ways of writing the same thing:

| Destination | Who sees it, when |
|---|---|
| A comment in your pending review | **Only you.** Nobody else sees it until you press submit in GitHub, which this skill never does. |
| A PR conversation comment | **Everyone with access to the PR, immediately.** The author is notified. It cannot be un-sent, only edited or deleted after the fact. |

A finding that cannot be anchored to a diff line goes to the plan file. That is the default and it
needs no permission, because the plan file is a local document.

Putting it on the PR instead is a different act, and it takes its own explicit confirmation — one
that names the destination as a public comment and says the author will see it immediately. Do not
fold it into the `## Confirmation gate` approval of the candidate list: that approval is about
*which findings are real*, and the person giving it is not necessarily agreeing to notify someone
else's PR. Ask separately, and only when the user has asked for the finding to reach the PR at all.

This distinction was added after a real run posted a conversation comment on another person's PR
and the user then had to ask what "public" meant. Both the act and the confusion were avoidable.

**Anchorability test.** The target line must fall inside a diff hunk of the PR. Re-derive it from
the `@@ -old +new_start,count @@` header of the file's patch rather than trusting a remembered
number. A difference spanning several files, or one whose subject is code that does not exist, is
not anchorable — those go to the plan file and are counted in the "只在報告裡" number, never
squeezed onto the nearest line that happens to be in the diff.

A pending comment read back from the API reports its anchor as a diff `position`, not a line, so a
comment being rewritten cannot have its line copied from what was read — re-derive that too, from
the same hunk header.

New comments use `mcp__github__add_comment_to_pending_review` with the anchor in the tool
parameters (`path` / `line` / `startLine` / `side`), not restated in the body. The body follows
`code-review`'s finding block, which is the sole owner of that format — forward it, do not restate
the field names here.

### Mutation mechanism

What the GitHub MCP surface exposes for reviews is `create`, `submit_pending`, `delete_pending`,
`resolve_thread`, `unresolve_thread`, and `add_comment_to_pending_review`. It has **no** per-comment
delete or edit. Raw REST does have a per-comment delete, and does not have a working edit — both
verified against a live PR, recorded in `docs/specs/2026-08-20-pending-comment-api-findings.md`.

Primary path — per comment, no rebuild:

```bash
# remove one unsubmitted comment (verified: HTTP 204, and the review's other comments survive)
gh api -X DELETE /repos/{owner}/{repo}/pulls/comments/{COMMENT_ID}
```

There is no edit call. `PATCH /repos/{owner}/{repo}/pulls/comments/{id}` returns 404 for an
unsubmitted comment. A "rewrite" is therefore **delete the comment, then add the replacement** with
`add_comment_to_pending_review`, which appends to the same pending review. Two calls, and the other
comments are never disturbed — a correction does not require a rebuild.

Two constraints that come from measured behavior, not from the API docs:

- **Emptying a pending review destroys it.** GitHub does not keep a pending review with no
  comments, so deleting the last one removes the review itself. Any sequence that would empty the
  review before re-adding must create the review again first, or the re-add has nothing to append
  to. When rewriting the only comment in a review, add the replacement first, then delete the
  original.
- **Re-adding needs a line.** See the anchorability note above — recover it from the hunk header.

Fallback path — whole-review rebuild. **Destructive.** Back up verbatim, `delete_pending`, `create`
a fresh pending review, re-add every surviving comment plus the new ones. This requires a second
explicit confirmation that names what will be deleted and how many comments will be re-added, on
top of the `## Confirmation gate` the candidate list already passed. A mid-run failure loses the
review — which is the reason `## Backup first` is not optional. Use it only when the per-comment
path cannot express the change.

## Situations without a pending review

| State | Behavior |
|---|---|
| Own pending review | Reconcile and write back |
| Submitted review (anyone's) | Read-only cross-check; suggest in the report, the user decides on replies |
| Local branch findings file | Reconcile and write back |
| Nothing | Report only |

"Nothing" means all three sources in `### Reading the existing conclusions` came back empty,
including the worktree the branch is actually checked out in. Reporting "no prior review" after
checking only the PR is the failure this row exists to prevent.

## Never submit

No `event` parameter on `create`. No `submit_pending`. No asking the user whether to submit. The
skill writes into a pending review and stops there; submitting is the user's action, taken in
GitHub's own UI when they are ready. Being a new skill does not relax this rule.
