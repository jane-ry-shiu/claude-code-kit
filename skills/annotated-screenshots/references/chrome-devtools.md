# The chrome-devtools route

Use it when `capture-sheet` exits 3 (no Playwright), or when the live page is already open in a
chrome-devtools lane. Follow the browser-lanes skill for lanes, the shared Chrome and tab hygiene.

`take_screenshot` with `filePath` writes only inside a workspace root. A scratchpad path is rejected
("not within any of the configured workspace roots"). Write into a temporary folder inside the
working directory, move the file out, delete the folder, and confirm `git status --short` is what
it was before.

## A. Capture a built sheet

1. Note `git status --short`.
2. `new_page` with `url: file://<absolute out-base>.html`, `background: true`.
3. `evaluate_script`:
   ```js
   async () => {
     await document.fonts.ready;
     const imgs = [...document.images];
     await Promise.all(imgs.map((i) => (i.complete ? 0 : new Promise((r) => { i.onload = r; i.onerror = r; }))));
     const r = document.querySelector('#sheet').getBoundingClientRect();
     return { broken: imgs.filter((i) => !i.naturalWidth).map((i) => decodeURI(i.src)), width: Math.ceil(r.width), height: Math.ceil(r.height) };
   }
   ```
   `broken` must be empty; otherwise stop and fix the spec.
4. `emulate` with `viewport: "<width>x<height>x2"`.
5. `take_screenshot` with `filePath: <working dir>/.annotated-screenshots-tmp/<name>.png`.
6. `mv` it to the output folder, `rmdir` the temporary folder, compare `git status --short`.
7. Close the tab as browser-lanes Step 4 describes.

## B. Measure and capture a live page

1. Clean the screen: close unrelated tooltips, menus, debug panels.
2. `emulate` with `viewport: "<w>x<h>x2"` so the capture is at device scale 2.
3. `node ~/.claude/skills/annotated-screenshots/scripts/measure-expr.mjs '<input JSON>'` and pass
   the printed function to `evaluate_script`. Keep the result.
4. Capture immediately:
   - region with a uid in `take_snapshot` → `take_screenshot` with that `uid`;
   - otherwise measure with `region: null` and `take_screenshot` without `uid` (the viewport).
   Use a `filePath` inside the working directory as above.
5. Measure again with the same input. If any rect moved more than 2 px, redo steps 3–5.
6. Move the file out. In the spec cell set `pixelRatio: 2` and use the measured `targets` as `marks`.
