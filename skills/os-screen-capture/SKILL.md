---
name: os-screen-capture
description: Use when a screenshot must show something the operating system draws rather than the web page — the mouse cursor shape (arrow, hand, not-allowed, I-beam), a native `title` tooltip, a native select popup or other OS-drawn UI — for a Jira comment, PR or record, including when a page screenshot came out without the cursor or tooltip the reader needs to see. Also use when the evidence must be a screen recording — a sequence of real clicks and key presses (open, Cancel, click outside, Esc) whose correctness only shows over time, or a video reproducing an issue.
---

# OS Screen Capture

## Overview

A page screenshot (Playwright `page.screenshot`, CDP `Page.captureScreenshot`, chrome-devtools `take_screenshot`, any
headless run) copies the page's own pixels. macOS draws the cursor and native tooltips in separate windows, so they are
only in a **real screen capture of a visible browser under a real mouse hover**. A drawn-on cursor or a caption saying
"cursor: default" is not evidence of what the user sees.

## Route the screenshot

| The reader must see | Path |
|---|---|
| Page content, page-drawn tooltips/popovers (reka, tippy, `role="tooltip"`) | Normal page screenshot (capture-page-screenshots, Playwright) |
| Cursor shape, native `title` tooltip, native `<select>` popup, other OS-drawn UI | **This skill** |
| A sequence over time — where the pointer went, what was clicked or pressed, what the page did next; reproducing an issue | **This skill, recording** (`h.recStart` … `h.recStop`) |
| Only the cursor *value*, no image | `getComputedStyle(elementFromPoint(x, y)).cursor` — but `auto` over text is the I-beam; only `default` is the arrow |

## Before the run

1. **Ask first.** The run takes over the user's mouse and screen. Say how long (10–20 min), that the mouse moves by
   itself and must not be touched, and to move private windows off the built-in display. Never start unasked; never run
   a full-screen capture as a probe.
2. **Permissions.** The host app (Terminal, the Claude desktop host…) needs **Accessibility** to post mouse moves:
   `swift -e 'import ApplicationServices; print(AXIsProcessTrusted())'`. It does **not** need Screen Recording: Chrome is
   started with `open -na` and captures itself via `getDisplayMedia` under Chrome's own permission. If the check prints
   `false`, the user must grant it and restart the host — ask, do not work around it.

## Run

1. `bash scripts/build-os-tools.sh` — compiles the Swift helpers (`warp`, `click`, `activate`, `allwin`, `axpress`,
   `axdump`, `screens`) into `~/.cache/os-screen-capture/bin`. Once per machine; rerun if the binaries are gone.
2. `bash scripts/launch-chrome.sh <scratch-profile-dir> 9333` — visible Chrome on the built-in display.
3. Start the harness in the background (env vars documented at the top of `scripts/harness.mjs`):
   `PLAYWRIGHT_CORE=<dir> OUT=<record dir> node scripts/harness.mjs`
4. Each step: `curl --data-binary @step.js http://127.0.0.1:9484/`, where `step.js` is
   `async (page, context, h) => { /* navigate, open the dialog */ return h.csnap('after-row', hoverSel, [cropSel]); }`.
   `csnap` hovers with the real cursor, waits, and saves `shots/<name>.png` plus `<name>.json` (pointer position, CSS
   cursor value, whether a native tooltip window appeared).
5. Before/after in one server: `git checkout <old-sha> -- <files>`, shoot, `git checkout HEAD -- <files>`, confirm
   `git status` is clean.
6. Clean up: kill the CDP listener's pid, the harness and the dev server; tell the user the screen is free.

## Record

Recording, real clicks and key presses are installed on `h` by `scripts/record.mjs`:

```js
async (page, context, h) => {
  await h.recStart('esc-discard');            // stream lives in its own recorder tab: page reloads do not stop it
  h.mark('1. open the dialog');               // caption shown from now for 2.5 s
  await h.click('.open-btn', { fx: 0.7 });    // glide the real cursor there, posted CGEvent press/release
  await h.click({ x: 40, y: 600 });           // a viewport point — e.g. outside a modal
  await h.key('Escape');                      // Playwright key press, labelled on the video
  return h.recStop();                         // -> videos/esc-discard.mp4 + .json (event times)
}
```

- `click` targets a CSS selector, a Playwright locator (`page.getByText('Viewer')`) or a viewport point `{ x, y }`; it
  takes `count: 2` (double-click) and `right: true`. `recStart` takes `crop: 'viewport' | 'window' | 'screen'`.
- `recStop` writes an mp4 cropped to the browser, with a red ring at each click and a label per key and caption, and
  deletes the raw full-display webm (it holds every window on the screen); `recStop({ keepRaw: true })` keeps it.

## Traps

| Symptom | Cause → fix |
|---|---|
| Native tooltip never appears | Chrome's "sharing your screen" bar took key-window status → `h.hideBar()` (csnap does it); Chrome not frontmost → `h.front()` |
| No cursor / no tooltip despite hover | CDP or Playwright mouse moves are synthetic → only posted CGEvents (`warp x y post`) count |
| Share picker shows, stream never starts | An external monitor stops the auto-select flag → csnap answers the picker over AX; labels differ by OS language, find them with `axdump <pid> <title>` and set `PICKER_*` |
| `getDisplayMedia` fails on a deployed site | Its policy blocks display capture → `const gp = await h.grabFromWindow('http://localhost:<port>/')`, then `csnap(..., { grabPage: gp })` |
| Cursor covers the text being shown | Hover the lower-right of the target (`fx` 0.6–0.9) |
| `Target page, context or browser has been closed` on the first step | Another session's browser listens on the same CDP port → pick free ports (`CDP=9343 EVAL_PORT=9494`, launch-chrome with the same CDP port) |
| Wrong Chrome pid | `pgrep` matches helpers → take the pid from the CDP port's listener (`lsof -tiTCP:9333 -sTCP:LISTEN`) |

## Output

A recording writes `videos/<name>.mp4` and `videos/<name>.json` (`events`: `t` in seconds from the video start, `click`
with global points `gx`/`gy`, `key`, `mark`; `box` = crop in screen points; `sc` = device px per point).

Each `csnap` writes `shots/<name>.png` (device pixels of the captured display, cropped to the union of the crop
selectors, any page tooltip and any native tooltip window, plus 16 px) and `shots/<name>.json`: `pointer` and
`cursorBox` in CSS px of the crop, `cssCursor`, `nativeTooltip`, `bar`. `cursorBox` is the drawn cursor's extent for
`default`, `not-allowed`, `pointer` and `text`; it is `null` for `auto`, which the OS draws as the I-beam over text and the
arrow elsewhere — look at the image.
