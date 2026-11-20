---
name: tutorial-video
description: Use when someone wants a narrated tutorial or demo video of a web app — 教學影片, 操作示範影片, a walkthrough with voice-over and subtitles, onboarding video for colleagues — recorded from the real site. Not for verification evidence or bug-reproduction recordings attached to Jira or a PR; those stay with os-screen-capture.
---

# Tutorial Video

## Overview

Turns a narration script into an mp4 where a pointer performs the steps on the real site while a voice reads each
sentence and the subtitle shows exactly what is being said. Every cue is voiced first; the recording then holds each
subtitle for its audio length, so speech and subtitles never drift. Recording is headless: the owner's screen and mouse
are never touched.

**Subtitle = speech.** A cue is one or two lines (about 22 characters per line). Never put step numbers or headings in
a subtitle; write the sentence the viewer should hear.

## Requirements

Node 20+, Google Chrome, ffmpeg/ffprobe, macOS `say` (default voice Meijia, zh_TW; an Azure neural voice is optional,
see [Azure voice](#azure-voice)), and `PLAYWRIGHT_CORE` set to a
directory whose `node_modules` has `playwright-core` — any project checkout with Playwright installed; find one with
`find ~ -maxdepth 5 -type d -path '*/node_modules/playwright-core' 2>/dev/null | head -1` and use the directory above
`node_modules`. The recorder is the `os-screen-capture` skill next to this one.

## Procedure

1. **Draft the script, get it approved.** Write scenes as plain text: scene title, the sentences to be spoken, and what
   the screen shows during each. Send it to the person who asked for the video and wait for approval. Do not record an
   unapproved script. Length: one sentence takes about 6 s, so a 1-minute video is about 10 sentences.
2. **Write the scene file** (shape and an example: [references/scene-file.md](references/scene-file.md)). One sentence =
   what is said + the action done while it is said. Only read-only actions: no Submit, Save, Delete, Register, Sign
   out, theme or settings changes.
3. **Run it** from this skill's directory:
   `PLAYWRIGHT_CORE=<dir> node scripts/make-video.mjs <scene file> <out dir>` (out dir in scratch, never a tracked
   path). Voiced sentences are kept in `<out dir>/voice/cache`, keyed by voice and text: rerunning into the same out
   dir voices only sentences that changed. Delete that folder to voice everything again (for example after editing a
   custom voice command's script). The run lasts as long as the video plus a few minutes, so start it as a background command and wait for it
   to finish; a foreground command's timeout would kill it halfway. It voices, records, mixes, and writes
   `<name>.mp4`, `cues.json`, `report.json`, `frames/scene-<i>.png`.
4. **Check before handing over** — every item, every time:
   - View every `frames/scene-*.png` (taken 1.5 s after each scene's first subtitle): the right page, pointer on target,
     subtitle readable and inside the frame. To check another moment, take a frame at a cue's `start` from `cues.json`:
     `ffmpeg -ss <start + 1> -i <mp4> -frames:v 1 -update 1 check.png`.
   - `report.json`: `voice` is the voice the video was meant to have; `secretHits` all empty; `duration` and `audioDuration` within 0.3 s; `guardHosts` names every
     host whose writes were blocked (add an API host the site calls with `site.guardHosts`); `guardLog` lists writes the
     page tried and the guard blocked. Leave a blocked request blocked when the frames look right (view tracking,
     analytics). Add its path to `site.allowPost` only when it is a read the page needs and the frames show missing
     data or an error.
   - Fix the scene file and rerun on any failure. Never edit the mp4 by hand.
5. **Hand over:** the mp4's full path, its length, and anything the guard blocked. Open it with
   `open -a "QuickTime Player" <mp4>` (never the default player, which is Apple Music for audio).

## Signing in

`site.cookieSource` copies the site's cookies from the shared Chrome (`http://127.0.0.1:9222`, see browser-lanes)
into a throwaway profile that is deleted when the run ends, also on failure. The agent never types a password. When
the run fails with `no session for <host>: sign in …`, ask the owner to sign in to that site in the shared Chrome,
then rerun. Sites without sign-in leave `cookieSource` out.

## Azure voice

`voice: { engine: 'azure', name: 'zh-TW-HsiaoChenNeural' }` in the scene file voices the whole video with that Azure
neural voice (`rate: '+10%'` speeds it up). Each person uses their own Speech resource (Azure portal → Speech service,
pricing tier Free F0 = 500 000 characters a month; a 2-minute video is about 1 000). Store its key and region once:

```bash
~/claude-code-kit/bin/kit-secret set AZURE_SPEECH_KEY      # KEY 1 from Keys and Endpoint
~/claude-code-kit/bin/kit-secret set AZURE_SPEECH_REGION   # e.g. eastasia
```

Without claude-code-kit, export both names in the shell instead. Never put the key in a scene file or a message.

Any Azure failure (no key, wrong key or region, quota used up, network) stops the run before recording and says why.
It never switches voice by itself: a series keeps one voice. To voice with Meijia anyway, rerun with `--voice mac`.

## What is masked

Only secrets: bearer/JWT tokens, API keys and access tokens (`AKIA…`, `ghp_…`, `sk-…`), values after
token/secret/password/api-key labels, Luhn-valid card numbers, plus `site.secretPatterns`. Names, emails and company
names are shown as the page shows them. Masking reads page text and input values, not images: do not script pages
whose purpose is to display a secret (token or key management) unless the owner confirms the page is safe.

## Writing narration

| Do | Because |
|---|---|
| One idea per sentence, 繁體中文, UI labels exactly as on screen (「Kind」, 「Filter」) | The viewer matches words to the screen |
| Write English the way it is read: `shipping backend API`, not `shipping-backend-api` | Subtitle = speech; the voice reads hyphens and code oddly |
| Keep the action inside the sentence that describes it | The action starts with that sentence's first cue |
| Let long pages scroll smoothly (`page.evaluate` + `scrollTo({ behavior: 'smooth' })`) | A jump hides where the content is |

## Common mistakes

| Symptom | Fix |
|---|---|
| `no Azure Speech AZURE_SPEECH_KEY` / `Azure rejected the key or region` | Store or fix the key and region ([Azure voice](#azure-voice)), or rerun with `--voice mac` |
| `Azure quota or rate limit reached` | Free tier: 20 requests a minute and a monthly allowance. Rerun into the same out dir (voiced sentences are cached); failing again means the month is used up: wait, or rerun with `--voice mac` |
| `do must be an arrow function` | Actions are serialized; write `do: async (page, h) => { … }`, use only `page` and `h` |
| `scene X sentence Y: … Timeout 30000ms exceeded` on a gesture that only points | Give pointing targets `{ timeout: 5000 }` and `.catch(() => null)`; keep the default wait only for clicks the next sentence depends on |
| A 「按鍵：…」 label appears under the subtitle | `h.key` labels keys; press keys with `page.keyboard.press` |
| Pointer lands in the wrong place | `h.glide(x, y)` and `{ x, y }` targets are CSS px of the viewport (default 1600×900), not video pixels; prefer selectors |
| A subtitle runs long or splits oddly | Shorten the sentence or add a comma where the break should go |
| Voice and pointer out of step | The action is in the wrong sentence; move it |
| `guardLog` lists a POST the page needs to show data | It is a read endpoint: add its path pattern to `site.allowPost`, then rerun |
| The page shows an error toast in the video | A needed read was blocked (see above) or the session expired (sign in again) |
