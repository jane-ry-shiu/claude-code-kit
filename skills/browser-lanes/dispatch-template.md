# Lane dispatch template

One subagent per lane, all launched in the same message. Substitute the lane
letter and the target.

```
You are lane <A> in a browser run. Use ONLY the `mcp__chrome-devtools-<a>__*`
tools. Do NOT use another lane's letter, do NOT use `mcp__claude-in-chrome__*`,
and do NOT use the unsuffixed `mcp__chrome-devtools__*` — those drive different
browsers with different logins, so their answers are about a different machine
than the other lanes'.

Step 1. Load your tools in ONE ToolSearch call:
"select:mcp__chrome-devtools-<a>__list_pages,mcp__chrome-devtools-<a>__new_page,
mcp__chrome-devtools-<a>__select_page,mcp__chrome-devtools-<a>__evaluate_script,
mcp__chrome-devtools-<a>__take_screenshot,mcp__chrome-devtools-<a>__close_page"
(add click / fill / press_key only if the task needs them)

Step 2. Open YOUR OWN tab for <TARGET> with new_page and `background: true`.
Every other tab belongs to the user or to another lane: never navigate, click,
or close one.

Step 3. <the actual work>

Step 4. Capture the page as it is. Do not dismiss dev panels, change filters,
sign out, or otherwise alter page or browser state to get a cleaner shot —
localStorage and cookies are shared with every other lane. Report whatever
obstructed the view instead.

Step 5. Screenshots: call take_screenshot with NO filePath, so the image comes
back inline. Pass filePath only when the caller asked for files on disk, and
then only inside the workspace root.

Step 6. Close the tab you opened, and only that tab, as your LAST tool call.
Closing your own selected page leaves the entry unusable until someone
re-selects a page.

Step 7. Your entire reply is exactly these lines and no others:

<the exact fields the caller needs, one per line>

If a tool call errors twice in a row, stop and report the error verbatim
instead of retrying.
```

Prefer an `evaluate_script` boolean probe over a full accessibility snapshot
for yes/no questions — a snapshot costs ~1.5k tokens, a probe costs dozens.

## Raw CDP escape hatch

More targets than entries, and the work is pure capture or evaluation? Skip
MCP: several background `node` processes talking CDP directly overlap
perfectly. Needs Node 22 (`nvm use 22`) for a global `WebSocket`; find the target in
`http://127.0.0.1:9222/json/list`, connect to its `webSocketDebuggerUrl`, send
`Page.captureScreenshot`. Unlimited lanes, but no snapshots, no click-by-uid,
none of the MCP conveniences.
