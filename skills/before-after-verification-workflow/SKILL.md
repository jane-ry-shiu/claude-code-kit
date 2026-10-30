---
name: before-after-verification-workflow
description: Use when a PR or branch must be verified in the running application with a before/after (改前改後) comparison backed by screenshots, recordings or measurements, especially when the result is to be posted straight to the PR or the Jira ticket — e.g. 「驗證改前改後」「截圖驗證後直接 comment」「驗證完留言到 jira」「截圖或錄影你決定」.
---

# Before/After Verification Workflow

## Overview

A chain of existing skills run end to end. `implementation-parity` derives the items and drives the
browser; this workflow adds a **before arm** to every item, picks the **evidence form** per item,
and delivers **one complete comment**. The user is asked nothing except where a step needs their
hands or their screen.

**REQUIRED SUB-SKILLS:** implementation-parity (procedure), annotated-screenshots (sheets),
os-screen-capture (videos, OS-drawn captures), github-pr or jira (posting and uploads).

Where this file and parity disagree, this file wins — it replaces parity's two confirmation gates.

## Flow

1. **Inputs and baseline** — parity steps 1–2. No baseline found is **not** a stop: items come from
   the diff and the PR description, verdicts are judged against the PR's own claim, and the comment
   says at its top that no ticket/spec baseline was found.
2. **Items** — parity step 3, then write the list straight into the plan file (parity step 4).
   Nothing is presented and nothing is confirmed. Mark every item that needs screen takeover and
   order those last. A baseline item the diff never touches gets an after capture only, labelled
   「此 PR 未動到」.
3. **Before arm per item** — table below. Prove which arm is live from the running page on every
   pass (a value only one version has), never from the command you ran.
4. **Run the headless items** — parity steps 5–6, headless Chrome (`channel: 'chrome'`). Each item:
   before readings and evidence, restore, after readings and evidence. View every image before using
   it; recapture or drop one that does not show what its item claims.
5. **Takeover stop** — only if takeover items exist, and only after step 4 is finished. One message:
   which items, why a page capture cannot show them, how long the mouse is taken. Then wait — for as
   long as it takes. Accepted: run them (os-screen-capture visible mode). Declined: they become
   「未驗證：未同意接管螢幕」.
6. **Deliver one comment** — contract below. This replaces parity steps 7–9 entirely.
7. **Clean up and report** — every reverted path back to its pre-run state; stop only the servers,
   harnesses and browsers this run started; tell the user the comment's link and the plan file's path.

## Questions the user may be asked

Exactly these, each at the moment it arises: the takeover stop (step 5); a sign-in only the user can
do; a state that blocks the whole run (HEAD is not the PR head, a rebase or merge in progress, port
taken by something this run did not start). Everything else is decided and recorded in the plan
file and the comment.

## Evidence form — by where the difference lives

| What the reader must see | Evidence |
|---|---|
| A state that stays on screen: position, gap, colour, text, presence | Before/after sheet (annotated-screenshots) plus the measured numbers |
| A sequence whose reaction is the evidence: open/close, Esc, click outside, scroll-to-load, order | Two background recordings, before and after (os-screen-capture `BACKGROUND=1`) |
| A transient state under ~300 ms | Sampler numbers (ms present, n of N runs). No video — both arms look the same in frames |
| Whether a request was sent | Recording with an on-page request counter, or the counts |
| Cursor shape, native `title` tooltip, native select, other OS-drawn UI | Takeover item → step 5. Until then, DOM readings only, labelled as not a screen capture |

An item that differs in two dimensions gets both forms.

## Before arm

| Situation | Before arm |
|---|---|
| Changed files are few and nameable, nobody else works in this worktree, none has uncommitted edits | Same dev server: `git checkout <base> -- <files>`, run, `git checkout HEAD -- <files>` |
| Another session has its cwd in this worktree (`lsof -a -p <pid> -d cwd` on each `claude` pid), or a changed file has uncommitted edits | Do not revert and do not ask. Use, in order: an import-free JS module loaded into the page as a `data:` URL; deployed dev vs local; a scratch worktree at the base in the scratchpad, servers run one after another |
| Changes spread over many files | Deployed dev vs local, or the scratch worktree |
| None of these works for an item | That item is 「未驗證」 with the reason |

**Deployed dev as before:** read the deployed commit first. Label the arm 「部署的 dev @ <hash>」,
never "PR base". If the PR's changed files at that hash differ from the PR base, it is not a
faithful before for those items.

**After** is the working tree, not HEAD.

## The comment

**Destination:** a destination named in the invocation wins (「留言到 jira」 → the Jira ticket; a PR,
or 「comment」 while a PR is under review → that PR). Nothing named: the PR under review; an own
branch without a PR → the Jira key in the branch name. Both only when asked for both.

**GitHub:** one PR conversation comment. **Nothing goes into the pending review** — no line
comment, no reply, no edit — not even a FAIL that anchors to a diff line; that FAIL is in the
comment. Existing pending comments are neither changed nor quoted.

**Jira:** one comment, through the jira skill.

The invocation authorises posting it; do not ask again. Upload media only once the text is final.

Parts, in order, 繁體中文 (UI text, product names and technical terms in their original form):

1. Term block — any project-specific term the comment relies on, one line each
2. What was compared — before arm (commit or deployed hash, and how it was obtained), after arm
   (commit, plus "working tree" if dirty), environment, org, viewport, headless or not
3. Result table — every item: verdict (符合 / 不符 / 未驗證), one-line observation
4. One section per item — before evidence, then after evidence, each labelled 改前 / 改後;
   numbers next to the images; one video per arm, never merged
5. 未驗證 — every item not verified, with its reason

A re-run on the same PR or ticket posts a new complete comment headed with the commit it verified.

## Red flags

| Thought | Reality |
|---|---|
| "parity requires the item list to be confirmed first" | This workflow replaces that gate. Write the list to the plan file and run. |
| "This FAIL anchors to a diff line, so it belongs in the pending review" | Nothing goes into the pending review. It goes in the one comment. |
| "Reverting in a shared worktree needs the user's OK — I'll ask" | Do not ask. Switch to a method that does not touch the worktree. |
| "I'll ask about the takeover up front, while they are still here" | The takeover needs their hands off the mouse at that moment. Ask once, after the headless items. |
| "They are away — I'll post what I have and add the rest later" | Wait. One comment, sent once. |
