# Baseline Discovery

Locate the artifact the implementation will be compared against: a runnable prototype, a Figma
frame, or a written spec. This reference is loaded at flow step 2.

## Locating the Jira key

Resolve the Jira key by checking these sources in order. Stop at the first one that yields a key.

| Order | Source | Notes |
|---|---|---|
| 1 | User-supplied | The user names a key directly in the request. |
| 2 | PR title | Conventional-commit style title carries the key in brackets. |
| 3 | Branch name | Branch name often embeds the key. |
| 4 | Commit messages | Scan recent commits on the branch for a key. |

This monorepo's commit/PR format is `<type>(<scope>): [<KEY>] <subject>`, for example:

```
feat(reseller): [VOR-32711] pin incident table status
```

Both `VOR-` and `NVRDEV-` prefixes occur in this monorepo — match either.

If none of the four sources yields a key, do not search Jira at all — go directly to
`## Stop condition`; no Jira search occurred, so the found-key template does not apply.

## Where to look inside Jira

Once a key is resolved, search every location below before concluding no baseline exists. This
search is **exhaustive, not first-match** — do not stop at the first hit. A baseline found at the
parent level does not excuse skipping the remaining locations, and a baseline found early does not
excuse skipping the parent level. Visit all six, every time:

```
this ticket   description
this ticket   comments
parent/epic   description
parent/epic   comments
              linked Confluence pages
              attachments
```

### When the ticket only points somewhere else

A ticket whose body is a set of links to another tracker has no baseline of its own — it has a
pointer. Follow it. The six locations above are where a baseline HIDES; they are not a claim that
every baseline lives in Jira.

Measured case: ADAT-809's entire description is two Redmine links and a PR link. The acceptance text
— the `[Expect result]` clause this run compared against — was in Redmine, and a search that stopped
at the Jira boundary would have reported "no baseline" for a ticket that has a perfectly good one.

Use the project's own skill for the other tracker rather than calling its API directly. If the
tooling for it is not available in this session, say so plainly and ask the user for the text: an
expected-result clause recovered from an old transcript is second-hand, and any run using it must
label it as quoted rather than verified.

Get the ticket with `mcp__mcp-atlassian__jira_get_issue`. Read its `parent` field and call
`mcp__mcp-atlassian__jira_get_issue` again with the parent key to get the parent/epic's
description and comments. Fetch any linked Confluence page with
`mcp__mcp-atlassian__confluence_get_page`. Fetch ticket and parent attachments with
`mcp__mcp-atlassian__jira_download_attachments`.

The parent levels are not optional. In ADAT-822 the prototype link lived in the parent ticket's
description and the decision that settled the disputed behavior lived in a parent comment; the
ticket itself carried neither. Reading only the ticket's own description would have produced a
false "no baseline found".

### Classification

Classify every baseline found by tier:

| Tier | Signal |
|---|---|
| 1 | A URL to a running demo, or a `figma.com/proto/` link — **candidate until an operable instance is confirmed** |
| 2 | A `figma.com/design/` or `figma.com/file/` link carrying a node id |
| 3 | Acceptance criteria, a linked Confluence spec page, or a free-text behavior description — **only where it describes behavior observable in the running application** |

The tier-3 qualifier is load-bearing, not decoration. Nearly every ticket carries acceptance
criteria of some kind, so reading tier 3 as "any text at all" makes `## Stop condition` unreachable
and lets a run proceed on a baseline nothing can be compared against. Measured case: ADAT-752's Done
Criteria are assertions about code structure — a prop no longer declared, a type no longer carrying
a third state, a spec's props table matching the component. None of that is visible in a browser.
A ticket like that has NO tier-3 baseline, however much prose it contains, and the stop condition
applies.

Test each candidate by asking what a person would have to DO in the application to see it hold. If
that question has no answer, it is not a baseline. If some criteria pass the test and others do not,
keep the ones that pass and record the rest as out of reach for this method rather than silently
folding them in.

