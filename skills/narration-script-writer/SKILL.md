---
name: narration-script-writer
description: Use when someone needs the narration script for a narrated video of a web app — 影片腳本, 旁白稿, 教學影片腳本, the script for a demo, walkthrough or feature video — or wants an existing video script revised, before it is recorded with narrated-web-video-maker.
---

# Narration Script Writer

## Overview

Writes the script that `narrated-web-video-maker` records: scenes, and in each scene numbered sentences, each with
the screen action done while it is spoken. The viewer hears every sentence once while looking at the screen, and the
subtitle shows every word. So each sentence is true of the real page, says one thing in everyday words, and fits one
subtitle.

The requester approves twice: the outline, then the full script after a reviewer has read it. Only an approved
script goes to the video maker.

## Procedure

1. **Intake.** From the request, collect what is given and ask, one question at a time, only for what is missing:
   - goal: what the viewer can do or understands after watching;
   - narrator: who is talking (e.g. the engineer who built the tool);
   - audience: who watches and what they already know;
   - the points to cover (requesters usually give a topic plus a few points);
   - the site(s) on screen, and whether they need sign-in.

   An existing script is input material here, like the points: the whole procedure still runs, because pages and
   structure may have changed since it was written.
2. **Research.** Make every point true and showable:
   - read the sources behind each point (repository files, docs, configuration);
   - open every page the video will show in the shared Chrome (see browser-lanes), read-only; note exact labels and
     what is on screen;
   - decide how each point is shown:

   | The point lives in | On screen |
   |---|---|
   | a web page | that page |
   | a desktop app, IDE, terminal or chat session (not recordable) | the nearest web page carrying it, e.g. the file on GitHub, while the narration says what the tool does |
   | a step that submits, saves or deletes | the form, stopped before the click; the sentence says the viewer would press it now and this is only a demonstration |
3. **Outline**, saved as `~/narrated-videos/<video-name>/outline.md` (`<video-name>` lower-case-with-dashes; it
   becomes the mp4's name). Per scene: what the viewer learns, the page on screen, estimated sentences. End with the
   total length at about 6 s per sentence. Send it and wait for approval; write no sentence before it.
4. **Script**, saved as `~/narrated-videos/<video-name>/script.md`, following
   [references/writing-rules.md](references/writing-rules.md):

   ```markdown
   ## 2. Catalog：找到一個服務
   4. Catalog 是 Backstage 的首頁。（指標指向頁面標題）
   5. 登記在 Backstage 上的服務、API 和基礎設施，都列在這份清單裡。（指標移到清單）
   ```

   Scene headings are for the reader and are not spoken. Then run, from this skill's directory,
   `node scripts/check-script.mjs ~/narrated-videos/<video-name>/script.md` and fix every line it prints until it
   prints `ok`. A flagged word that is right as written — an acronym said letter by letter (HTTPS) or a name shown in
   capitals on screen — goes on one unnumbered line at the top, `keep: HTTPS, ACMECLOUD`; list those words for the
   requester in step 6.
5. **Reviewer.** Dispatch a fresh read-only subagent with [references/reviewer-prompt.md](references/reviewer-prompt.md),
   its four placeholders filled: `{audience}`, `{narrator}`, `{rules_path}` (the absolute path of
   references/writing-rules.md) and `{script}` (the script text). Nothing else — never your notes or reasoning. Apply or reject
   each item it returns; run the checker again.
6. **Requester review.** Send the script and the reviewer's items, one line each:
   `句 N：問題 → 改法（採用／不採用：原因）`. Apply their edits, run the checker again, and repeat until they approve.
7. **Hand-off.** The approved `script.md` is the input of `narrated-web-video-maker`, which writes the scene file
   from it.

## Common mistakes

| Mistake | Fix |
|---|---|
| Writing sentences before the outline is approved | A wrong structure means rewriting every sentence; get the outline approved first |
| A label, file name or behaviour written from memory | Check it on the page or in the source during research |
| A scene on a screen the recorder cannot show | Use the nearest web page (research table) |
| Narration that clicks Save, Submit or Delete | Stop before the click; say it is only a demonstration |
| Giving the reviewer your notes | It then reads your intent instead of the sentence; send only the four placeholders |
| Skipping the checker after edits | Every edit can push a sentence past one subtitle; rerun it |
