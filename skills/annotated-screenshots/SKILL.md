---
name: annotated-screenshots
description: "Use when a screenshot goes into a Jira ticket, a PR description or a Confluence page together with something the reader must take from it — steps to follow, a verification record, a change to notice, or any point the text makes about the image — and when the user asks for annotated, numbered or stitched images. Not for a screenshot with nothing to point out, and not for conversational replies."
---

# Annotated Screenshots

## Overview

The reader of a ticket, PR or manual page was not there when the screenshot was taken. Every number
and colour the text mentions must be findable in the image, and the image must still read when
forwarded alone. This skill turns screenshots into a **sheet**: labelled cells, boxes with small
numbered badges, colours with fixed meanings, a notes list and a legend drawn on the image — plus
companion text whose lines match the image exactly.

The live page is only measured. All drawing happens in the sheet.

## When to use

| Situation | Use |
|---|---|
| Jira verification record with screenshots | yes — grid |
| PR description showing where something changed | yes — pair |
| Confluence manual telling the reader what to click | yes — steps |
| Any screenshot the accompanying text points at | yes |
| The user asks for annotated, numbered or stitched images | yes |
| A screenshot with nothing to point out ("how the page looks today") | no — attach it as is |
| A conversational reply to the user | no |

Owned elsewhere: capturing pages by route (capture-page-screenshots), deciding pass or fail (the
verification flow), uploading (jira, github-pr, confluence).

## Procedure

`SKILL_DIR` is `~/.claude/skills/annotated-screenshots`. Outputs go to the verification run's folder
when there is one, otherwise the session scratchpad — never a tracked path.

1. **Write the notes first** — one line per point the reader must take from the image. Nothing to
   write means nothing to annotate: attach the plain screenshot and stop.
2. **Pick the layout:** grid (rows = items, columns = conditions, frame = verdict), pair (before |
   after), steps (one screenshot, numbered in operation order). Worked specs and every field:
   `references/layouts.md`.
3. **Capture clean.** Close unrelated tooltips, menus and debug panels first. If something cannot be
   closed or the screenshot cannot be retaken, say so in the notes. Never change page state to get a
   cleaner picture.
   - Live page: measure, capture, measure again, as one step. Playwright:
     `page.evaluate(measureExpression(input))` from `SKILL_DIR/scripts/lib/measure.mjs`, capture the
     region at device scale 2, set `pixelRatio: 2`. chrome-devtools: `references/chrome-devtools.md`
     part B. If `maxRectDrift` (`scripts/lib/geometry.mjs`) between the two measurements exceeds 2,
     redo.
   - Existing screenshot only: view it, read the rects off it in its own pixels (`pixelRatio: 1`), and
     expect one fix-up pass after viewing the result.
4. **Write the sheet spec** (JSON) next to the screenshots.
5. **Build:** `node SKILL_DIR/scripts/build-sheet.mjs <spec.json> <out-base>` → `<out-base>.html` and
   `<out-base>.md`. Exit 1 lists every spec problem: fix them all; never drop a mark or a cell to
   silence one.
6. **Capture:** `PLAYWRIGHT_FROM=<dir with node_modules/playwright> node
   SKILL_DIR/scripts/capture-sheet.mjs <out-base>.html <out-base>.png`. Exit 3: no Playwright —
   `references/chrome-devtools.md` part A. Exit 4: an image did not load.
7. **View every PNG** with the Read tool before handing it over: boxes on target, no badge on
   something the reader must see (pin it with `badge`, rebuild), legend matching what is drawn. An
   image you have not viewed is not ready.
8. **Hand over** the PNG and the lines of `<out-base>.md` to the destination skill. Keep the note
   lines word for word; the destination skill only formats them.

## Visual rules

Colour means one thing everywhere. The scripts enforce the table.

| Colour | Meaning | Legend text |
|---|---|---|
| green | as expected / after the change | 符合預期 |
| red | not as expected / the problem before the change | 不符預期 |
| blue | look here (neutral) | 要看的地方 |
| orange | operation step | 操作步驟 |
| grey dashed | condition unreachable / not applicable | 這個條件到不了 |

- Another meaning takes another colour through `meanings`; a table colour never takes another
  meaning. Reword a meaning for one image with `legend`.
- Verdict cells get a ✓ / ✗ strip under the screenshot, so colour is never the only cue.
- Numbers: Jira uses the checklist's own numbers (#10) and never renumbers; a PR numbers each changed
  spot and repeats the number on both sides; Confluence numbers the operation order.
- Badges are small (18 px) and sit outside their box; boxes sit 3 px outside the element; nothing is
  drawn inside a box.
- No sentences on the screenshot. Notes go in the list under the image and in the companion text.
- Every sheet has a title (what it shows) and a subtitle (how to read it). All text on the image —
  title, subtitle, headings, notes, legend — is 繁體中文, with product names exactly as the English UI
  shows them and ticket keys in full.
- Device scale 2. Cell width: grid 520, pair 700, steps 900.
- File names: `<ticket>-<purpose>-<seq>-<slug>.png`; the `.md` shares the base name.

## Never hand over a misleading image

| Situation | Do |
|---|---|
| A screenshot is missing | Capture it. Declare `unreachable` with a reason only when the condition cannot exist |
| The spec has errors | Fix every listed problem |
| A rect drifted after capture | Redo measure and capture |
| No Playwright | `references/chrome-devtools.md`; afterwards `git status --short` must be unchanged |
| A badge still covers something | Pin `badge`, rebuild, view again |

## Red flags

| Thought | Reality |
|---|---|
| "The screenshot speaks for itself" | If the text points at it, the image must show where |
| "I'll compose the sheet myself (Pillow, canvas, by hand)" | build-sheet enforces colours, legend, badges and language; a hand-made sheet skips them |
| "The note reads better on the image" | Sentences cover content; they go in the list |
| "Renumber the items 1–3, it's tidier" | Jira readers match the checklist's numbers |
| "Red to say 'look here'" | Red means a problem; blue means look here |
| "Draw the boxes into the live page, it's faster" | Measure only; the sheet draws |
| "The output is surely fine" | View every PNG before handing it over |