A URL that returns 200 is not yet a tier-1 baseline. Reference and demo sites are frequently
GALLERIES: one page carrying several examples of the same widget, some of them live and some static
screenshots or dead markup. Measured case: the filter-combo demo referenced from ADAT-782 carries
seven toolbars on one page, and only some respond to interaction. An agent that treats "the page
loads" as "the baseline is operable" will start a comparison against a picture.

Confirm operability before classifying: open the page and perform one harmless interaction on the
instance you intend to use — open its menu, expand its first control. If nothing responds, it is not
tier 1 for this run; fall back to the tier its content actually supports, or stop.

When the page carries more than one instance, the `location` recorded below MUST identify WHICH one
— its index, its heading, or the dimensions it shows. "The demo page" is not a location when the
page holds seven of them, and the next run will pick a different one.

Multiple baselines can coexist — keep all of them, do not pick one and discard the rest. A tier-1
prototype and a tier-2 frame found together are both kept: the prototype is compared for behavior
and state timing, the frame is compared for appearance. There is no first-match-wins rule here
either.

### Recording

For every baseline located, record three fields — later steps consume all three:

- `tier` — 1, 2, or 3, per the classification above.
- `source` — which level it came from (ticket description, ticket comment, parent description,
  parent comment, Confluence page, attachment), and the comment id if it came from a comment.
- `location` — the URL, or the quoted text itself for a tier-3 baseline with no URL.

Every difference reported later must be traceable back to one of these records. A baseline without
a recorded `source` cannot be cited when a difference is presented.

In addition, record one run-level field — `scope decisions` — while the ticket, its parent, and both
comment streams are already fetched: the ticket's Scope and Out-of-scope sections verbatim, plus any
comment that records a scope decision, each carrying the level it came from and the comment id when
it came from a comment. This is deliberately *not* a fourth per-baseline field: it belongs to the
ticket, not to any one baseline, so it is recorded once per run however many baselines were located.
If neither the ticket nor its parent states anything, record `none recorded` — an empty result is a
real result here, and "nobody looked" must stay distinguishable from "looked, found nothing".

Capturing it here costs one extra read of fetches that have already happened. Its consumer is the
deliberate-versus-defect annotation in `references/prototype-comparison.md`, which separates a
difference the ticket already decided about from a defect; without this field that step would have
to re-fetch the ticket and its parent at flow step 6. It lands on the plan file's
`**Scope decisions:**` line (`references/plan-and-report.md`), alongside where the three
per-baseline fields land.

## Stop condition

If, after searching every location in `## Where to look inside Jira`, nothing qualifies as tier 1,
2, or 3, stop. Do not degrade to guessing at expected behavior and do not proceed to comparison-item
derivation. This is the flow's only unconditional stop.

The stop message must carry the real counts from the search just performed — a message that says
"already searched" with no numbers is not acceptable, because the numbers are what let the user
judge whether the search was shallow. Report in zh-TW, since this message is printed to the user:

```
找不到可比對的基準。已查過：{KEY} 的描述與 {N} 則留言、parent {PARENT_KEY} 的描述與 {N} 則留言、
{N} 個 Confluence 連結、{N} 個附件。
請提供其中一種：可操作的原型網址、Figma frame 連結、或直接把預期行為寫給我。
```

Fill `{KEY}`, `{PARENT_KEY}`, and each `{N}` from the search that just ran, not from a template
guess.

If no Jira key was ever resolved (`## Locating the Jira key` found nothing), the template above
does not apply — no Jira search happened, so there is no `{KEY}` and no `{N}` to report. Use this
message instead:

```
找不到可比對的基準所需的 Jira key。已查過：使用者輸入、PR 標題、branch 名稱、commit 訊息，
皆未找到 key。
請提供其中一種：可操作的原型網址、Figma frame 連結、Jira key、或直接把預期行為寫給我。
```
