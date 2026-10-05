# Pending Review Comment API — Findings

**Date:** 2026-08-20
**PR used:** VIVOTEK-IT/webtech-monorepo#8857 (ADAT-822, supplied by user)
**Authenticated as:** jane-ry-shiu (the PR's own author — pending reviews are author-only-visible,
so every result below is from the only vantage point that can see them)

**Pre-check before probing:** `/pulls/8857/reviews` returned `[]` — no reviews of any state, so the
unconditional `delete_pending` in Step 6 could not remove anything the user created.

| Question | Expected | Actual |
|---|---|---|
| Does `GET /repos/{o}/{r}/pulls/{n}/reviews` list a PENDING review for its author? | unknown | **yes** — `[{"id":4979821915,"state":"PENDING"}]` |
| Does `GET /repos/{o}/{r}/pulls/{n}/reviews/{id}/comments` return its unsubmitted comments? | unknown | **yes** — body, id, path and `position` all returned |
| Does `PATCH /repos/{o}/{r}/pulls/comments/{id}` edit an unsubmitted comment? | unknown | **no** — HTTP 404 `Not Found` |
| Does `DELETE /repos/{o}/{r}/pulls/comments/{id}` remove an unsubmitted comment? | unknown | **yes** — HTTP 204, and genuinely per-comment (see Probe 2) |

## Probe 1 — one comment

Created a pending review, added one comment, listed it, PATCHed it (404), DELETEd it (204). After
the delete, `/reviews/{id}/comments` returned 404 and `/reviews` returned `[]`: **deleting the only
comment of a pending review also removes the review**, because GitHub does not keep an empty
pending review. The delete had a side effect beyond the comment named in the call.

## Probe 2 — two comments, added because Probe 1 could not distinguish two explanations

Probe 1 alone is consistent with both "DELETE is per-comment" and "DELETE nukes the whole review".
Those lead to opposite designs for Task 9, so a second probe ran: pending review with comments A
(position 17) and B (position 13); DELETE A only.

Result: HTTP 204, the review survived (`[{"id":4979828118,"state":"PENDING"}]`), and B was still
attached. **DELETE is genuinely per-comment.** Probe 1's disappearance was the empty-review rule,
not the delete's scope.

## Anchor fields are not populated while a review is pending

Read straight off the pending comment object, for a comment added with `line: 100, side: RIGHT,
subjectType: LINE`:

| Field | Value while pending |
|---|---|
| `line`, `original_line`, `start_line`, `original_start_line` | `null` |
| `side`, `subject_type` | `null` |
| `position`, `original_position` | `17` |
| `path`, `commit_id`, `pull_request_review_id` | populated |

The line the comment was created with does not come back. Only the diff `position` does. This
matters because `add_comment_to_pending_review` accepts a **line**, not a position — so anything
read back from a pending review cannot be replayed through the add API without first converting
the recorded `position` to a line by reading the file's patch hunks. `references/plan-and-report.md`'s
`## Pending comment backup` was updated to record `position` and `commit_id` for exactly this
reason; a backup holding `line: null` would have looked complete and been unreplayable.

## Cleanup

`delete_pending` removed the Probe 2 review. Verified afterwards: 0 pending reviews, 0 reviews of
any state, 0 review comments and 0 issue comments containing `parity-api-probe`. The PR is in the
state it was found in.

## Decision

`PER_COMMENT_SUPPORTED = true`

Task 9 writes per-comment mutation as the primary path, whole-review rebuild as the fallback. Three
qualifications, each of which came out of the probes rather than the plan's assumption:

- **Edit is not available; edit is expressed as delete + re-add.** `PATCH` 404s on an unsubmitted
  comment. Because delete is per-comment and adding appends to the existing pending review, an edit
  costs two calls and still does not disturb the other comments — it does not force a rebuild.
- **Deleting the last comment deletes the review.** Any sequence that empties a pending review
  before re-adding must create the review again first, or the re-add will fail with no pending
  review to append to.
- **Re-adding needs a line, and a pending comment does not report one.** Restoring from the backup
  includes a position-to-line conversion against the recorded `commit_id`'s patch.
